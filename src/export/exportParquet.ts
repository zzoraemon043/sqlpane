import type { ColumnSource } from 'hyparquet-writer'
import { parquetWriteBuffer } from 'hyparquet-writer'
import type { QueryResult } from '../results/queryResult'
import { exportKindOf, plainValue, type ExportKind } from './exportValues'

const parquetTypes: Record<ExportKind, ColumnSource['type']> = {
  integer: 'DOUBLE',
  bigint: 'INT64',
  float: 'DOUBLE',
  boolean: 'BOOLEAN',
  timestamp: 'TIMESTAMP',
  date: 'TIMESTAMP',
  decimal: 'DOUBLE',
  text: 'STRING',
}

export function exportParquet(result: QueryResult, rows: ArrayLike<number>): Uint8Array {
  const columnData: ColumnSource[] = result.columns.map((column, columnIndex) => {
    const kind = integerKind(result, columnIndex)
    const data = Array.from({ length: rows.length }, (_, position) => plainValue(result, rows[position], columnIndex, exportKindOf(result, columnIndex)))
    return { name: column.name, data, type: kind === 'int32' ? 'INT32' : parquetTypes[exportKindOf(result, columnIndex)], nullable: true }
  })
  return new Uint8Array(parquetWriteBuffer({ columnData }))
}

function integerKind(result: QueryResult, columnIndex: number): 'int32' | 'other' {
  const type = result.table.schema.fields[columnIndex].type as { bitWidth?: number; isSigned?: boolean }
  return exportKindOf(result, columnIndex) === 'integer' && (type.bitWidth ?? 64) <= 32 && !(type.bitWidth === 32 && type.isSigned === false)
    ? 'int32'
    : 'other'
}
