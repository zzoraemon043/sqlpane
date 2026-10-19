import type { Token } from './tokenizer'

const twoWordKinds = new Set(['LOCK', 'UNLOCK', 'CREATE', 'ALTER', 'DROP', 'START', 'BEGIN', 'SET'])
const twoWordFollowers = new Set([
  'TABLE', 'TABLES', 'DATABASE', 'SCHEMA', 'INDEX', 'VIEW', 'PROCEDURE', 'PROC', 'FUNCTION', 'TRIGGER', 'TRANSACTION', 'TRAN',
  'UNIQUE', 'CLUSTERED', 'NONCLUSTERED', 'USER', 'LOGIN', 'ROLE', 'TYPE', 'SEQUENCE', 'EVENT', 'IDENTITY_INSERT', 'NAMES',
  'SYNONYM', 'DEFAULT', 'RULE', 'STATISTICS', 'FULLTEXT', 'ALGORITHM', 'DEFINER', 'OR', 'XACT_ABORT', 'NOCOUNT', 'ANSI_NULLS',
  'QUOTED_IDENTIFIER', 'ANSI_PADDING', 'FOREIGN_KEY_CHECKS', 'UNIQUE_CHECKS', 'SQL_MODE', 'TIME_ZONE', 'CHARACTER_SET_CLIENT',
])

export function statementKind(tokens: Token[]): string {
  const first = tokens[0]
  if (!first) return 'EMPTY'
  if (first.kind !== 'word') return 'UNRECOGNIZED'
  const second = tokens[1]
  if (twoWordKinds.has(first.upper) && second?.kind === 'word' && twoWordFollowers.has(second.upper)) {
    return `${first.upper} ${second.upper}`
  }
  return first.upper
}

export function unwrapConditionalComment(text: string): string {
  const match = /^\/\*!\d*\s*([\s\S]*?)\s*\*\/$/.exec(text.trim())
  return match ? match[1] : text
}

export function previewOf(text: string): string {
  const singleLine = text.replace(/\s+/g, ' ').trim()
  return singleLine.length > 120 ? `${singleLine.slice(0, 117)}...` : singleLine
}
