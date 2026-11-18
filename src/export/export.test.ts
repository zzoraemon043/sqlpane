import { parquetMetadata, parquetReadObjects } from 'hyparquet'
import { beforeAll, describe, expect, it } from 'vitest'
import { readWorkbook } from '../loaders/xlsx/readWorkbook'
import { describeResult } from '../results/queryResult'
import { installDomParser } from '../test-support/domParser'
import { startSharedEngine } from '../test-support/sharedEngine'
import { csvField, exportCsv } from './exportCsv'
import { exportExcel } from './exportExcel'
import { exportJson } from './exportJson'
import { exportParquet } from './exportParquet'
import { columnLetters, escapeXml } from './xlsx/writeWorkbook'
import { exportFileName } from './download'

beforeAll(installDomParser)
const engine = startSharedEngine()

const sampleSql = `SELECT * FROM (VALUES
  (1, 'plain', 1.25::DECIMAL(6,2), true, TIMESTAMP '2024-01-02 03:04:05', DATE '2024-05-06', 9007199254740993::BIGINT, 2.5::DOUBLE),
  (2, 'with, "quote"' || chr(10) || 'line', NULL, false, NULL, NULL, 5::BIGINT, NULL)
) AS t(id, label, price, flag, seen, day, big, ratio)`

async function sample() {
  return describeResult(sampleSql, await engine().run(sampleSql), 1)
}

describe('export', () => {
  it('writes CSV with quoting, NULL as empty and a byte order mark', async () => {
    const csv = exportCsv(await sample(), [1, 0])
    expect(csv).toBe(
      '﻿id,label,price,flag,seen,day,big,ratio\r\n' +
        '2,"with, ""quote""\nline",,false,,,5,\r\n' +
        '1,plain,1.25,true,2024-01-02 03:04:05,2024-05-06,9007199254740993,2.5\r\n',
    )
    expect(csvField(' padded')).toBe('" padded"')
  })

  it('writes JSON with native numbers and booleans', async () => {
    expect(JSON.parse(exportJson(await sample(), [0, 1]))).toEqual([
      { id: 1, label: 'plain', price: 1.25, flag: true, seen: '2024-01-02 03:04:05', day: '2024-05-06', big: '9007199254740993', ratio: 2.5 },
      { id: 2, label: 'with, "quote"\nline', price: null, flag: false, seen: null, day: null, big: 5, ratio: null },
    ])
  })

  it('keeps HUGEINT, wide decimals and microseconds exact in JSON and the grid', async () => {
    const sql = "SELECT 9007199254740993::HUGEINT AS huge, 12345678901234567.89::DECIMAL(19,2) AS wide, TIMESTAMP '2024-01-01 12:00:00.123456' AS micro, TIMESTAMP '1969-12-31 23:59:59.5' AS before_epoch"
    const result = describeResult(sql, await engine().run(sql), 1)
    expect(JSON.parse(exportJson(result, [0]))).toEqual([
      { huge: '9007199254740993', wide: '12345678901234567.89', micro: '2024-01-01 12:00:00.123456', before_epoch: '1969-12-31 23:59:59.5' },
    ])
    expect(result.columns.map((column, index) => column.format(result.readers[index](0)))).toEqual([
      '9007199254740993',
      '12345678901234567.89',
      '2024-01-01 12:00:00.123456',
      '1969-12-31 23:59:59.5',
    ])
  })

  it('exports infinity and far dates without throwing', async () => {
    const sql = "SELECT DATE 'infinity' AS d, TIMESTAMP '-infinity' AS t, DATE '10000-01-01' AS far"
    const result = describeResult(sql, await engine().run(sql), 1)
    expect(exportCsv(result, [0])).toContain('infinity,-infinity,10000-01-01')
    expect(JSON.parse(exportJson(result, [0]))).toEqual([{ d: 'infinity', t: '-infinity', far: '10000-01-01' }])
    expect(() => exportExcel(result, [0])).not.toThrow()
    const parquet = await parquetReadObjects({ file: exportParquet(result, [0]).buffer as ArrayBuffer })
    expect(parquet[0].d).toBeNull()
  })

  it('keeps every column in JSON when names repeat', async () => {
    const sql = 'SELECT 1 AS a, 2 AS a, 3 AS a_2'
    const result = describeResult(sql, await engine().run(sql), 1)
    expect(JSON.parse(exportJson(result, [0]))).toEqual([{ a: 1, a_3: 2, a_2: 3 }])
  })

  it('writes Parquet that reads back with the same values', async () => {
    const bytes = exportParquet(await sample(), [0, 1])
    const rows = await parquetReadObjects({ file: bytes.buffer as ArrayBuffer })
    expect(rows[0]).toMatchObject({ id: 1, label: 'plain', price: 1.25, flag: true, big: 9007199254740993n, ratio: 2.5 })
    expect((rows[0].seen as Date).toISOString()).toBe('2024-01-02T03:04:05.000Z')
    expect(rows[1]).toMatchObject({ id: 2, price: null, flag: false, seen: null, big: 5n })
  })

  it('writes unsigned 64-bit integers with the unsigned Parquet annotation', async () => {
    const sql = 'SELECT id, -1::BIGINT AS signed FROM (VALUES (0::UBIGINT), (18446744073709551615::UBIGINT), (NULL)) t(id)'
    const result = describeResult(sql, await engine().run(sql), 1)
    const buffer = exportParquet(result, [0, 1, 2]).buffer as ArrayBuffer
    const metadata = parquetMetadata(buffer)
    expect(metadata.schema[1]).toMatchObject({ type: 'INT64', logical_type: { type: 'INTEGER', bitWidth: 64, isSigned: false } })
    expect(await parquetReadObjects({ file: buffer, metadata })).toEqual([
      { id: 0n, signed: -1n }, { id: 18446744073709551615n, signed: -1n }, { id: null, signed: -1n },
    ])
  })

  it('writes exact Parquet decimals with their precision and scale', async () => {
    const sql = "SELECT 9007199254740993::DECIMAL(18,0) AS whole, '-12345678901234567890.1234'::DECIMAL(24,4) AS wide, NULL::DECIMAL(6,2) AS missing"
    const result = describeResult(sql, await engine().run(sql), 1)
    const buffer = exportParquet(result, [0]).buffer as ArrayBuffer
    const metadata = parquetMetadata(buffer)
    expect(metadata.schema.slice(1)).toMatchObject([
      { converted_type: 'DECIMAL', precision: 18, scale: 0 },
      { converted_type: 'DECIMAL', precision: 24, scale: 4 },
      { converted_type: 'DECIMAL', precision: 6, scale: 2 },
    ])
    const physicalSchema = metadata.schema.map((field) => ({ ...field, converted_type: undefined, logical_type: undefined }))
    const [row] = await parquetReadObjects({ file: buffer, metadata: { ...metadata, schema: physicalSchema }, utf8: false })
    expect(row.whole).toBe(9007199254740993n)
    const wide = Array.from(row.wide as Uint8Array, (byte) => byte.toString(16).padStart(2, '0')).join('')
    expect(BigInt.asIntN(wide.length * 4, BigInt(`0x${wide}`))).toBe(-123456789012345678901234n)
    expect(row.missing).toBeNull()
  })

  it('writes Excel decimals as text when they exceed Excel numeric precision', async () => {
    const sql = "SELECT 9007199254740993::DECIMAL(18,0) AS whole, '900719925474099.30'::DECIMAL(18,2) AS scaled, 1.25::DECIMAL(6,2) AS small, 999999999999999::DECIMAL(15,0) AS fifteen"
    const result = describeResult(sql, await engine().run(sql), 1)
    const { bytes } = exportExcel(result, [0])
    expect(readWorkbook(bytes)[0].rows[1]).toEqual(['9007199254740993', '900719925474099.30', 1.25, 999999999999999])
  })

  it('writes an Excel workbook that reads back with typed cells', async () => {
    const { bytes, truncated } = exportExcel(await sample(), [0, 1])
    expect(truncated).toBe(false)
    const [sheet] = readWorkbook(bytes)
    expect(sheet.name).toBe('Result')
    expect(sheet.rows[0]).toEqual(['id', 'label', 'price', 'flag', 'seen', 'day', 'big', 'ratio'])
    expect(sheet.rows[1]).toEqual([1, 'plain', 1.25, true, new Date(Date.UTC(2024, 0, 2, 3, 4, 5)), new Date(Date.UTC(2024, 4, 6)), '9007199254740993', 2.5])
    expect(sheet.rows[2]).toEqual([2, 'with, "quote"\nline', null, false, null, null, 5])
  })

  it('escapes XML and names columns like spreadsheets', () => {
    expect(escapeXml('a<b & "c"\u0001')).toBe('a&lt;b &amp; &quot;c&quot;')
    expect([0, 25, 26, 701, 702].map(columnLetters)).toEqual(['A', 'Z', 'AA', 'ZZ', 'AAA'])
  })

  it('names exported files with a timestamp', () => {
    expect(exportFileName('csv', new Date(Date.UTC(2024, 0, 2, 3, 4, 5)))).toBe('sqlpane-result-20240102-030405.csv')
  })
})
