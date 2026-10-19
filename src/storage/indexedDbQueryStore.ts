import { createMemoryQueryStore, historyLimit, type HistoryEntry, type QueryStore, type SavedQuery } from './queryStore'

const databaseName = 'sqlpane'
const databaseVersion = 1
const historyStore = 'history'
const savedStore = 'saved'

function promised<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export function openQueryDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(databaseName, databaseVersion)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(historyStore)) {
        database.createObjectStore(historyStore, { keyPath: 'id' }).createIndex('ranAt', 'ranAt')
      }
      if (!database.objectStoreNames.contains(savedStore)) database.createObjectStore(savedStore, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('database upgrade blocked'))
  })
}

export function createIndexedDbQueryStore(database: IDBDatabase): QueryStore {
  const write = async (storeName: string, action: (store: IDBObjectStore) => void) => {
    const transaction = database.transaction(storeName, 'readwrite')
    action(transaction.objectStore(storeName))
    await completed(transaction)
  }
  const readAll = <T>(storeName: string) => promised(database.transaction(storeName).objectStore(storeName).getAll() as IDBRequest<T[]>)

  return {
    persistent: true,
    async addHistory(entry) {
      await write(historyStore, (store) => store.put(entry))
      await trimHistory(database)
    },
    async listHistory(limit) {
      const entries = await readAll<HistoryEntry>(historyStore)
      return entries.sort((left, right) => right.ranAt - left.ranAt).slice(0, limit)
    },
    async clearHistory() {
      await write(historyStore, (store) => store.clear())
    },
    async saveQuery(query) {
      await write(savedStore, (store) => store.put(query))
    },
    async listSaved() {
      const saved = await readAll<SavedQuery>(savedStore)
      return saved.sort((left, right) => left.name.localeCompare(right.name))
    },
    async deleteSaved(id) {
      await write(savedStore, (store) => store.delete(id))
    },
  }
}

async function trimHistory(database: IDBDatabase) {
  const transaction = database.transaction(historyStore, 'readwrite')
  const index = transaction.objectStore(historyStore).index('ranAt')
  const total = await promised(index.count())
  let excess = total - historyLimit
  if (excess > 0) {
    const cursorRequest = index.openCursor()
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result
      if (!cursor || excess <= 0) return
      cursor.delete()
      excess--
      cursor.continue()
    }
  }
  await completed(transaction)
}

export function withFallback(primary: QueryStore, onFailure: (error: unknown) => void): QueryStore {
  const memory = createMemoryQueryStore()
  let failed = false
  const guarded = <A extends unknown[], R>(call: (store: QueryStore, ...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      if (!failed) {
        try {
          return await call(primary, ...args)
        } catch (error) {
          failed = true
          onFailure(error)
        }
      }
      return call(memory, ...args)
    }
  return {
    get persistent() {
      return !failed
    },
    addHistory: guarded((store, entry: HistoryEntry) => store.addHistory(entry)),
    listHistory: guarded((store, limit: number) => store.listHistory(limit)),
    clearHistory: guarded((store) => store.clearHistory()),
    saveQuery: guarded((store, query: SavedQuery) => store.saveQuery(query)),
    listSaved: guarded((store) => store.listSaved()),
    deleteSaved: guarded((store, id: string) => store.deleteSaved(id)),
  }
}

export async function openQueryStore(factory: IDBFactory | undefined, onFailure: (error: unknown) => void): Promise<QueryStore> {
  if (!factory) {
    onFailure(new Error('IndexedDB is not available'))
    return createMemoryQueryStore()
  }
  try {
    return withFallback(createIndexedDbQueryStore(await openQueryDatabase(factory)), onFailure)
  } catch (error) {
    onFailure(error)
    return createMemoryQueryStore()
  }
}
