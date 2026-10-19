import type { Dialect } from './dialect'

export interface SkippedStatement {
  line: number
  kind: string
  preview: string
}

export interface FailedRow {
  line: number
  table: string
  reason: string
}

export interface FailedStatement {
  line: number
  preview: string
  reason: string
}

export interface ImportedTable {
  name: string
  sourceName: string
  rowCount: number
}

export interface ImportReport {
  dialect: Dialect
  tables: ImportedTable[]
  skipped: SkippedStatement[]
  skippedTotal: number
  skippedByKind: Record<string, number>
  failedRows: FailedRow[]
  failedRowTotal: number
  failedStatements: FailedStatement[]
  warnings: string[]
  zeroDatesAsNull: number
}

export interface ImportProgress {
  bytesRead: number
  totalBytes?: number
  statements: number
  rowsInserted: number
}

export const reportListLimit = 1000

export class ImportReportBuilder {
  readonly report: ImportReport

  constructor(dialect: Dialect) {
    this.report = {
      dialect,
      tables: [],
      skipped: [],
      skippedTotal: 0,
      skippedByKind: {},
      failedRows: [],
      failedRowTotal: 0,
      failedStatements: [],
      warnings: [],
      zeroDatesAsNull: 0,
    }
  }

  skip(entry: SkippedStatement) {
    this.report.skippedTotal++
    this.report.skippedByKind[entry.kind] = (this.report.skippedByKind[entry.kind] ?? 0) + 1
    if (this.report.skipped.length < reportListLimit) this.report.skipped.push(entry)
  }

  failRow(entry: FailedRow) {
    this.report.failedRowTotal++
    if (this.report.failedRows.length < reportListLimit) this.report.failedRows.push(entry)
  }

  failStatement(entry: FailedStatement) {
    if (this.report.failedStatements.length < reportListLimit) this.report.failedStatements.push(entry)
  }

  warn(message: string) {
    if (!this.report.warnings.includes(message)) this.report.warnings.push(message)
  }
}
