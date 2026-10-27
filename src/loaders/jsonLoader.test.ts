import { describe, expect, it } from 'vitest'
import { selectRows, startSharedEngine } from '../test-support/sharedEngine'
import { loadJsonText } from './jsonLoader'
import { looksLikeJsonLines, parseJsonLines, recordsToRows } from './jsonRecords'

const engine = startSharedEngine()

describe('json records', () => {
  it('collects every key in order of first appearance', () => {
    expect(recordsToRows([{ a: 1 }, { b: 2, a: 3 }, 7])).toEqual({
      columnNames: ['a', 'b', 'value'],
      rows: [
        [1, undefined, undefined],
        [3, 2, undefined],
        [undefined, undefined, 7],
      ],
    })
  })

  it('recognizes newline delimited JSON', () => {
    expect(looksLikeJsonLines('{"a":1}\n{"a":2}\n')).toBe(true)
    expect(looksLikeJsonLines('[{"a":1},\n{"a":2}]')).toBe(false)
    expect(looksLikeJsonLines('{"a":\n1}')).toBe(false)
  })

  it('reports the line of invalid JSON', () => {
    expect(() => parseJsonLines('{"a":1}\n\n{oops}\n')).toThrow('invalid JSON on line 3')
  })
})

describe('json loader', () => {
  it('loads an array of objects with typed columns and nested values as text', async () => {
    const text = JSON.stringify([
      { id: 1, name: '王小明', score: 9.5, active: true, tags: ['a', 'b'] },
      { id: 2, name: 'Lee', score: 7, active: false, tags: null },
    ])
    const result = await loadJsonText(engine(), 'people', text, 'auto')
    expect(result.tables).toEqual([{ name: 'people', rowCount: 2 }])
    expect(await selectRows(engine(), 'SELECT * FROM people ORDER BY id')).toEqual([
      { id: 1, name: '王小明', score: 9.5, active: true, tags: '["a","b"]' },
      { id: 2, name: 'Lee', score: 7, active: false, tags: null },
    ])
  })

  it('keeps integers above 2^53 exact', async () => {
    await loadJsonText(engine(), 'wide_ids', '[{"id": 9007199254740993}, {"id": -9007199254740995}]', 'document')
    expect(await selectRows(engine(), 'SELECT CAST(id AS VARCHAR) AS id FROM wide_ids ORDER BY id DESC')).toEqual([
      { id: '9007199254740993' },
      { id: '-9007199254740995' },
    ])
    await loadJsonText(engine(), 'wide_lines', '{"id": 9007199254740993}\n{"id": 1e400}\n', 'lines')
    expect(await selectRows(engine(), 'SELECT typeof(id) AS kind FROM wide_lines LIMIT 1')).toEqual([{ kind: 'DOUBLE' }])
  })

  it('loads newline delimited JSON', async () => {
    await loadJsonText(engine(), 'events', '{"kind":"open"}\n{"kind":"close","extra":1}\n', 'lines')
    expect(await selectRows(engine(), 'SELECT * FROM events')).toEqual([
      { kind: 'open', extra: null },
      { kind: 'close', extra: 1 },
    ])
  })

  it('rejects a file without records', async () => {
    await expect(loadJsonText(engine(), 'nothing', '[]', 'document')).rejects.toThrow('no records')
  })
})
