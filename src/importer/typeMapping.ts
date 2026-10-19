import type { Dialect } from './dialect'

export interface SourceType {
  name: string
  args: string[]
  unsigned: boolean
}

export function describeSourceType(type: SourceType): string {
  const args = type.args.length > 0 ? `(${type.args.join(',')})` : ''
  return `${type.name}${args}${type.unsigned ? ' UNSIGNED' : ''}`
}

export function mapType(type: SourceType, dialect: Dialect): string {
  const name = type.name.toUpperCase().replace(/\s+/g, ' ')
  const mapped = dialect === 'mysql' ? mapMySqlType(name, type) : mapSqlServerType(name, type)
  return mapped ?? mapCommonType(name, type) ?? 'VARCHAR'
}

function numberArg(type: SourceType, index: number): number | undefined {
  const value = Number(type.args[index])
  return Number.isFinite(value) ? value : undefined
}

function decimalType(type: SourceType, defaultPrecision: number): string {
  const precision = numberArg(type, 0) ?? defaultPrecision
  const scale = numberArg(type, 1) ?? 0
  if (precision > 38) return 'DOUBLE'
  return `DECIMAL(${Math.max(precision, 1)},${Math.min(scale, precision)})`
}

function mapMySqlType(name: string, type: SourceType): string | undefined {
  switch (name) {
    case 'TINYINT':
      if (type.unsigned) return 'UTINYINT'
      return type.args[0] === '1' ? 'BOOLEAN' : 'TINYINT'
    case 'BOOL':
    case 'BOOLEAN':
      return 'BOOLEAN'
    case 'SMALLINT':
      return type.unsigned ? 'USMALLINT' : 'SMALLINT'
    case 'MEDIUMINT':
    case 'INT':
    case 'INTEGER':
      return type.unsigned ? 'UINTEGER' : 'INTEGER'
    case 'BIGINT':
      return type.unsigned ? 'UBIGINT' : 'BIGINT'
    case 'SERIAL':
      return 'UBIGINT'
    case 'DECIMAL':
    case 'NUMERIC':
    case 'DEC':
    case 'FIXED':
      return decimalType(type, 10)
    case 'FLOAT':
      return (numberArg(type, 0) ?? 0) > 24 ? 'DOUBLE' : 'REAL'
    case 'DOUBLE':
    case 'DOUBLE PRECISION':
    case 'REAL':
      return 'DOUBLE'
    case 'BIT':
      return (numberArg(type, 0) ?? 1) === 1 ? 'BOOLEAN' : 'UBIGINT'
    case 'YEAR':
      return 'SMALLINT'
    case 'TIMESTAMP':
    case 'DATETIME':
      return 'TIMESTAMP'
    case 'ENUM':
    case 'SET':
    case 'JSON':
    case 'TINYTEXT':
    case 'MEDIUMTEXT':
    case 'LONGTEXT':
      return 'VARCHAR'
    case 'TINYBLOB':
    case 'MEDIUMBLOB':
    case 'LONGBLOB':
    case 'GEOMETRY':
    case 'POINT':
    case 'LINESTRING':
    case 'POLYGON':
    case 'MULTIPOINT':
    case 'MULTILINESTRING':
    case 'MULTIPOLYGON':
    case 'GEOMETRYCOLLECTION':
      return 'BLOB'
    default:
      return undefined
  }
}

function mapSqlServerType(name: string, type: SourceType): string | undefined {
  switch (name) {
    case 'BIT':
      return 'BOOLEAN'
    case 'TINYINT':
      return 'UTINYINT'
    case 'SMALLINT':
      return 'SMALLINT'
    case 'INT':
    case 'INTEGER':
      return 'INTEGER'
    case 'BIGINT':
      return 'BIGINT'
    case 'DECIMAL':
    case 'NUMERIC':
      return decimalType(type, 18)
    case 'MONEY':
      return 'DECIMAL(19,4)'
    case 'SMALLMONEY':
      return 'DECIMAL(10,4)'
    case 'FLOAT':
      return (numberArg(type, 0) ?? 53) <= 24 ? 'REAL' : 'DOUBLE'
    case 'REAL':
      return 'REAL'
    case 'DATETIME':
    case 'DATETIME2':
    case 'SMALLDATETIME':
      return 'TIMESTAMP'
    case 'DATETIMEOFFSET':
      return 'TIMESTAMPTZ'
    case 'UNIQUEIDENTIFIER':
      return 'UUID'
    case 'TIMESTAMP':
    case 'ROWVERSION':
    case 'IMAGE':
    case 'HIERARCHYID':
    case 'GEOGRAPHY':
    case 'GEOMETRY':
      return 'BLOB'
    case 'NTEXT':
    case 'XML':
    case 'SYSNAME':
    case 'SQL_VARIANT':
      return 'VARCHAR'
    default:
      return undefined
  }
}

function mapCommonType(name: string, type: SourceType): string | undefined {
  if (['CHAR', 'VARCHAR', 'NCHAR', 'NVARCHAR', 'TEXT', 'CHARACTER', 'CHARACTER VARYING', 'NATIONAL CHAR', 'NATIONAL VARCHAR', 'NATIONAL CHARACTER', 'NATIONAL CHARACTER VARYING', 'CHAR VARYING', 'STRING'].includes(name)) return 'VARCHAR'
  if (['BINARY', 'VARBINARY', 'BLOB', 'BINARY VARYING'].includes(name)) return 'BLOB'
  if (name === 'DATE') return 'DATE'
  if (name === 'TIME') return 'TIME'
  if (name === 'SMALLINT') return 'SMALLINT'
  if (name === 'BIGINT') return 'BIGINT'
  if (name === 'BOOLEAN') return 'BOOLEAN'
  if (name === 'DOUBLE' || name === 'DOUBLE PRECISION') return 'DOUBLE'
  if (name === 'DECIMAL' || name === 'NUMERIC') return decimalType(type, 18)
  return undefined
}
