import { DataType } from 'apache-arrow'
import { parquetWriteBuffer, schemaFromColumnData, type ColumnSource, type SchemaElement } from 'hyparquet-writer'
import type { QueryResult } from '../results/queryResult'
import { exportKindOf, plainValue, type ExportKind } from './exportValues'

const parquetTypes: Record<ExportKind, ColumnSource['type']> = {
  integer: 'DOUBLE',
  bigint: 'INT64',
  float: 'DOUBLE',
  boolean: 'BOOLEAN',
  timestamp: 'TIMESTAMP',
  date: 'TIMESTAMP',
  decimal: 'INT64',
  text: 'STRING',
}

export function exportParquet(result: QueryResult, rows: ArrayLike<number>): Uint8Array {
  const columnData: ColumnSource[] = result.columns.map((column, columnIndex) => {
    const kind = exportKindOf(result, columnIndex)
    const arrowType = result.table.schema.fields[columnIndex].type
    const data = Array.from({ length: rows.length }, (_, position) => {
      const value = plainValue(result, rows[position], columnIndex, kind)
      if (typeof value !== 'string') return value
      if (kind === 'decimal') return BigInt(value.replace('.', ''))
      return kind === 'date' || kind === 'timestamp' ? null : value
    })
    const type = DataType.isInt(arrowType) && (arrowType.bitWidth < 32 || arrowType.bitWidth === 32 && arrowType.isSigned)
      ? 'INT32'
      : parquetTypes[kind]
    return { name: column.name, data, type, nullable: true }
  })
  const schema = schemaFromColumnData({ columnData }).map((field, index) =>
    index === 0 ? field : annotateField(field, result.table.schema.fields[index - 1].type),
  )
  return new Uint8Array(parquetWriteBuffer({ schema, columnData: columnData.map(({ name, data }) => ({ name, data })) }))
}

function annotateField(field: SchemaElement, arrowType: DataType): SchemaElement {
  if (DataType.isInt(arrowType) && arrowType.bitWidth === 64 && !arrowType.isSigned) {
    return { ...field, converted_type: 'UINT_64', logical_type: { type: 'INTEGER', bitWidth: 64, isSigned: false } }
  }
  if (DataType.isDecimal(arrowType)) {
    const { precision, scale } = arrowType
    const storage: Partial<SchemaElement> = precision <= 9 ? { type: 'INT32' }
      : precision <= 18 ? { type: 'INT64' }
      : { type: 'FIXED_LEN_BYTE_ARRAY', type_length: arrowType.bitWidth / 8 }
    return { ...field, ...storage, converted_type: 'DECIMAL', logical_type: { type: 'DECIMAL', precision, scale }, precision, scale }
  }
  return field
}
