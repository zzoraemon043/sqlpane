import { describe, expect, it } from 'vitest'
import { valueToColumnText } from './valueText'

describe('value conversion', () => {
  it('turns NULL into a missing value', () => {
    expect(valueToColumnText({ kind: 'null' }, 'INTEGER')).toEqual({ text: null })
  })

  it('converts numbers and strings to booleans', () => {
    expect(valueToColumnText({ kind: 'number', text: '1' }, 'BOOLEAN').text).toBe('true')
    expect(valueToColumnText({ kind: 'number', text: '0' }, 'BOOLEAN').text).toBe('false')
    expect(valueToColumnText({ kind: 'string', text: '\u0001', binary: true }, 'BOOLEAN').text).toBe('true')
    expect(valueToColumnText({ kind: 'bits', bits: '0' }, 'BOOLEAN').text).toBe('false')
    expect(valueToColumnText({ kind: 'boolean', value: true }, 'INTEGER').text).toBe('1')
  })

  it('stores hex literals according to the column type', () => {
    expect(valueToColumnText({ kind: 'hex', hex: 'ABC' }, 'BLOB').text).toBe('0abc')
    expect(valueToColumnText({ kind: 'hex', hex: '4869' }, 'VARCHAR').text).toBe('Hi')
    expect(valueToColumnText({ kind: 'hex', hex: 'ff' }, 'INTEGER').text).toBe('255')
    expect(valueToColumnText({ kind: 'hex', hex: '33221100554477668899AABBCCDDEEFF' }, 'UUID').text).toBe('00112233-4455-6677-8899-aabbccddeeff')
  })

  it('decodes SQL Server binary date and time literals', () => {
    const hex = (value: string, castType: string) => ({ kind: 'hex' as const, hex: value, castType })
    expect(valueToColumnText(hex('0000A9E500000000', 'DATETIME'), 'TIMESTAMP').text).toBe('2019-01-30 00:00:00')
    expect(valueToColumnText(hex('0000A9E5018B81FF', 'DATETIME'), 'TIMESTAMP').text).toBe('2019-01-30 23:59:59.996667')
    expect(valueToColumnText(hex('FFFFFFFF00000000', 'DATETIME'), 'TIMESTAMP').text).toBe('1899-12-31 00:00:00')
    expect(valueToColumnText(hex('A9E502D0', 'SMALLDATETIME'), 'TIMESTAMP').text).toBe('2019-01-30 12:00:00')
    expect(valueToColumnText(hex('5B950A00', 'DATE'), 'DATE').text).toBe('1900-01-01')
    expect(valueToColumnText(hex('0000A9E500000000', 'DATETIME'), 'DATE').text).toBe('2019-01-30')
    expect(valueToColumnText(hex('075058C4109B3F3F0B', 'DATETIME2'), 'TIMESTAMP').text).toBe('2019-01-29 18:30:00.123400')
    expect(valueToColumnText(hex('0700E0349564000000', 'TIME'), 'TIME').text).toBe('12:00:00')
    expect(valueToColumnText(hex('0000A9E5', 'DATETIME'), 'TIMESTAMP').text).toBeNull()
    expect(valueToColumnText(hex('0000A9E500000000', 'DATETIME'), 'BLOB').text).toBe('0000a9e500000000')
  })

  it('stores text in binary columns as bytes', () => {
    expect(valueToColumnText({ kind: 'string', text: 'é', binary: false }, 'BLOB').text).toBe('c3a9')
  })

  it('turns MySQL zero dates into NULL and flags them', () => {
    expect(valueToColumnText({ kind: 'string', text: '0000-00-00 00:00:00', binary: false }, 'TIMESTAMP')).toEqual({ text: null, zeroDate: true })
    expect(valueToColumnText({ kind: 'string', text: '0000-00-00', binary: false }, 'VARCHAR').text).toBe('0000-00-00')
  })

  it('keeps bit fields as numbers or bytes', () => {
    expect(valueToColumnText({ kind: 'bits', bits: '1010' }, 'UBIGINT').text).toBe('10')
    expect(valueToColumnText({ kind: 'bits', bits: '1' }, 'BLOB').text).toBe('01')
  })
})
