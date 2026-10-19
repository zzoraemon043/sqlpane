import type { Table } from 'apache-arrow'
import { formatterFor, sortKeyFor, type CellFormatter, type SortKey } from './cellFormat'

export interface ResultColumn {
  name: string
  type: string
  format: CellFormatter
  sortKey: (value: unknown) => SortKey | null
  numeric: boolean
}

export interface QueryResult {
  sql: string
  table: Table
  columns: ResultColumn[]
  rowCount: number
  elapsedMs: number
}

const numericTypeIds = new Set([2, 3, 7])

export function describeResult(sql: string, table: Table, elapsedMs: number): QueryResult {
  const columns = table.schema.fields.map((field) => ({
    name: field.name,
    type: String(field.type),
    format: formatterFor(field),
    sortKey: sortKeyFor(field),
    numeric: numericTypeIds.has(field.typeId),
  }))
  return { sql, table, columns, rowCount: table.numRows, elapsedMs }
}

export function cellValue(result: QueryResult, rowIndex: number, columnIndex: number): unknown {
  return result.table.getChildAt(columnIndex)?.get(rowIndex)
}

export function cellText(result: QueryResult, rowIndex: number, columnIndex: number): string | null {
  return result.columns[columnIndex].format(cellValue(result, rowIndex, columnIndex))
}
