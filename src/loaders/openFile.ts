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
import type { ImportProgress } from '../importer/importReport'
import { importScript } from '../importer/importScript'
import { readTextChunks } from '../importer/scriptChunks'

export interface OpenFileDependencies {
  engine: SqlEngine
  loadSqlJs: () => Promise<SqlJsStatic>
}

export interface OpenFileOptions {
  delimited?: DelimitedOptions
  onScriptProgress?: (progress: ImportProgress) => void
}

export class UnsupportedFileError extends Error {
  readonly reason: 'backup' | 'unknown'

  constructor(reason: 'backup' | 'unknown', fileName: string) {
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
      return openScript(engine, file, existing, options)
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

async function openScript(engine: SqlEngine, file: File, existing: string[], options: OpenFileOptions): Promise<LoadResult> {
  const report = await importScript(engine, readTextChunks(file), {
    totalBytes: file.size,
    existingTableNames: existing,
    onProgress: options.onScriptProgress,
    yieldToUi: () => new Promise((resolve) => setTimeout(resolve, 0)),
  })
  return {
    tables: report.tables.map((table) => ({ name: table.name, rowCount: table.rowCount })),
    warnings: report.warnings,
    importReport: report,
  }
}
