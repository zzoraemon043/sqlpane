import { describe, expect, it } from 'vitest'
import { bytesToHex, inferColumnType, valueToText } from './columnTypes'

describe('column type inference', () => {
  it('detects each simple type and ignores missing values', () => {
    expect(inferColumnType([true, null, false])).toBe('BOOLEAN')
    expect(inferColumnType([1, 2, undefined])).toBe('BIGINT')
    expect(inferColumnType([1n, 2n])).toBe('BIGINT')
    expect(inferColumnType([1, 2.5])).toBe('DOUBLE')
    expect(inferColumnType([new Date(0)])).toBe('TIMESTAMP')
    expect(inferColumnType([new Uint8Array([1])])).toBe('BLOB')
    expect(inferColumnType([null, null])).toBe('VARCHAR')
  })

  it('falls back to text for mixed values', () => {
    expect(inferColumnType([1, 'a'])).toBe('VARCHAR')
    expect(inferColumnType([true, 1])).toBe('VARCHAR')
  })

  it('converts values to text the database can cast', () => {
    expect(valueToText(null, 'BIGINT')).toBeNull()
    expect(valueToText(new Date(Date.UTC(2024, 0, 2, 3, 4, 5)), 'TIMESTAMP')).toBe('2024-01-02 03:04:05.000')
    expect(valueToText(new Uint8Array([0, 255]), 'BLOB')).toBe('00ff')
    expect(valueToText({ a: [1, 2n] }, 'VARCHAR')).toBe('{"a":[1,"2"]}')
    expect(valueToText(Number.NaN, 'DOUBLE')).toBeNull()
    expect(valueToText('A', 'BLOB')).toBe('41')
    expect(bytesToHex(new Uint8Array([10]))).toBe('0a')
  })
})
