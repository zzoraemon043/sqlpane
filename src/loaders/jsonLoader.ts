import type { SqlEngine } from '../engine/sqlEngine'
import { looksLikeJsonLines, parseJsonDocument, parseJsonLines, recordsToRows } from './jsonRecords'
import type { LoadResult } from './loadResult'
import { writeValueTable } from './valueTableLoader'

export type JsonLayout = 'document' | 'lines' | 'auto'

export async function loadJsonText(
  engine: SqlEngine,
  tableName: string,
  text: string,
  layout: JsonLayout,
): Promise<LoadResult> {
  const useLines = layout === 'lines' || (layout === 'auto' && looksLikeJsonLines(text))
  const records = useLines ? parseJsonLines(text) : parseJsonDocument(text)
  const { columnNames, rows } = recordsToRows(records)
  if (columnNames.length === 0) throw new Error('the JSON file has no records')
  const { failedLines } = await writeValueTable(engine, { name: tableName, columnNames, rows })
  return {
    tables: [{ name: tableName, rowCount: rows.length - failedLines.length }],
    warnings: failedLines.length > 0 ? [`skipped records: ${failedLines.join(', ')}`] : [],
  }
}
