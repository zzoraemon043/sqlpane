import { parseValue, type SqlValue } from './sqlValue'
import { describe, readQualifiedName, TokenCursor } from './tokenCursor'
import type { Token } from './tokenizer'

export type ParsedRow = { line: number; values: SqlValue[] } | { line: number; error: string }

export interface InsertStatement {
  qualifiedName: string[]
  columns?: string[]
  rows: ParsedRow[]
}

const insertModifiers = new Set(['LOW_PRIORITY', 'DELAYED', 'HIGH_PRIORITY', 'IGNORE'])

export function isInsert(tokens: Token[]): boolean {
  const first = tokens[0]
  return first?.kind === 'word' && (first.upper === 'INSERT' || first.upper === 'REPLACE')
}

export function parseInsert(tokens: Token[]): InsertStatement {
  const cursor = new TokenCursor(tokens)
  cursor.next()
  while (cursor.peek()?.kind === 'word' && insertModifiers.has((cursor.peek() as { upper: string }).upper)) cursor.next()
  cursor.acceptWord('INTO')
  const qualifiedName = readQualifiedName(cursor)
  if (cursor.isWord('WITH')) {
    cursor.next()
    cursor.skipBalanced()
  }
  const columns = cursor.isSymbol('(') ? readColumnList(cursor) : undefined
  if (!cursor.acceptWord('VALUES') && !cursor.acceptWord('VALUE')) {
    throw new Error(`only INSERT ... VALUES is supported, found ${describe(cursor.peek())}`)
  }
  const rows: ParsedRow[] = []
  do {
    rows.push(readRow(cursor))
  } while (cursor.acceptSymbol(','))
  return { qualifiedName, columns, rows }
}

function readColumnList(cursor: TokenCursor): string[] {
  cursor.expectSymbol('(')
  const names: string[] = []
  do {
    const token = cursor.next()
    if (!token || (token.kind !== 'word' && token.kind !== 'name')) throw new Error(`expected a column name near ${describe(token)}`)
    names.push(token.text)
  } while (cursor.acceptSymbol(','))
  cursor.expectSymbol(')')
  return names
}

function readRow(cursor: TokenCursor): ParsedRow {
  const line = cursor.currentLine()
  const start = cursor.position
  if (!cursor.isSymbol('(')) throw new Error(`expected "(" near ${describe(cursor.peek())}`)
  cursor.next()
  const values: SqlValue[] = []
  try {
    if (!cursor.isSymbol(')')) {
      do {
        values.push(parseValue(cursor))
      } while (cursor.acceptSymbol(','))
    }
    cursor.expectSymbol(')')
    return { line, values }
  } catch (error) {
    cursor.position = start
    cursor.skipBalanced()
    return { line, error: error instanceof Error ? error.message : String(error) }
  }
}
