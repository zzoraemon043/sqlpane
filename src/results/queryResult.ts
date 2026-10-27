import type { Table, Vector } from 'apache-arrow'
import { formatterFor, sortKeyFor, type CellFormatter, type SortKey } from './cellFormat'
import { isMonthDayNano, monthDayNanoReader } from './intervalValues'
import { isTimestampVector, timestampReader } from './timestampValues'

export interface ResultColumn {
  name: string
  type: string
  format: CellFormatter
  sortKey: (value: unknown) => SortKey | null
  numeric: boolean
}

export interface QueryResult {
  id: string
  sql: string
  table: Table
  readers: ((rowIndex: number) => unknown)[]
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
  const readers = table.schema.fields.map((_, index) => readerFor(table.getChildAt(index)!))
  return { id: crypto.randomUUID(), sql, table, readers, columns, rowCount: table.numRows, elapsedMs }
}

function readerFor(vector: Vector): (rowIndex: number) => unknown {
  if (isMonthDayNano(vector)) return monthDayNanoReader(vector)
  if (isTimestampVector(vector)) return timestampReader(vector)
  return (rowIndex) => vector.get(rowIndex)
}

export function cellValue(result: QueryResult, rowIndex: number, columnIndex: number): unknown {
  return result.readers[columnIndex]?.(rowIndex)
}

export function cellText(result: QueryResult, rowIndex: number, columnIndex: number): string | null {
  return result.columns[columnIndex].format(cellValue(result, rowIndex, columnIndex))
}
