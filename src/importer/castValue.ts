import type { SqlEngine } from '../engine/sqlEngine'
import { quoteLiteral } from '../engine/sqlText'
import type { Dialect } from './dialect'
import { UnsupportedValueError, type CastValue, type SqlValue } from './sqlValue'

const integerTypes = new Map([
  ['TINYINT', 'UTINYINT'], ['SMALLINT', 'SMALLINT'], ['INT', 'INTEGER'], ['INTEGER', 'INTEGER'], ['BIGINT', 'BIGINT'],
])
const temporalTypes = new Map([
  ['DATE', 'DATE'], ['DATETIME', 'TIMESTAMP'], ['DATETIME2', 'TIMESTAMP'], ['SMALLDATETIME', 'TIMESTAMP'], ['TIME', 'TIME'],
])

interface CastExpression {
  sql: string
  kind: 'integer' | 'decimal' | 'string'
}

export async function evaluateCast(engine: SqlEngine, value: CastValue, dialect: Dialect): Promise<Exclude<SqlValue, CastValue>> {
  const { sql, kind } = castExpression(value, dialect)
  const result = await engine.run(`SELECT CAST(${sql} AS VARCHAR) AS value`)
  const text = result.getChildAt(0)?.get(0)
  if (text === null || text === undefined) return { kind: 'null' }
  return kind === 'string' ? { kind, text: String(text), binary: false } : { kind: 'number', text: String(text) }
}

function castExpression(value: CastValue, dialect: Dialect): CastExpression {
  const { operand, type, args } = value
  const input = operandExpression(operand, dialect)
  const integer = dialect === 'sqlserver' ? integerTypes.get(type) : type === 'SIGNED' ? 'BIGINT' : type === 'UNSIGNED' ? 'UBIGINT' : undefined
  if (integer && args.length === 0) {
    if (dialect === 'sqlserver' && operand.kind === 'string' && !/^[+-]?\d+$/.test(operand.text.trim())) {
      throw new UnsupportedValueError(`invalid value for CAST AS ${type}`)
    }
    const expression = dialect === 'sqlserver' && input.kind === 'decimal' ? `TRUNC(${input.sql})` : input.sql
    return { sql: `CAST(${expression} AS ${integer})`, kind: 'integer' }
  }
  if ((type === 'DECIMAL' || type === 'NUMERIC') && args.length <= 2) {
    const [precision = dialect === 'sqlserver' ? 18 : 10, scale = 0] = args
    if (precision >= 1 && precision <= 38 && scale <= precision) {
      return { sql: `CAST(${input.sql} AS DECIMAL(${precision},${scale}))`, kind: 'decimal' }
    }
  }
  const temporal = temporalTypes.get(type)
  if (temporal && args.length === 0 && input.kind === 'string') {
    return { sql: `CAST(${input.sql} AS ${temporal})`, kind: 'string' }
  }
  throw new UnsupportedValueError(`unsupported CAST AS ${type}`)
}

function operandExpression(value: SqlValue, dialect: Dialect): CastExpression {
  switch (value.kind) {
    case 'cast': return castExpression(value, dialect)
    case 'null': return { sql: 'NULL', kind: 'string' }
    case 'number': return { sql: value.text, kind: /^[+-]?\d+$/.test(value.text) ? 'integer' : 'decimal' }
    case 'string': return { sql: quoteLiteral(value.text), kind: 'string' }
    default: throw new UnsupportedValueError(`unsupported ${value.kind} operand in CAST`)
  }
}
