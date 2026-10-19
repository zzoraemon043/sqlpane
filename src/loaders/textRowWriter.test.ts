import { describe, expect, it } from 'vitest'
import { selectRows, startSharedEngine } from '../test-support/sharedEngine'
import { appendTextRows, createTable, createTableStatement, type TargetTable } from './textRowWriter'

const engine = startSharedEngine()

describe('text row writer', () => {
  it('builds a create statement with constraints', () => {
    expect(
      createTableStatement({
        name: 'a"b',
        columns: [{ name: 'id', type: 'INTEGER', notNull: true }, { name: 'v', type: 'VARCHAR' }],
        primaryKey: ['id'],
      }),
    ).toBe('CREATE TABLE "a""b" ("id" INTEGER NOT NULL, "v" VARCHAR, PRIMARY KEY ("id"))')
  })

  it('casts text into typed columns and reports rows that do not fit', async () => {
    const target: TargetTable = {
      name: 'typed',
      columns: [
        { name: 'id', type: 'INTEGER' },
        { name: 'price', type: 'DECIMAL(10,2)' },
        { name: 'payload', type: 'BLOB' },
        { name: 'seen', type: 'TIMESTAMP' },
      ],
    }
    await createTable(engine(), target)
    const outcome = await appendTextRows(engine(), target, {
      rows: [
        ['1', '9.99', 'cafe', '2024-01-02 03:04:05'],
        ['two', '1', null, null],
        ['3', null, 'zz', null],
        ['4', '0.5', null, '2024-02-30'],
        ['5', '-1.25', '00', null],
      ],
      lineNumbers: [10, 11, 12, 13, 14],
    })
    expect(outcome.inserted).toBe(2)
    expect(outcome.failedLines).toEqual([11, 12, 13])
    expect(await selectRows(engine(), 'SELECT id, CAST(price AS VARCHAR) AS price, hex(payload) AS payload FROM typed ORDER BY id')).toEqual([
      { id: 1, price: '9.99', payload: 'CAFE' },
      { id: 5, price: '-1.25', payload: '00' },
    ])
  })

  it('falls back to single rows when a constraint fails', async () => {
    const target: TargetTable = {
      name: 'keyed',
      columns: [{ name: 'id', type: 'INTEGER', notNull: true }, { name: 'v', type: 'VARCHAR' }],
      primaryKey: ['id'],
    }
    await createTable(engine(), target)
    const outcome = await appendTextRows(engine(), target, {
      rows: [['1', 'a'], ['1', 'duplicate'], [null, 'missing key'], ['2', 'b']],
      lineNumbers: [1, 2, 3, 4],
    })
    expect(outcome.inserted).toBe(2)
    expect(outcome.failedLines).toEqual([2, 3])
    expect(outcome.failures.length).toBeGreaterThan(0)
    expect(outcome.failures.every((failure) => failure.code === 'detail')).toBe(true)
    expect(await selectRows(engine(), 'SELECT id, v FROM keyed ORDER BY id')).toEqual([
      { id: 1, v: 'a' },
      { id: 2, v: 'b' },
    ])
  })

  it('accepts an empty batch', async () => {
    const outcome = await appendTextRows(engine(), { name: 'unused', columns: [] }, { rows: [] })
    expect(outcome).toEqual({ inserted: 0, failedLines: [], failures: [] })
  })
})
