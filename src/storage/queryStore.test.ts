import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it, vi } from 'vitest'
import { openQueryStore, withFallback } from './indexedDbQueryStore'
import { createMemoryQueryStore, historyLimit, type QueryStore } from './queryStore'

const entry = (index: number) => ({ id: `h${index}`, sql: `SELECT ${index}`, ranAt: index, durationMs: 1 })

async function exerciseStore(store: QueryStore) {
  await store.addHistory(entry(1))
  await store.addHistory(entry(2))
  expect((await store.listHistory(10)).map((item) => item.id)).toEqual(['h2', 'h1'])
  await store.saveQuery({ id: 's1', name: 'beta', sql: 'SELECT 2', savedAt: 1 })
  await store.saveQuery({ id: 's2', name: 'alpha', sql: 'SELECT 1', savedAt: 2 })
  expect((await store.listSaved()).map((item) => item.name)).toEqual(['alpha', 'beta'])
  await store.deleteSaved('s1')
  expect((await store.listSaved()).map((item) => item.id)).toEqual(['s2'])
  await store.clearHistory()
  expect(await store.listHistory(10)).toEqual([])
}

describe('query store', () => {
  it('keeps history and saved queries in memory', async () => {
    await exerciseStore(createMemoryQueryStore())
  })

  it('keeps history and saved queries in IndexedDB across reopen', async () => {
    const factory = new IDBFactory()
    const failure = vi.fn()
    const store = await openQueryStore(factory, failure)
    expect(store.persistent).toBe(true)
    await exerciseStore(store)
    await store.saveQuery({ id: 'keep', name: 'kept', sql: 'SELECT 3', savedAt: 3 })
    const reopened = await openQueryStore(factory, failure)
    expect((await reopened.listSaved()).map((item) => item.id)).toEqual(['s2', 'keep'])
    expect(failure).not.toHaveBeenCalled()
  })

  it('trims history to the limit', async () => {
    const store = await openQueryStore(new IDBFactory(), () => undefined)
    for (let index = 0; index < historyLimit + 5; index++) await store.addHistory(entry(index))
    const history = await store.listHistory(1000)
    expect(history).toHaveLength(historyLimit)
    expect(history.at(-1)?.id).toBe('h5')
  })

  it('falls back to memory when IndexedDB is missing or cannot open', async () => {
    const failure = vi.fn()
    const missing = await openQueryStore(undefined, failure)
    expect(missing.persistent).toBe(false)
    const broken = { open: () => { throw new Error('denied') } } as unknown as globalThis.IDBFactory
    const unopened = await openQueryStore(broken, failure)
    await exerciseStore(unopened)
    expect(failure).toHaveBeenCalledTimes(2)
  })

  it('switches to memory when a write fails later', async () => {
    const failing: QueryStore = {
      ...createMemoryQueryStore(),
      persistent: true,
      addHistory: async () => {
        throw new Error('quota exceeded')
      },
    }
    const failure = vi.fn()
    const store = withFallback(failing, failure)
    await store.addHistory(entry(7))
    expect(store.persistent).toBe(false)
    expect((await store.listHistory(5)).map((item) => item.id)).toEqual(['h7'])
    expect(failure).toHaveBeenCalledOnce()
  })
})
