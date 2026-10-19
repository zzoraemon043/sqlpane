import { uniqueTableName } from '../catalog/tableNames'
import type { SqlEngine } from '../engine/sqlEngine'
import { appendTextRows, createTable, type TargetTable } from '../loaders/textRowWriter'
import { previewOf, statementKind, unwrapConditionalComment } from './classifyStatement'
import { detectDialect, type Dialect } from './dialect'
import { ImportReportBuilder, type ImportProgress, type ImportReport } from './importReport'
import { isCreateTable, parseCreateTable, type TableDefinition } from './parseCreateTable'
import { isInsert, parseInsert, type InsertStatement } from './parseInsert'
import type { TextChunk } from './scriptChunks'
import { StatementSplitter, type SplitEvent } from './statementSplitter'
import { tokenize, TokenizeError } from './tokenizer'
import { valueToColumnText } from './valueText'

export interface ImportOptions {
  dialect?: Dialect
  totalBytes?: number
  existingTableNames?: readonly string[]
  batchRows?: number
  onProgress?: (progress: ImportProgress) => void
  yieldToUi?: () => Promise<void>
}

interface ImportedTableState {
  target: TargetTable
  sourceName: string
  rowCount: number
}

interface PendingBatch {
  table: ImportedTableState
  target: TargetTable
  rows: (string | null)[][]
  lines: number[]
}

export async function importScript(engine: SqlEngine, chunks: AsyncIterable<TextChunk>, options: ImportOptions = {}): Promise<ImportReport> {
  const importer = new ScriptImporter(engine, options)
  return importer.run(chunks)
}

class ScriptImporter {
  private readonly engine: SqlEngine
  private readonly options: ImportOptions
  private readonly batchRows: number
  private readonly tables = new Map<string, ImportedTableState>()
  private readonly pending = new Map<string, PendingBatch>()
  private readonly takenNames: string[]
  private builder!: ImportReportBuilder
  private dialect!: Dialect
  private progress: ImportProgress = { bytesRead: 0, statements: 0, rowsInserted: 0 }
  private lastYield = 0

  constructor(engine: SqlEngine, options: ImportOptions) {
    this.engine = engine
    this.options = options
    this.batchRows = options.batchRows ?? 2000
    this.takenNames = [...(options.existingTableNames ?? [])]
    this.progress.totalBytes = options.totalBytes
  }

  async run(chunks: AsyncIterable<TextChunk>): Promise<ImportReport> {
    let splitter: StatementSplitter | undefined
    for await (const chunk of chunks) {
      if (!splitter) {
        this.dialect = this.options.dialect ?? detectDialect(chunk.text.slice(0, 65536))
        this.builder = new ImportReportBuilder(this.dialect)
        splitter = new StatementSplitter(this.dialect)
      }
      await this.handleEvents(splitter.push(chunk.text))
      this.progress.bytesRead += chunk.bytes
      await this.reportProgress()
    }
    if (!splitter) {
      this.dialect = this.options.dialect ?? 'mysql'
      this.builder = new ImportReportBuilder(this.dialect)
      splitter = new StatementSplitter(this.dialect)
    }
    await this.handleEvents(splitter.finish())
    await this.flushAll()
    this.options.onProgress?.({ ...this.progress })
    return this.finalReport()
  }

  private finalReport(): ImportReport {
    const report = this.builder.report
    report.tables = [...this.tables.values()].map((table) => ({ name: table.target.name, sourceName: table.sourceName, rowCount: table.rowCount }))
    if (report.zeroDatesAsNull > 0) this.builder.warn(`zero dates stored as NULL: ${report.zeroDatesAsNull}`)
    return report
  }

  private async reportProgress() {
    this.options.onProgress?.({ ...this.progress })
    const now = Date.now()
    if (now - this.lastYield > 50) {
      this.lastYield = now
      await (this.options.yieldToUi?.() ?? Promise.resolve())
    }
  }

  private async handleEvents(events: SplitEvent[]) {
    for (const event of events) {
      if (event.type === 'separator') {
        this.builder.skip({ line: event.line, kind: event.text.split(/\s+/)[0].toUpperCase(), preview: event.text })
        continue
      }
      this.progress.statements++
      await this.handleStatement(event.text, event.line)
    }
  }

  private async handleStatement(rawText: string, line: number) {
    const text = unwrapConditionalComment(rawText)
    let tokens
    try {
      tokens = tokenize(text, this.dialect)
    } catch (error) {
      const offset = error instanceof TokenizeError ? error.line : 0
      this.builder.failStatement({ line: line + offset, preview: previewOf(text), reason: messageOf(error) })
      return
    }
    try {
      if (isCreateTable(tokens)) await this.createTable(parseCreateTable(tokens, this.dialect), line)
      else if (isInsert(tokens)) await this.insert(parseInsert(tokens), line)
      else this.builder.skip({ line, kind: statementKind(tokens), preview: previewOf(text) })
    } catch (error) {
      this.builder.failStatement({ line, preview: previewOf(text), reason: messageOf(error) })
    }
  }

  private async createTable(definition: TableDefinition, line: number) {
    const sourceName = definition.qualifiedName[definition.qualifiedName.length - 1]
    const key = sourceName.toLowerCase()
    if (this.tables.has(key)) {
      this.builder.skip({ line, kind: 'CREATE TABLE', preview: `${sourceName} (already created)` })
      return
    }
    const name = uniqueTableName(sourceName, this.takenNames)
    const target: TargetTable = { name, columns: definition.columns, primaryKey: definition.primaryKey }
    await createTable(this.engine, target)
    this.takenNames.push(name)
    this.tables.set(key, { target, sourceName, rowCount: 0 })
    if (definition.skippedComputedColumns.length > 0) {
      this.builder.warn(`${name}: computed columns not imported: ${definition.skippedComputedColumns.join(', ')}`)
    }
  }

  private async insert(statement: InsertStatement, line: number) {
    const table = await this.tableForInsert(statement, line)
    const target = this.targetForColumns(table, statement.columns)
    const key = `${table.target.name}\u0000${target.columns.map((column) => column.name).join('\u0001')}`
    const batch = this.pending.get(key) ?? { table, target, rows: [], lines: [] }
    this.pending.set(key, batch)
    for (const row of statement.rows) {
      const rowLine = line + row.line
      if ('error' in row) {
        this.builder.failRow({ line: rowLine, table: table.target.name, reason: row.error })
        continue
      }
      if (row.values.length !== target.columns.length) {
        this.builder.failRow({ line: rowLine, table: table.target.name, reason: `expected ${target.columns.length} values, found ${row.values.length}` })
        continue
      }
      batch.rows.push(row.values.map((value, index) => this.columnText(value, target.columns[index].type)))
      batch.lines.push(rowLine)
    }
    if (batch.rows.length >= this.batchRows) await this.flush(key)
  }

  private columnText(value: Parameters<typeof valueToColumnText>[0], type: string): string | null {
    const result = valueToColumnText(value, type)
    if (result.zeroDate) this.builder.report.zeroDatesAsNull++
    return result.text
  }

  private async tableForInsert(statement: InsertStatement, line: number): Promise<ImportedTableState> {
    const sourceName = statement.qualifiedName[statement.qualifiedName.length - 1]
    const existing = this.tables.get(sourceName.toLowerCase())
    if (existing) return existing
    if (!statement.columns) throw new Error(`table ${sourceName} was not created in this script and the INSERT has no column list`)
    await this.createTable(
      { qualifiedName: [sourceName], columns: statement.columns.map((name) => ({ name, sourceType: { name: 'TEXT', args: [], unsigned: false }, type: 'VARCHAR', notNull: false })), primaryKey: [], skippedComputedColumns: [] },
      line,
    )
    this.builder.warn(`${sourceName}: created with text columns because the script has no CREATE TABLE for it`)
    return this.tables.get(sourceName.toLowerCase())!
  }

  private targetForColumns(table: ImportedTableState, columns: string[] | undefined): TargetTable {
    if (!columns) return table.target
    const byName = new Map(table.target.columns.map((column) => [column.name.toLowerCase(), column]))
    const selected = columns.map((name) => {
      const column = byName.get(name.toLowerCase())
      if (!column) throw new Error(`unknown column ${name} in table ${table.target.name}`)
      return column
    })
    return { name: table.target.name, columns: selected }
  }

  private async flush(key: string) {
    const batch = this.pending.get(key)
    if (!batch || batch.rows.length === 0) return
    this.pending.delete(key)
    const outcome = await appendTextRows(this.engine, batch.target, { rows: batch.rows, lineNumbers: batch.lines })
    batch.table.rowCount += outcome.inserted
    this.progress.rowsInserted += outcome.inserted
    const reason = outcome.failureMessages.join('; ') || 'value does not match the column type'
    for (const failedLine of outcome.failedLines) this.builder.failRow({ line: failedLine, table: batch.target.name, reason })
  }

  private async flushAll() {
    for (const key of [...this.pending.keys()]) await this.flush(key)
  }
}

function messageOf(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).split('\n')[0]
}
