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
    const width = Math.max(...nonEmptyRows.map((row) => row.length))
    const columnNames = uniqueColumnNames(Array.from({ length: width }, (_, index) => headerText(header[index])))
    const tableName = uniqueTableName(`${baseName}_${sheet.name}`, taken)
    taken.push(tableName)
    await writeValueTable(engine, {
      name: tableName,
      columnNames,
      rows: body.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? null)),
    })
    result.tables.push({ name: tableName, rowCount: body.length })
  }
  return result
}

function headerText(value: CellValue | undefined): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}
