import type { SqlEngine } from '../engine/sqlEngine'
import { uniqueColumnNames, uniqueTableName } from '../catalog/tableNames'
import type { LoadResult } from './loadResult'
import { writeValueTable } from './valueTableLoader'
import { readWorkbook, type CellValue } from './xlsx/readWorkbook'

export async function loadExcelWorkbook(
  engine: SqlEngine,
  baseName: string,
  bytes: Uint8Array,
  existingNames: readonly string[],
): Promise<LoadResult> {
  const result: LoadResult = { tables: [], warnings: [] }
  const taken = [...existingNames]
  for (const sheet of readWorkbook(bytes)) {
    const nonEmptyRows = sheet.rows.filter((row) => row.some((value) => value !== null && value !== ''))
    if (nonEmptyRows.length === 0) {
      result.warnings.push({ code: 'emptySheetSkipped', sheet: sheet.name })
      continue
    }
    const [header, ...body] = nonEmptyRows
    const width = maxRowWidth(nonEmptyRows)
    const columnNames = uniqueColumnNames(Array.from({ length: width }, (_, index) => headerText(header[index])))
    const tableName = uniqueTableName(`${baseName}_${sheet.name}`, taken)
    taken.push(tableName)
    const { failedLines } = await writeValueTable(engine, {
      name: tableName,
      columnNames,
      rows: body.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? null)),
    })
    if (failedLines.length > 0) result.warnings.push({ code: 'rowsNotLoaded', table: tableName, lines: failedLines })
    result.tables.push({ name: tableName, rowCount: body.length - failedLines.length })
  }
  return result
}

export function maxRowWidth(rows: readonly (readonly unknown[])[]): number {
  let width = 0
  for (const row of rows) if (row.length > width) width = row.length
  return width
}

function headerText(value: CellValue | undefined): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}
