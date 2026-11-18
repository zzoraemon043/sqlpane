import type { QueryResult } from '../results/queryResult'
import { exportKindOf, plainValue } from './exportValues'
import { maximumSheetRows, writeWorkbook, type WorkbookCell } from './xlsx/writeWorkbook'

export function exportExcel(result: QueryResult, rows: ArrayLike<number>): { bytes: Uint8Array; truncated: boolean } {
  const kinds = result.columns.map((_, columnIndex) => exportKindOf(result, columnIndex))
  function* sheetRows(): Generator<WorkbookCell[]> {
    for (let position = 0; position < rows.length; position++) {
      yield result.columns.map((_, columnIndex) => {
        const kind = kinds[columnIndex]
        const value = plainValue(result, rows[position], columnIndex, kind)
        if (typeof value === 'bigint') return Number.isSafeInteger(Number(value)) ? Number(value) : value.toString()
        if (kind === 'decimal' && typeof value === 'string') {
          const digits = value.replace(/[-.]/g, '').replace(/^0+|0+$/g, '')
          return digits.length <= 15 ? Number(value) : value
        }
        return value
      })
    }
  }
  const bytes = writeWorkbook('Result', result.columns.map((column) => column.name), sheetRows())
  return { bytes, truncated: rows.length > maximumSheetRows - 1 }
}
