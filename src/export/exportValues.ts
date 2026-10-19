import { DataType } from 'apache-arrow'
import { cellText, cellValue, type QueryResult } from '../results/queryResult'

export type ExportKind = 'integer' | 'bigint' | 'float' | 'boolean' | 'timestamp' | 'date' | 'decimal' | 'text'

export function exportKindOf(result: QueryResult, columnIndex: number): ExportKind {
  const type = result.table.schema.fields[columnIndex].type
  if (DataType.isInt(type)) return type.bitWidth === 64 ? 'bigint' : 'integer'
  if (DataType.isFloat(type)) return 'float'
  if (DataType.isBool(type)) return 'boolean'
  if (DataType.isTimestamp(type)) return 'timestamp'
  if (DataType.isDate(type)) return 'date'
  if (DataType.isDecimal(type)) return 'decimal'
  return 'text'
}

export type PlainValue = string | number | bigint | boolean | Date | null

export function plainValue(result: QueryResult, rowIndex: number, columnIndex: number, kind: ExportKind): PlainValue {
  const raw = cellValue(result, rowIndex, columnIndex)
  if (raw === null || raw === undefined) return null
  switch (kind) {
    case 'integer':
    case 'float':
      return Number(raw)
    case 'bigint':
      return BigInt(raw as bigint)
    case 'boolean':
      return Boolean(raw)
    case 'timestamp':
    case 'date':
      return new Date(Number(raw))
    case 'decimal':
      return Number(cellText(result, rowIndex, columnIndex))
    case 'text':
      return cellText(result, rowIndex, columnIndex)
  }
}
