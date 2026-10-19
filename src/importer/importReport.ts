import type { Dialect } from './dialect'
import { noticeKey, type Notice } from '../loaders/notice'

export interface SkippedStatement {
  line: number
  kind: string
  preview: string
}

export interface FailedRow {
  line: number
  table: string
  reason: Notice
}

export interface FailedStatement {
  line: number
  preview: string
  reason: Notice
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
  warnings: Notice[]
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

  warn(notice: Notice) {
    if (!this.report.warnings.some((existing) => noticeKey(existing) === noticeKey(notice))) this.report.warnings.push(notice)
  }
}
