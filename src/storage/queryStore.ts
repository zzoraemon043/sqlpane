export interface HistoryEntry {
  id: string
  sql: string
  ranAt: number
  durationMs: number
  rowCount?: number
  error?: string
}

export interface SavedQuery {
  id: string
  name: string
  sql: string
  savedAt: number
}

export interface QueryStore {
  readonly persistent: boolean
  addHistory(entry: HistoryEntry): Promise<void>
  listHistory(limit: number): Promise<HistoryEntry[]>
  clearHistory(): Promise<void>
  saveQuery(query: SavedQuery): Promise<void>
  listSaved(): Promise<SavedQuery[]>
  deleteSaved(id: string): Promise<void>
}

export const historyLimit = 200

export function createMemoryQueryStore(): QueryStore {
  let history: HistoryEntry[] = []
  const saved = new Map<string, SavedQuery>()
  return {
    persistent: false,
    async addHistory(entry) {
      history = [entry, ...history].slice(0, historyLimit)
    },
    async listHistory(limit) {
      return history.slice(0, limit)
    },
    async clearHistory() {
      history = []
    },
    async saveQuery(query) {
      saved.set(query.id, query)
    },
    async listSaved() {
      return [...saved.values()].sort((left, right) => left.name.localeCompare(right.name))
    },
    async deleteSaved(id) {
      saved.delete(id)
    },
  }
}
