import type { SqlEngine } from '../engine/sqlEngine'
import { quoteIdentifier, quoteLiteral } from '../engine/sqlText'

export interface ColumnSummary {
  name: string
  type: string
  nullable: boolean
}

export interface TableSummary {
  name: string
  columns: ColumnSummary[]
}

export async function listTableNames(engine: SqlEngine): Promise<string[]> {
  const table = await engine.run(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' AND table_name NOT LIKE '\\_\\_sqlpane%' ESCAPE '\\' ORDER BY table_name",
  )
  return table.toArray().map((row) => String(row.table_name))
}

export async function describeTables(engine: SqlEngine): Promise<TableSummary[]> {
  const names = await listTableNames(engine)
  const columns = await engine.run(
    "SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'main' ORDER BY table_name, ordinal_position",
  )
  const byTable = new Map<string, ColumnSummary[]>(names.map((name) => [name, []]))
  for (const row of columns.toArray()) {
    byTable.get(String(row.table_name))?.push({
      name: String(row.column_name),
      type: String(row.data_type),
      nullable: row.is_nullable === 'YES',
    })
  }
  return names.map((name) => ({ name, columns: byTable.get(name) ?? [] }))
}

export async function renameTable(engine: SqlEngine, from: string, to: string): Promise<void> {
  const target = to.trim()
  if (target === '') throw new Error('empty table name')
  await engine.run(`ALTER TABLE ${quoteIdentifier(from)} RENAME TO ${quoteIdentifier(target)}`)
}

export async function dropTable(engine: SqlEngine, name: string): Promise<void> {
  await engine.run(`DROP TABLE IF EXISTS ${quoteIdentifier(name)}`)
}

export async function tableExists(engine: SqlEngine, name: string): Promise<boolean> {
  const table = await engine.run(
    `SELECT count(*) AS found FROM information_schema.tables WHERE table_schema = 'main' AND lower(table_name) = lower(${quoteLiteral(name)})`,
  )
  return Number(table.getChild('found')?.get(0)) > 0
}
