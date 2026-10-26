import { describe, TokenCursor } from './tokenCursor'

export type SqlValue =
  | { kind: 'null' }
  | { kind: 'string'; text: string; binary: boolean }
  | { kind: 'number'; text: string }
  | { kind: 'hex'; hex: string; castType?: string }
  | { kind: 'bits'; bits: string }
  | { kind: 'boolean'; value: boolean }

export class UnsupportedValueError extends Error {}

export function parseValue(cursor: TokenCursor): SqlValue {
  const value = parseOperand(cursor)
  const following = cursor.peek()
  if (following && !(following.kind === 'symbol' && (following.text === ',' || following.text === ')'))) {
    throw new UnsupportedValueError(`unsupported expression near ${describe(following)}`)
  }
  return value
}

function parseOperand(cursor: TokenCursor): SqlValue {
  const token = cursor.next()
  if (!token) throw new UnsupportedValueError('missing value')
  switch (token.kind) {
    case 'string':
      return { kind: 'string', text: token.text, binary: false }
    case 'number':
      return { kind: 'number', text: token.text }
    case 'hex':
      return { kind: 'hex', hex: token.hex }
    case 'bits':
      return { kind: 'bits', bits: token.bits }
    case 'symbol':
      return parseSymbolOperand(cursor, token.text)
    case 'word':
      return parseWordOperand(cursor, token.upper)
    case 'name':
      throw new UnsupportedValueError(`unsupported value ${describe(token)}`)
  }
}

function parseSymbolOperand(cursor: TokenCursor, symbol: string): SqlValue {
  if (symbol === '-' || symbol === '+') {
    const operand = parseOperand(cursor)
    if (operand.kind !== 'number') throw new UnsupportedValueError('unsupported signed value')
    return symbol === '-' ? { kind: 'number', text: negate(operand.text) } : operand
  }
  if (symbol === '(') {
    const inner = parseOperand(cursor)
    cursor.expectSymbol(')')
    return inner
  }
  throw new UnsupportedValueError(`unsupported value "${symbol}"`)
}

function negate(text: string): string {
  return text.startsWith('-') ? text.slice(1) : `-${text}`
}

function parseWordOperand(cursor: TokenCursor, word: string): SqlValue {
  if (word === 'NULL' || word === 'DEFAULT') return { kind: 'null' }
  if (word === 'TRUE' || word === 'FALSE') return { kind: 'boolean', value: word === 'TRUE' }
  if (word.startsWith('_') && cursor.peek()?.kind === 'string') {
    const literal = parseOperand(cursor)
    return literal.kind === 'string' ? { ...literal, binary: word === '_BINARY' } : literal
  }
  if (word === 'CAST' && cursor.isSymbol('(')) return parseCast(cursor)
  if (word === 'CONVERT' && cursor.isSymbol('(')) return parseConvert(cursor)
  throw new UnsupportedValueError(`unsupported expression "${word}"`)
}

function parseCast(cursor: TokenCursor): SqlValue {
  cursor.expectSymbol('(')
  const inner = parseOperand(cursor)
  if (!cursor.acceptWord('AS')) throw new UnsupportedValueError('unsupported CAST expression')
  const target = cursor.peek()
  const castType = target?.kind === 'word' ? target.upper : target?.kind === 'name' ? target.text.toUpperCase() : undefined
  skipUntilClosingParenthesis(cursor)
  return inner.kind === 'hex' && castType !== undefined ? { ...inner, castType } : inner
}

function parseConvert(cursor: TokenCursor): SqlValue {
  cursor.expectSymbol('(')
  const firstIsLiteral = isLiteralStart(cursor)
  if (firstIsLiteral) {
    const inner = parseOperand(cursor)
    skipUntilClosingParenthesis(cursor)
    return inner
  }
  while (!cursor.atEnd() && !cursor.isSymbol(',')) cursor.skipBalanced()
  cursor.expectSymbol(',')
  const inner = parseOperand(cursor)
  skipUntilClosingParenthesis(cursor)
  return inner
}

function isLiteralStart(cursor: TokenCursor): boolean {
  const token = cursor.peek()
  if (!token) return false
  if (token.kind === 'string' || token.kind === 'number' || token.kind === 'hex' || token.kind === 'bits') return true
  if (token.kind === 'symbol') return token.text === '-' || token.text === '+'
  return token.kind === 'word' && (token.upper === 'NULL' || token.upper.startsWith('_'))
}

function skipUntilClosingParenthesis(cursor: TokenCursor): void {
  while (!cursor.atEnd() && !cursor.isSymbol(')')) cursor.skipBalanced()
  cursor.expectSymbol(')')
}
