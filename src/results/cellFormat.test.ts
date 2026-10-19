import { describe, expect, it } from 'vitest'
import { selectRows, startSharedEngine } from '../test-support/sharedEngine'
import { compareSortKeys, formatTimestampMilliseconds, scaleDecimal } from './cellFormat'
import { cellText, describeResult } from './queryResult'

const engine = startSharedEngine()

describe('cell formatting', () => {
  it('formats every common DuckDB type the way it reads in SQL', async () => {
    const sql = `SELECT 1::TINYINT a, 9007199254740993::BIGINT b, 1.25::DECIMAL(10,2) c, -0.05::DECIMAL(4,2) d, 1.5::DOUBLE e, 'x' f, true g,
      DATE '2024-01-02' h, TIMESTAMP '2024-01-02 03:04:05' i, TIMESTAMP '2024-01-02 03:04:05.123' j, TIME '01:02:03.5' k,
      '\\xAB\\x01'::BLOB l, [1, 2] m, {'x': 1} n, NULL::INTEGER o, TIMESTAMPTZ '2024-01-02 03:04:05+00' p, 3::HUGEINT q`
    const result = describeResult(sql, await engine().run(sql), 1)
    const texts = result.columns.map((_, index) => cellText(result, 0, index))
    expect(texts).toEqual([
      '1',
      '9007199254740993',
      '1.25',
      '-0.05',
      '1.5',
      'x',
      'true',
      '2024-01-02',
      '2024-01-02 03:04:05',
      '2024-01-02 03:04:05.123',
      '01:02:03.5',
      '0xAB01',
      '[1,2]',
      '{"x":1}',
      null,
      '2024-01-02 03:04:05+00',
      '3',
    ])
    expect(result.columns.find((column) => column.name === 'c')?.numeric).toBe(true)
    expect(result.columns.find((column) => column.name === 'f')?.numeric).toBe(false)
    expect(result.rowCount).toBe(1)
  })

  it('scales unscaled decimal digits', () => {
    expect(scaleDecimal('125', 2)).toBe('1.25')
    expect(scaleDecimal('-5', 2)).toBe('-0.05')
    expect(scaleDecimal('7', 0)).toBe('7')
  })

  it('drops zero milliseconds from timestamps', () => {
    expect(formatTimestampMilliseconds(0)).toBe('1970-01-01 00:00:00')
    expect(formatTimestampMilliseconds(1)).toBe('1970-01-01 00:00:00.001')
  })

  it('sorts missing values last and compares mixed keys', async () => {
    expect([3, null, 1].sort(compareSortKeys)).toEqual([1, 3, null])
    expect(['b', 'a'].sort(compareSortKeys)).toEqual(['a', 'b'])
    expect([2n, 1n].sort(compareSortKeys)).toEqual([1n, 2n])
    expect(await selectRows(engine(), 'SELECT 1 AS ok')).toEqual([{ ok: 1 }])
  })
})
