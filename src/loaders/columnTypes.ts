export type InferredType = 'BOOLEAN' | 'BIGINT' | 'DOUBLE' | 'TIMESTAMP' | 'BLOB' | 'VARCHAR'

export function inferColumnType(values: Iterable<unknown>): InferredType {
  let seen: InferredType | undefined
  for (const value of values) {
    if (value === null || value === undefined) continue
    const current = typeOfValue(value)
    seen = seen === undefined ? current : widen(seen, current)
    if (seen === 'VARCHAR') return seen
  }
  return seen ?? 'VARCHAR'
}

function typeOfValue(value: unknown): InferredType {
  if (typeof value === 'boolean') return 'BOOLEAN'
  if (typeof value === 'bigint') return 'BIGINT'
  if (typeof value === 'number') return Number.isSafeInteger(value) ? 'BIGINT' : 'DOUBLE'
  if (value instanceof Date) return 'TIMESTAMP'
  if (value instanceof Uint8Array) return 'BLOB'
  return 'VARCHAR'
}

function widen(left: InferredType, right: InferredType): InferredType {
  if (left === right) return left
  const numeric = new Set<InferredType>(['BIGINT', 'DOUBLE'])
  if (numeric.has(left) && numeric.has(right)) return 'DOUBLE'
  return 'VARCHAR'
}

export function valueToText(value: unknown, type: string): string | null {
  if (value === null || value === undefined) return null
  if (type === 'BLOB') return value instanceof Uint8Array ? bytesToHex(value) : bytesToHex(new TextEncoder().encode(String(value)))
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : formatTimestamp(value)
  if (value instanceof Uint8Array) return bytesToHex(value)
  if (typeof value === 'object') return JSON.stringify(value, jsonReplacer)
  if (typeof value === 'number' && !Number.isFinite(value)) return null
  return String(value)
}

export function formatTimestamp(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '')
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = ''
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0')
  return hex
}

function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Uint8Array) return bytesToHex(value)
  return value
}
