import { describe, expect, it } from 'vitest'
import { selectRows, startSharedEngine } from '../test-support/sharedEngine'
import { loadSqlJsForNode } from '../test-support/sqlJsNode'
import { detectFileKind } from './fileKind'
import { openFile, UnsupportedFileError } from './openFile'

const engine = startSharedEngine()
const dependencies = () => ({ engine: engine(), loadSqlJs: loadSqlJsForNode })

describe('file kind', () => {
  it('maps extensions to loaders', () => {
    expect(detectFileKind('a.CSV')).toBe('csv')
    expect(detectFileKind('a.tsv')).toBe('tsv')
    expect(detectFileKind('a.jsonl')).toBe('ndjson')
    expect(detectFileKind('a.sqlite3')).toBe('sqlite')
    expect(detectFileKind('a.bak')).toBe('backup')
    expect(detectFileKind('a')).toBe('unknown')
  })
})

describe('open file', () => {
  it('names the table after the file and avoids existing names', async () => {
    const first = await openFile(dependencies(), new File(['x\n1\n'], 'data.csv'))
    const second = await openFile(dependencies(), new File(['x\n2\n'], 'data.csv'))
    expect(first.tables[0].name).toBe('data')
    expect(second.tables[0].name).toBe('data_2')
    expect(await selectRows(engine(), 'SELECT x FROM data_2')).toEqual([{ x: 2 }])
  })

  it('opens tab separated and newline delimited files', async () => {
    await openFile(dependencies(), new File(['a\tb\n1\t2\n'], 'pairs.tsv'))
    await openFile(dependencies(), new File(['{"k":1}\n{"k":2}\n'], 'lines.ndjson'))
    expect(await selectRows(engine(), 'SELECT a + b AS total FROM pairs')).toEqual([{ total: 3 }])
    expect(await selectRows(engine(), 'SELECT CAST(sum(k) AS INTEGER) AS total FROM lines')).toEqual([{ total: 3 }])
  })

  it('explains database backups instead of loading them', async () => {
    await expect(openFile(dependencies(), new File(['x'], 'shop.bak'))).rejects.toBeInstanceOf(UnsupportedFileError)
  })

  it('rejects a .db file that is not SQLite', async () => {
    await expect(openFile(dependencies(), new File(['plain'], 'fake.db'))).rejects.toThrow('not a SQLite database')
  })
})
