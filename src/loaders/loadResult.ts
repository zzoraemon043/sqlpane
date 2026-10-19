export interface LoadedTable {
  name: string
  rowCount: number
}

export interface LoadResult {
  tables: LoadedTable[]
  warnings: string[]
}
