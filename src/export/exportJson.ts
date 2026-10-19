import type { QueryResult } from '../results/queryResult'
import { exportKindOf, plainValue } from './exportValues'
import { formatTimestamp } from '../loaders/columnTypes'

export function exportJson(result: QueryResult, rows: ArrayLike<number>): string {
  const kinds = result.columns.map((_, columnIndex) => exportKindOf(result, columnIndex))
  const records: Record<string, unknown>[] = []
  for (let position = 0; position < rows.length; position++) {
    const record: Record<string, unknown> = {}
    result.columns.forEach((column, columnIndex) => {
      record[column.name] = jsonValue(plainValue(result, rows[position], columnIndex, kinds[columnIndex]), kinds[columnIndex])
    })
    records.push(record)
  }
  return `${JSON.stringify(records, null, 2)}\n`
}

function jsonValue(value: ReturnType<typeof plainValue>, kind: ReturnType<typeof exportKindOf>): unknown {
  if (value === null) return null
  if (typeof value === 'bigint') return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString()
  if (value instanceof Date) return kind === 'date' ? value.toISOString().slice(0, 10) : formatTimestamp(value).replace(/\.000$/, '')
  return value
}
