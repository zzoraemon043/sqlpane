import { cellText, cellValue, type QueryResult } from '../results/queryResult'
import { formatTimestampValue, TimestampValue } from '../results/timestampValues'
import { exportKindOf, plainValue, type ExportKind } from './exportValues'
import { formatTimestamp } from '../loaders/columnTypes'

export function exportJson(result: QueryResult, rows: ArrayLike<number>): string {
  const kinds = result.columns.map((_, columnIndex) => exportKindOf(result, columnIndex))
  const keys = uniqueKeys(result.columns.map((column) => column.name))
  const records: Record<string, unknown>[] = []
  for (let position = 0; position < rows.length; position++) {
    const record: Record<string, unknown> = {}
    keys.forEach((key, columnIndex) => {
      record[key] = exactJsonValue(result, rows[position], columnIndex, kinds[columnIndex])
    })
    records.push(record)
  }
  return `${JSON.stringify(records, null, 2)}\n`
}

export function uniqueKeys(names: readonly string[]): string[] {
  const taken = new Set(names)
  const seen = new Set<string>()
  return names.map((name) => {
    if (!seen.has(name)) {
      seen.add(name)
      return name
    }
    let suffix = 2
    while (taken.has(`${name}_${suffix}`)) suffix++
    const key = `${name}_${suffix}`
    taken.add(key)
    seen.add(key)
    return key
  })
}

function exactJsonValue(result: QueryResult, rowIndex: number, columnIndex: number, kind: ExportKind): unknown {
  const raw = cellValue(result, rowIndex, columnIndex)
  if (raw instanceof TimestampValue) return formatTimestampValue(raw)
  if (kind === 'decimal' && raw !== null && raw !== undefined) return decimalJson(cellText(result, rowIndex, columnIndex) ?? '')
  return jsonValue(plainValue(result, rowIndex, columnIndex, kind), kind)
}

const maxExactDigits = 15

function decimalJson(text: string): number | string {
  const digits = text.replace(/^-/, '').replace('.', '').replace(/^0+/, '')
  if (digits.length <= maxExactDigits) return Number(text)
  return /^-?\d+$/.test(text) ? jsonValue(BigInt(text), 'bigint') as number | string : text
}

function jsonValue(value: ReturnType<typeof plainValue>, kind: ReturnType<typeof exportKindOf>): unknown {
  if (value === null) return null
  if (typeof value === 'bigint') return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString()
  if (value instanceof Date) return kind === 'date' ? value.toISOString().slice(0, 10) : formatTimestamp(value).replace(/\.000$/, '')
  return value
}
