import { describe, expect, it } from 'vitest'
import { selectRows, startSharedEngine } from '../test-support/sharedEngine'
import { loadSqlJsForNode } from '../test-support/sqlJsNode'
import { hasSqliteHeader } from './fileKind'
import { loadSqliteDatabase } from './sqliteLoader'

const engine = startSharedEngine()

async function buildSqliteFile(): Promise<Uint8Array> {
  const sqlJs = await loadSqlJsForNode()
  const database = new sqlJs.Database()
  database.run(`
    CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, balance REAL, avatar BLOB);
    INSERT INTO customers VALUES (1, '陳大文', 10.5, x'0102'), (2, 'Kim', NULL, NULL);
    CREATE TABLE notes (body);
    INSERT INTO notes VALUES (1), ('text');
    CREATE VIEW rich AS SELECT * FROM customers WHERE balance > 1;
  `)
  const bytes = database.export()
  database.close()
  return bytes
}

describe('sqlite loader', () => {
  it('copies every table and keeps column types', async () => {
    const bytes = await buildSqliteFile()
    expect(hasSqliteHeader(bytes)).toBe(true)
    const result = await loadSqliteDatabase(engine(), await loadSqlJsForNode(), bytes, [])
    expect(result.tables).toEqual([
      { name: 'customers', rowCount: 2 },
      { name: 'notes', rowCount: 2 },
    ])
    expect(await selectRows(engine(), 'SELECT id, name, balance, hex(avatar) AS avatar FROM customers ORDER BY id')).toEqual([
      { id: 1, name: '陳大文', balance: 10.5, avatar: '0102' },
      { id: 2, name: 'Kim', balance: null, avatar: null },
    ])
    expect(await selectRows(engine(), 'SELECT body FROM notes ORDER BY body')).toEqual([{ body: '1' }, { body: 'text' }])
  })

  it('rejects bytes without the SQLite header', () => {
    expect(hasSqliteHeader(new TextEncoder().encode('not a database'))).toBe(false)
  })
})
