import { parquetMetadata, parquetReadObjects, parquetSchema } from 'hyparquet'
import { compressors } from 'hyparquet-compressors'
import type { SqlEngine } from '../engine/sqlEngine'
import { uniqueColumnNames } from '../catalog/tableNames'
import type { LoadResult } from './loadResult'
import { writeValueTable } from './valueTableLoader'

export async function loadParquetBuffer(engine: SqlEngine, tableName: string, buffer: ArrayBuffer): Promise<LoadResult> {
  const metadata = parquetMetadata(buffer)
  const fieldNames = parquetSchema(metadata).children.map((child) => child.element.name)
  const records = await parquetReadObjects({ file: buffer, metadata, compressors, utf8: true })
  const columnNames = uniqueColumnNames(fieldNames)
  const rows = records.map((record) => fieldNames.map((name) => record[name]))
  await writeValueTable(engine, { name: tableName, columnNames, rows })
  return { tables: [{ name: tableName, rowCount: rows.length }], warnings: [] }
}
