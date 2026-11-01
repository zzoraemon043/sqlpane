import { describe, expect, it } from 'vitest'
import { selectRows, startSharedEngine } from '../test-support/sharedEngine'
import { writeValueTable } from './valueTableLoader'

const engine = startSharedEngine()

describe('value table loader', () => {
  it('keeps unsigned 64-bit values that exceed the signed range', async () => {
    const outcome = await writeValueTable(engine(), {
      name: 'big_ids',
      columnNames: ['id'],
      rows: [[1n], [18446744073709551615n], [null]],
    })
    expect(outcome.failedLines).toEqual([])
    expect(await selectRows(engine(), 'SELECT CAST(id AS VARCHAR) AS id FROM big_ids ORDER BY id NULLS LAST')).toEqual([
      { id: '1' },
      { id: '18446744073709551615' },
      { id: null },
    ])
  })
})
