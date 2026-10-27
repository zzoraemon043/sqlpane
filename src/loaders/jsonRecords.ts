import { uniqueColumnNames } from '../catalog/tableNames'

export interface RecordRows {
  columnNames: string[]
  rows: unknown[][]
}

const int64Min = -(2n ** 63n)
const int64Max = 2n ** 63n - 1n

function exactIntegers(_key: string, value: unknown, context?: { source?: string }): unknown {
  if (typeof value !== 'number' || Number.isSafeInteger(value) || !context?.source || !/^-?\d+$/.test(context.source)) return value
  const exact = BigInt(context.source)
  return exact >= int64Min && exact <= int64Max ? exact : value
}

function parseExact(text: string): unknown {
  return JSON.parse(text, exactIntegers as Parameters<typeof JSON.parse>[1])
}

export function parseJsonDocument(text: string): unknown[] {
  const parsed: unknown = parseExact(text)
  return Array.isArray(parsed) ? parsed : [parsed]
}

export function parseJsonLines(text: string): unknown[] {
  const records: unknown[] = []
  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    if (line.trim() === '') return
    try {
      records.push(parseExact(line))
    } catch {
      throw new Error(`invalid JSON on line ${index + 1}`)
    }
  })
  return records
}

export function looksLikeJsonLines(text: string): boolean {
  const start = text.trimStart()
  if (start.startsWith('[')) return false
  const lines = start.split(/\r?\n/).filter((line) => line.trim() !== '')
  return lines.length > 1 && lines.every((line) => line.trim().startsWith('{'))
}

export function recordsToRows(records: readonly unknown[]): RecordRows {
  const keys: string[] = []
  const seen = new Set<string>()
  for (const record of records) {
    for (const key of Object.keys(asObject(record))) {
      if (!seen.has(key)) {
        seen.add(key)
        keys.push(key)
      }
    }
  }
  const rows = records.map((record) => {
    const object = asObject(record)
    return keys.map((key) => object[key])
  })
  return { columnNames: uniqueColumnNames(keys), rows }
}

function asObject(record: unknown): Record<string, unknown> {
  if (record !== null && typeof record === 'object' && !Array.isArray(record)) return record as Record<string, unknown>
  return { value: record }
}
