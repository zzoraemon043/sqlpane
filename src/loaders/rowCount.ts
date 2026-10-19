import type { SqlEngine } from '../engine/sqlEngine'
import { quoteIdentifier } from '../engine/sqlText'

export async function countRows(engine: SqlEngine, tableName: string): Promise<number> {
  const table = await engine.run(`SELECT count(*) AS total FROM ${quoteIdentifier(tableName)}`)
  return Number(table.getChild('total')?.get(0) ?? 0)
}
