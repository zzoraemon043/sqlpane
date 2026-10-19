import { bytesToHex } from '../loaders/columnTypes'
import type { SqlValue } from './sqlValue'

export interface ValueTextResult {
  text: string | null
  zeroDate?: boolean
}

const zeroDate = /^0000-00-00/

export function valueToColumnText(value: SqlValue, columnType: string): ValueTextResult {
  const type = columnType.toUpperCase()
  switch (value.kind) {
    case 'null':
      return { text: null }
    case 'boolean':
      return { text: type === 'BOOLEAN' || type === 'VARCHAR' ? String(value.value) : value.value ? '1' : '0' }
    case 'number':
      return { text: type === 'BOOLEAN' ? String(Number(value.text) !== 0) : value.text }
    case 'string':
      return stringToText(value.text, type)
    case 'hex':
      return { text: hexToText(value.hex, type) }
    case 'bits':
      return { text: bitsToText(value.bits, type) }
  }
}

function stringToText(text: string, type: string): ValueTextResult {
  if (type === 'BLOB') return { text: bytesToHex(new TextEncoder().encode(text)) }
  if ((type === 'TIMESTAMP' || type === 'DATE' || type === 'TIMESTAMPTZ') && zeroDate.test(text)) return { text: null, zeroDate: true }
  if (type === 'BOOLEAN' && text.length === 1 && text.charCodeAt(0) <= 1) return { text: String(text.charCodeAt(0) === 1) }
  return { text }
}

function hexToText(hex: string, type: string): string | null {
  const even = hex.length % 2 === 1 ? `0${hex}` : hex
  if (type === 'BLOB') return even.toLowerCase()
  if (type === 'VARCHAR') return new TextDecoder().decode(hexToBytes(even))
  if (type === 'UUID') return formatSqlServerGuid(even.toLowerCase())
  if (even === '') return null
  const number = BigInt(`0x${even}`)
  return type === 'BOOLEAN' ? String(number !== 0n) : number.toString()
}

function bitsToText(bits: string, type: string): string | null {
  if (bits === '') return null
  const number = BigInt(`0b${bits}`)
  if (type === 'BOOLEAN') return String(number !== 0n)
  if (type === 'BLOB') return number.toString(16).padStart(Math.ceil(bits.length / 8) * 2, '0')
  return number.toString()
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index++) bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  return bytes
}

function formatSqlServerGuid(hex: string): string | null {
  if (hex.length !== 32) return null
  const bytes = hex.match(/../g)!
  const ordered = [...bytes.slice(0, 4).reverse(), ...bytes.slice(4, 6).reverse(), ...bytes.slice(6, 8).reverse(), ...bytes.slice(8)].join('')
  return `${ordered.slice(0, 8)}-${ordered.slice(8, 12)}-${ordered.slice(12, 16)}-${ordered.slice(16, 20)}-${ordered.slice(20)}`
}
