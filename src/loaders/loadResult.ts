import type { ImportReport } from '../importer/importReport'
import type { Notice } from './notice'

export interface LoadedTable {
  name: string
  rowCount: number
}

export interface LoadResult {
  tables: LoadedTable[]
  warnings: Notice[]
  importReport?: ImportReport
}
