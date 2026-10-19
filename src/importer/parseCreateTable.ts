import type { Dialect } from './dialect'
import { describe, readQualifiedName, TokenCursor } from './tokenCursor'
import type { Token } from './tokenizer'
import { mapType, type SourceType } from './typeMapping'

export interface ColumnDefinition {
  name: string
  sourceType: SourceType
  type: string
  notNull: boolean
}

export interface TableDefinition {
  qualifiedName: string[]
  columns: ColumnDefinition[]
  primaryKey: string[]
  skippedComputedColumns: string[]
}

const constraintStarters = new Set(['CONSTRAINT', 'PRIMARY', 'KEY', 'INDEX', 'UNIQUE', 'FOREIGN', 'CHECK', 'FULLTEXT', 'SPATIAL', 'PERIOD'])
const columnOptionStarters = new Set([
  'NOT', 'NULL', 'DEFAULT', 'PRIMARY', 'AUTO_INCREMENT', 'IDENTITY', 'COLLATE', 'CHARACTER', 'CHARSET', 'COMMENT', 'UNIQUE',
  'KEY', 'REFERENCES', 'CHECK', 'CONSTRAINT', 'GENERATED', 'AS', 'ON', 'ROWGUIDCOL', 'SPARSE', 'FILESTREAM', 'MASKED',
  'ENCRYPTED', 'STORAGE', 'COLUMN_FORMAT', 'INVISIBLE', 'VISIBLE', 'SRID', 'WITH', 'CLUSTERED', 'NONCLUSTERED',
])

const signModifiers = new Set(['UNSIGNED', 'SIGNED', 'ZEROFILL'])

export function isCreateTable(tokens: Token[]): boolean {
  const cursor = new TokenCursor(tokens)
  if (!cursor.acceptWord('CREATE')) return false
  cursor.acceptWord('TEMPORARY')
  return cursor.isWord('TABLE')
}

export function parseCreateTable(tokens: Token[], dialect: Dialect): TableDefinition {
  const cursor = new TokenCursor(tokens)
  cursor.acceptWord('CREATE')
  cursor.acceptWord('TEMPORARY')
  if (!cursor.acceptWord('TABLE')) throw new Error('expected CREATE TABLE')
  if (cursor.isWord('IF')) {
    cursor.acceptWord('IF')
    cursor.acceptWord('NOT')
    cursor.acceptWord('EXISTS')
  }
  const qualifiedName = readQualifiedName(cursor)
  if (cursor.isWord('LIKE') || cursor.isWord('AS') || cursor.isWord('SELECT')) throw new Error('CREATE TABLE without column definitions is not supported')
  cursor.expectSymbol('(')
  const definition: TableDefinition = { qualifiedName, columns: [], primaryKey: [], skippedComputedColumns: [] }
  for (const element of splitTopLevel(cursor)) parseElement(element, definition, dialect)
  if (definition.columns.length === 0) throw new Error('the table has no columns')
  const keyColumns = new Set(definition.primaryKey.map((name) => name.toLowerCase()))
  definition.columns = definition.columns.map((column) => (keyColumns.has(column.name.toLowerCase()) ? { ...column, notNull: true } : column))
  return definition
}

function splitTopLevel(cursor: TokenCursor): Token[][] {
  const elements: Token[][] = []
  let current: Token[] = []
  let depth = 0
  while (!cursor.atEnd()) {
    const token = cursor.next()!
    if (token.kind === 'symbol' && token.text === '(') depth++
    if (token.kind === 'symbol' && token.text === ')') {
      if (depth === 0) {
        if (current.length > 0) elements.push(current)
        return elements
      }
      depth--
    }
    if (token.kind === 'symbol' && token.text === ',' && depth === 0) {
      elements.push(current)
      current = []
      continue
    }
    current.push(token)
  }
  throw new Error('missing closing parenthesis in CREATE TABLE')
}

function parseElement(tokens: Token[], definition: TableDefinition, dialect: Dialect) {
  const first = tokens[0]
  if (!first) return
  if (first.kind === 'word' && constraintStarters.has(first.upper)) {
    const primaryKey = readPrimaryKeyConstraint(tokens)
    if (primaryKey) definition.primaryKey = primaryKey
    return
  }
  const cursor = new TokenCursor(tokens)
  const nameToken = cursor.next()!
  if (nameToken.kind !== 'word' && nameToken.kind !== 'name') throw new Error(`expected a column name near ${describe(nameToken)}`)
  if (cursor.isWord('AS')) {
    definition.skippedComputedColumns.push(nameToken.text)
    return
  }
  const sourceType = readSourceType(cursor)
  const options = readColumnOptions(cursor)
  definition.columns.push({ name: nameToken.text, sourceType, type: mapType(sourceType, dialect), notNull: options.notNull })
  if (options.primaryKey) definition.primaryKey = [nameToken.text]
}

function readPrimaryKeyConstraint(tokens: Token[]): string[] | undefined {
  const cursor = new TokenCursor(tokens)
  while (!cursor.atEnd() && !(cursor.isWord('PRIMARY') && cursor.isWord('KEY', 1))) cursor.next()
  if (cursor.atEnd()) return undefined
  cursor.next()
  cursor.next()
  while (!cursor.atEnd() && !cursor.isSymbol('(')) cursor.next()
  if (!cursor.acceptSymbol('(')) return undefined
  const names: string[] = []
  while (!cursor.atEnd() && !cursor.isSymbol(')')) {
    const token = cursor.next()!
    if (token.kind === 'word' || token.kind === 'name') {
      if (token.kind === 'word' && (token.upper === 'ASC' || token.upper === 'DESC')) continue
      names.push(token.text)
      if (cursor.isSymbol('(')) cursor.skipBalanced()
    }
  }
  return names
}

function readSourceType(cursor: TokenCursor): SourceType {
  const nameParts: string[] = []
  while (!cursor.atEnd()) {
    const token = cursor.peek()!
    if (token.kind === 'word' && columnOptionStarters.has(token.upper) && nameParts.length > 0) break
    if (token.kind !== 'word' && token.kind !== 'name') break
    if (token.kind === 'word' && signModifiers.has(token.upper)) break
    cursor.next()
    if (cursor.acceptSymbol('.')) {
      nameParts.length = 0
      continue
    }
    nameParts.push(token.text)
  }
  if (nameParts.length === 0) return { name: 'VARCHAR', args: [], unsigned: false }
  const args = cursor.isSymbol('(') ? readTypeArguments(cursor) : []
  let unsigned = false
  for (let token = cursor.peek(); token?.kind === 'word' && signModifiers.has(token.upper); token = cursor.peek()) {
    if (token.upper === 'UNSIGNED') unsigned = true
    cursor.next()
  }
  return { name: nameParts.join(' '), args, unsigned }
}

function readTypeArguments(cursor: TokenCursor): string[] {
  cursor.expectSymbol('(')
  const args: string[] = []
  while (!cursor.atEnd() && !cursor.isSymbol(')')) {
    const token = cursor.next()!
    if (token.kind === 'number' || token.kind === 'word') args.push(token.text)
    else if (token.kind === 'string') args.push(`'${token.text}'`)
  }
  cursor.expectSymbol(')')
  return args
}

function readColumnOptions(cursor: TokenCursor): { notNull: boolean; primaryKey: boolean } {
  let notNull = false
  let primaryKey = false
  while (!cursor.atEnd()) {
    if (cursor.isWord('NOT') && cursor.isWord('NULL', 1)) {
      notNull = true
      cursor.position += 2
      continue
    }
    if (cursor.isWord('PRIMARY') && cursor.isWord('KEY', 1)) {
      primaryKey = true
      cursor.position += 2
      continue
    }
    cursor.skipBalanced()
  }
  return { notNull, primaryKey }
}
