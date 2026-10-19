import { Int32, Table, Utf8, tableToIPC, vectorFromArray, type Vector } from 'apache-arrow'
import type { SqlEngine } from '../engine/sqlEngine'
import { quoteIdentifier } from '../engine/sqlText'

export interface TargetColumn {
  name: string
  type: string
  notNull?: boolean
}

export interface TargetTable {
  name: string
  columns: TargetColumn[]
  primaryKey?: string[]
}

export interface TextRowBatch {
  rows: (string | null)[][]
  lineNumbers?: number[]
}

export interface AppendOutcome {
  inserted: number
  failedLines: number[]
  failureMessages: string[]
}

const stagingTableName = '__sqlpane_staging'

export function createTableStatement(target: TargetTable): string {
  const columnDefinitions = target.columns.map(
    (column) => `${quoteIdentifier(column.name)} ${column.type}${column.notNull ? ' NOT NULL' : ''}`,
  )
  if (target.primaryKey && target.primaryKey.length > 0) {
    columnDefinitions.push(`PRIMARY KEY (${target.primaryKey.map(quoteIdentifier).join(', ')})`)
  }
  return `CREATE TABLE ${quoteIdentifier(target.name)} (${columnDefinitions.join(', ')})`
}

export async function createTable(engine: SqlEngine, target: TargetTable): Promise<void> {
  await engine.run(createTableStatement(target))
}

export function conversionExpression(columnSql: string, type: string): string {
  if (type.toUpperCase() === 'BLOB') return `from_hex(${columnSql})`
  if (type.toUpperCase() === 'VARCHAR') return columnSql
  return `CAST(${columnSql} AS ${type})`
}

function convertibleCheck(columnSql: string, type: string): string {
  if (type.toUpperCase() === 'VARCHAR') return 'true'
  if (type.toUpperCase() === 'BLOB') return `(${columnSql} IS NULL OR regexp_full_match(${columnSql}, '([0-9a-fA-F]{2})*'))`
  return `(${columnSql} IS NULL OR TRY_CAST(${columnSql} AS ${type}) IS NOT NULL)`
}

export async function appendTextRows(
  engine: SqlEngine,
  target: TargetTable,
  batch: TextRowBatch,
): Promise<AppendOutcome> {
  if (batch.rows.length === 0) return { inserted: 0, failedLines: [], failureMessages: [] }
  const lineNumbers = batch.lineNumbers ?? batch.rows.map((_, index) => index + 1)
  await stageRows(engine, target.columns.length, batch.rows, lineNumbers)
  try {
    return await insertStagedRows(engine, target)
  } finally {
    await engine.run(`DROP TABLE IF EXISTS ${stagingTableName}`)
  }
}

async function stageRows(engine: SqlEngine, columnCount: number, rows: (string | null)[][], lineNumbers: number[]) {
  const vectors: Record<string, Vector> = {
    line: vectorFromArray(lineNumbers, new Int32()),
  }
  for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
    vectors[`c${columnIndex}`] = vectorFromArray(
      rows.map((row) => row[columnIndex] ?? null),
      new Utf8(),
    )
  }
  await engine.run(`DROP TABLE IF EXISTS ${stagingTableName}`)
  await engine.insertArrowIpc(stagingTableName, tableToIPC(new Table(vectors), 'stream'))
}

async function insertStagedRows(engine: SqlEngine, target: TargetTable): Promise<AppendOutcome> {
  const stagedColumns = target.columns.map((column, index) => ({ column, sql: `c${index}` }))
  const allConvertible = stagedColumns.map(({ column, sql }) => convertibleCheck(sql, column.type)).join(' AND ')
  const columnList = target.columns.map((column) => quoteIdentifier(column.name)).join(', ')
  const selectList = stagedColumns.map(({ column, sql }) => conversionExpression(sql, column.type)).join(', ')
  const failedRows = await engine.run(`SELECT line FROM ${stagingTableName} WHERE NOT (${allConvertible}) ORDER BY line`)
  const failedLines = failedRows.toArray().map((row) => Number(row.line))
  const failureMessages = failedLines.length > 0 ? ['value does not match the column type'] : []
  const insertSql = (filter: string) =>
    `INSERT INTO ${quoteIdentifier(target.name)} (${columnList}) SELECT ${selectList} FROM ${stagingTableName} WHERE ${filter}`
  try {
    const result = await engine.run(insertSql(`(${allConvertible})`))
    return { inserted: Number(result.getChildAt(0)?.get(0) ?? 0), failedLines, failureMessages }
  } catch {
    return insertRowByRow(engine, insertSql, allConvertible, failedLines, failureMessages)
  }
}

async function insertRowByRow(
  engine: SqlEngine,
  insertSql: (filter: string) => string,
  allConvertible: string,
  failedLines: number[],
  failureMessages: string[],
): Promise<AppendOutcome> {
  const candidates = await engine.run(`SELECT line FROM ${stagingTableName} WHERE ${allConvertible} ORDER BY line`)
  let inserted = 0
  const lines = [...failedLines]
  const messages = [...failureMessages]
  for (const row of candidates.toArray()) {
    const line = Number(row.line)
    try {
      await engine.run(insertSql(`line = ${line}`))
      inserted++
    } catch (error) {
      lines.push(line)
      messages.push(firstLine(error))
    }
  }
  return { inserted, failedLines: lines.sort((a, b) => a - b), failureMessages: [...new Set(messages)] }
}

function firstLine(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).split('\n')[0]
}
