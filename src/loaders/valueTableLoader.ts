import type { SqlEngine } from '../engine/sqlEngine'
import { inferColumnType, valueToText } from './columnTypes'
import { appendTextRows, createTable, type TargetTable } from './textRowWriter'

const rowsPerBatch = 5000

export interface ValueTable {
  name: string
  columnNames: string[]
  rows: unknown[][]
}

export async function writeValueTable(engine: SqlEngine, source: ValueTable): Promise<{ failedLines: number[] }> {
  const target: TargetTable = {
    name: source.name,
    columns: source.columnNames.map((name, index) => ({
      name,
      type: inferColumnType(source.rows.map((row) => row[index])),
    })),
  }
  await createTable(engine, target)
  const failedLines: number[] = []
  for (let start = 0; start < source.rows.length; start += rowsPerBatch) {
    const slice = source.rows.slice(start, start + rowsPerBatch)
    const outcome = await appendTextRows(engine, target, {
      rows: slice.map((row) => target.columns.map((column, index) => valueToText(row[index], column.type))),
      lineNumbers: slice.map((_, index) => start + index + 1),
    })
    failedLines.push(...outcome.failedLines)
  }
  return { failedLines }
}
