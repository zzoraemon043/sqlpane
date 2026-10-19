import type { QueryResult } from '../results/queryResult'
import { exportKindOf, plainValue } from './exportValues'
import { maximumSheetRows, writeWorkbook, type WorkbookCell } from './xlsx/writeWorkbook'

export function exportExcel(result: QueryResult, rows: ArrayLike<number>): { bytes: Uint8Array; truncated: boolean } {
  const kinds = result.columns.map((_, columnIndex) => exportKindOf(result, columnIndex))
  function* sheetRows(): Generator<WorkbookCell[]> {
    for (let position = 0; position < rows.length; position++) {
      yield result.columns.map((_, columnIndex) => {
        const value = plainValue(result, rows[position], columnIndex, kinds[columnIndex])
        if (typeof value === 'bigint') return Number.isSafeInteger(Number(value)) ? Number(value) : value.toString()
        return value
      })
    }
  }
  const bytes = writeWorkbook('Result', result.columns.map((column) => column.name), sheetRows())
  return { bytes, truncated: rows.length > maximumSheetRows - 1 }
}
