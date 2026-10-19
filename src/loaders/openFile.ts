import type { SqlJsStatic } from 'sql.js'
import type { SqlEngine } from '../engine/sqlEngine'
import { tableNameFromFileName, uniqueTableName } from '../catalog/tableNames'
import { listTableNames } from '../catalog/catalog'
import { loadDelimitedFile, type DelimitedOptions } from './csvLoader'
import { loadExcelWorkbook } from './excelLoader'
import { detectFileKind, hasSqliteHeader } from './fileKind'
import { loadJsonText } from './jsonLoader'
import type { LoadResult } from './loadResult'
import { loadParquetBuffer } from './parquetLoader'
import { loadSqliteDatabase } from './sqliteLoader'

export interface OpenFileDependencies {
  engine: SqlEngine
  loadSqlJs: () => Promise<SqlJsStatic>
}

export interface OpenFileOptions {
  delimited?: DelimitedOptions
}

export class UnsupportedFileError extends Error {
  readonly reason: 'backup' | 'unknown' | 'script'

  constructor(reason: 'backup' | 'unknown' | 'script', fileName: string) {
    super(`${reason}: ${fileName}`)
    this.reason = reason
  }
}

export async function openFile(
  dependencies: OpenFileDependencies,
  file: File,
  options: OpenFileOptions = {},
): Promise<LoadResult> {
  const { engine } = dependencies
  const existing = await listTableNames(engine)
  const baseName = tableNameFromFileName(file.name)
  const tableName = uniqueTableName(baseName, existing)
  const kind = detectFileKind(file.name)
  switch (kind) {
    case 'csv':
      return loadDelimitedFile(engine, tableName, file.name, file, options.delimited ?? {})
    case 'tsv':
      return loadDelimitedFile(engine, tableName, file.name, file, { delimiter: '\t', ...options.delimited })
    case 'json':
      return loadJsonText(engine, tableName, await file.text(), 'auto')
    case 'ndjson':
      return loadJsonText(engine, tableName, await file.text(), 'lines')
    case 'parquet':
      return loadParquetBuffer(engine, tableName, await file.arrayBuffer())
    case 'excel':
      return loadExcelWorkbook(engine, baseName, new Uint8Array(await file.arrayBuffer()), existing)
    case 'sqlite':
      return openSqlite(dependencies, file, existing)
    case 'script':
    case 'backup':
    case 'unknown':
      throw new UnsupportedFileError(kind, file.name)
  }
}

async function openSqlite(dependencies: OpenFileDependencies, file: File, existing: string[]): Promise<LoadResult> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!hasSqliteHeader(bytes)) throw new Error(`not a SQLite database: ${file.name}`)
  return loadSqliteDatabase(dependencies.engine, await dependencies.loadSqlJs(), bytes, existing)
}
