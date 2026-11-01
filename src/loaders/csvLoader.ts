import type { FileSource, SqlEngine } from '../engine/sqlEngine'
import { quoteIdentifier, quoteLiteral } from '../engine/sqlText'
import { countRows } from './rowCount'
import type { LoadResult } from './loadResult'

export interface DelimitedOptions {
  delimiter?: string
  header?: boolean
}

const fullScan = 'sample_size = -1'

export function readCsvExpression(fileName: string, options: DelimitedOptions, extraSettings: string[] = []): string {
  const settings = ['auto_detect = true', 'null_padding = true', ...extraSettings]
  if (options.delimiter !== undefined) settings.push(`delim = ${quoteLiteral(options.delimiter)}`)
  if (options.header !== undefined) settings.push(`header = ${options.header}`)
  return `read_csv(${quoteLiteral(fileName)}, ${settings.join(', ')})`
}

export async function loadDelimitedFile(
  engine: SqlEngine,
  tableName: string,
  fileName: string,
  source: FileSource,
  options: DelimitedOptions,
): Promise<LoadResult> {
  const registeredName = `upload/${crypto.randomUUID()}/${fileName}`
  await engine.registerFile(registeredName, source)
  const create = (extraSettings: string[]) =>
    engine.run(
      `CREATE TABLE ${quoteIdentifier(tableName)} AS SELECT * FROM ${readCsvExpression(registeredName, options, extraSettings)}`,
    )
  try {
    try {
      await create([])
    } catch {
      await engine.run(`DROP TABLE IF EXISTS ${quoteIdentifier(tableName)}`)
      await create([fullScan])
    }
  } finally {
    await engine.dropFile(registeredName)
  }
  return { tables: [{ name: tableName, rowCount: await countRows(engine, tableName) }], warnings: [] }
}
