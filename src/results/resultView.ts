import { compareSortKeys } from './cellFormat'
import { cellText, cellValue, type QueryResult } from './queryResult'

export type SortDirection = 'ascending' | 'descending'

export interface SortState {
  columnIndex: number
  direction: SortDirection
}

export type ColumnFilters = Record<number, string>

export function nextSort(current: SortState | undefined, columnIndex: number): SortState | undefined {
  if (!current || current.columnIndex !== columnIndex) return { columnIndex, direction: 'ascending' }
  if (current.direction === 'ascending') return { columnIndex, direction: 'descending' }
  return undefined
}

export function filteredRowIndexes(result: QueryResult, filters: ColumnFilters): Int32Array {
  const active = Object.entries(filters)
    .map(([columnIndex, text]) => ({ columnIndex: Number(columnIndex), needle: text.trim().toLowerCase() }))
    .filter((filter) => filter.needle !== '')
  const indexes = new Int32Array(result.rowCount)
  let count = 0
  for (let rowIndex = 0; rowIndex < result.rowCount; rowIndex++) {
    if (active.every((filter) => matches(cellText(result, rowIndex, filter.columnIndex), filter.needle))) indexes[count++] = rowIndex
  }
  return indexes.slice(0, count)
}

function matches(text: string | null, needle: string): boolean {
  if (needle === 'null') return text === null
  return text !== null && text.toLowerCase().includes(needle)
}

export function sortRowIndexes(result: QueryResult, rows: Int32Array, sort: SortState | undefined): Int32Array {
  if (!sort) return rows
  const column = result.columns[sort.columnIndex]
  const keys = Array.from(rows, (rowIndex) => column.sortKey(cellValue(result, rowIndex, sort.columnIndex)))
  const sign = sort.direction === 'ascending' ? 1 : -1
  const order = Array.from(rows.keys())
  order.sort((left, right) => {
    const leftKey = keys[left]
    const rightKey = keys[right]
    if (leftKey === null || rightKey === null) return compareSortKeys(leftKey, rightKey) || left - right
    return sign * compareSortKeys(leftKey, rightKey) || left - right
  })
  return Int32Array.from(order, (position) => rows[position])
}

export function visibleRowIndexes(result: QueryResult, filters: ColumnFilters, sort: SortState | undefined): Int32Array {
  return sortRowIndexes(result, filteredRowIndexes(result, filters), sort)
}
