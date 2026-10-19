import type { SqlJsStatic } from 'sql.js'
import type { SqlEngine } from '../engine/sqlEngine'
import { uniqueColumnNames, uniqueTableName } from '../catalog/tableNames'
import type { LoadResult } from './loadResult'
import { writeValueTable } from './valueTableLoader'

export async function loadSqliteDatabase(
  engine: SqlEngine,
  sqlJs: SqlJsStatic,
  bytes: Uint8Array,
  existingNames: readonly string[],
): Promise<LoadResult> {
  const database = new sqlJs.Database(bytes)
  const result: LoadResult = { tables: [], warnings: [] }
  const taken = [...existingNames]
  try {
    for (const sourceName of listSqliteTables(database)) {
      const statement = database.prepare(`SELECT * FROM "${sourceName.replaceAll('"', '""')}"`)
      const rows: unknown[][] = []
      while (statement.step()) rows.push(statement.get())
      const columnNames = uniqueColumnNames(statement.getColumnNames())
      statement.free()
      const tableName = uniqueTableName(sourceName, taken)
      taken.push(tableName)
      const { failedLines } = await writeValueTable(engine, { name: tableName, columnNames, rows })
      if (failedLines.length > 0) result.warnings.push(`${tableName}: rows not loaded ${failedLines.join(', ')}`)
      result.tables.push({ name: tableName, rowCount: rows.length - failedLines.length })
    }
  } finally {
    database.close()
  }
  return result
}

function listSqliteTables(database: InstanceType<SqlJsStatic['Database']>): string[] {
  const [listing] = database.exec(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' ORDER BY rowid",
  )
  return listing ? listing.values.map((row) => String(row[0])) : []
}
