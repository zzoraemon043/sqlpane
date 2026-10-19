import { describe, expect, it } from 'vitest'
import { selectRows, startSharedEngine } from '../test-support/sharedEngine'
import { describeTables, dropTable, listTableNames, renameTable, tableExists } from './catalog'

const engine = startSharedEngine()

describe('catalog', () => {
  it('lists, describes, renames and drops tables', async () => {
    await engine().run('CREATE TABLE "first table" (id INTEGER NOT NULL, label VARCHAR)')
    expect(await listTableNames(engine())).toEqual(['first table'])
    const [summary] = await describeTables(engine())
    expect(summary.columns).toEqual([
      { name: 'id', type: 'INTEGER', nullable: false },
      { name: 'label', type: 'VARCHAR', nullable: true },
    ])
    await renameTable(engine(), 'first table', 'renamed')
    expect(await tableExists(engine(), 'RENAMED')).toBe(true)
    expect(await selectRows(engine(), 'SELECT count(*) AS n FROM renamed')).toEqual([{ n: 0 }])
    await dropTable(engine(), 'renamed')
    expect(await listTableNames(engine())).toEqual([])
  })

  it('rejects an empty new name', async () => {
    await expect(renameTable(engine(), 'missing', '  ')).rejects.toThrow('empty table name')
  })
})
