import { DataType, type Field } from 'apache-arrow'

export type CellFormatter = (value: unknown) => string | null

export function formatterFor(field: Field): CellFormatter {
  const type = field.type
  if (DataType.isDecimal(type)) return guard((value) => scaleDecimal(String(value), type.scale))
  if (DataType.isDate(type)) return guard((value) => new Date(Number(value)).toISOString().slice(0, 10))
  if (DataType.isTimestamp(type)) {
    const suffix = type.timezone ? '+00' : ''
    return guard((value) => `${formatTimestampMilliseconds(Number(value))}${suffix}`)
  }
  if (DataType.isTime(type)) return guard((value) => formatTimeOfDay(type.unit, value as number | bigint))
  if (DataType.isBinary(type) || DataType.isLargeBinary?.(type) || DataType.isFixedSizeBinary(type)) {
    return guard((value) => `0x${Array.from(value as Uint8Array, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`)
  }
  if (DataType.isInterval(type)) return guard((value) => formatInterval(value as ArrayLike<number>))
  if (DataType.isList(type) || DataType.isStruct(type) || DataType.isMap(type) || DataType.isFixedSizeList(type)) {
    return guard((value) => JSON.stringify(toPlain(value), bigintReplacer))
  }
  return guard((value) => (typeof value === 'object' ? JSON.stringify(toPlain(value), bigintReplacer) : String(value)))
}

function guard(format: (value: unknown) => string): CellFormatter {
  return (value) => (value === null || value === undefined ? null : format(value))
}

export function scaleDecimal(unscaled: string, scale: number): string {
  if (scale <= 0) return unscaled
  const negative = unscaled.startsWith('-')
  const digits = (negative ? unscaled.slice(1) : unscaled).padStart(scale + 1, '0')
  const whole = digits.slice(0, digits.length - scale)
  const fraction = digits.slice(digits.length - scale)
  return `${negative ? '-' : ''}${whole}.${fraction}`
}

export function formatTimestampMilliseconds(milliseconds: number): string {
  const iso = new Date(milliseconds).toISOString().replace('T', ' ').replace('Z', '')
  return iso.endsWith('.000') ? iso.slice(0, -4) : iso
}

const unitsPerSecond = [1, 1_000, 1_000_000, 1_000_000_000]

function formatTimeOfDay(unit: number, value: number | bigint): string {
  const perSecond = BigInt(unitsPerSecond[unit] ?? 1)
  const total = BigInt(value)
  const seconds = Number(total / perSecond)
  const fraction = total % perSecond
  const clock = [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60].map((part) => String(part).padStart(2, '0')).join(':')
  if (fraction === 0n) return clock
  return `${clock}.${fraction.toString().padStart(String(perSecond).length - 1, '0').replace(/0+$/, '')}`
}

function formatInterval(parts: ArrayLike<number>): string {
  const pieces: string[] = []
  if (parts[0]) pieces.push(`${parts[0]} months`)
  if (parts[1]) pieces.push(`${parts[1]} days`)
  return pieces.length > 0 ? pieces.join(' ') : '0 days'
}

function toPlain(value: unknown): unknown {
  if (value !== null && typeof value === 'object' && 'toJSON' in value && typeof value.toJSON === 'function') return value.toJSON()
  return value
}

function bigintReplacer(_key: string, value: unknown) {
  return typeof value === 'bigint' ? value.toString() : value
}

export type SortKey = number | bigint | string | boolean

export function sortKeyFor(field: Field): (value: unknown) => SortKey | null {
  const type = field.type
  const format = formatterFor(field)
  if (DataType.isDecimal(type)) return (value) => (value === null || value === undefined ? null : BigInt(String(value)))
  if (DataType.isInt(type) || DataType.isFloat(type) || DataType.isDate(type) || DataType.isTimestamp(type) || DataType.isBool(type)) {
    return (value) => (value === null || value === undefined ? null : (value as number | bigint | boolean))
  }
  if (DataType.isTime(type)) return (value) => (value === null || value === undefined ? null : BigInt(value as number))
  return (value) => format(value)
}

export function compareSortKeys(left: SortKey | null, right: SortKey | null): number {
  if (left === right) return 0
  if (left === null) return 1
  if (right === null) return -1
  if (typeof left === 'string' && typeof right === 'string') return left < right ? -1 : left > right ? 1 : 0
  return left < right ? -1 : left > right ? 1 : 0
}
