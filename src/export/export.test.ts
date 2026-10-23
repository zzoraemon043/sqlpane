import { parquetReadObjects } from 'hyparquet'
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
