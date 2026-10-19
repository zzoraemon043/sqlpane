import type { Dialect } from './dialect'

export type Token =
  | { kind: 'word'; text: string; upper: string; line: number }
  | { kind: 'name'; text: string; line: number }
  | { kind: 'string'; text: string; national: boolean; line: number }
  | { kind: 'number'; text: string; line: number }
  | { kind: 'hex'; hex: string; line: number }
  | { kind: 'bits'; bits: string; line: number }
  | { kind: 'symbol'; text: string; line: number }

const mySqlEscapes: Record<string, string> = {
  '0': '\u0000',
  b: '\b',
  n: '\n',
  r: '\r',
  t: '\t',
  Z: '\u001a',
  '%': '\\%',
  _: '\\_',
}

export class TokenizeError extends Error {
  readonly line: number

  constructor(message: string, line: number) {
    super(message)
    this.line = line
  }
}

export function tokenize(text: string, dialect: Dialect): Token[] {
  const tokens: Token[] = []
  let index = 0
  let line = 0
  while (index < text.length) {
    const char = text[index]
    if (char === '\n') {
      line++
      index++
      continue
    }
    if (/\s/.test(char)) {
      index++
      continue
    }
    const start = index
    const startLine = line
    const readQuoted = (closing: string, backslashEscapes: boolean) => {
      const result = readQuotedText(text, index + 1, closing, backslashEscapes)
      if (result === undefined) throw new TokenizeError('unterminated quoted text', startLine)
      line += countNewlines(text, index, result.end)
      index = result.end
      return result.value
    }
    if ((char === 'N' || char === 'n') && text[index + 1] === "'") {
      index++
      tokens.push({ kind: 'string', text: readQuoted("'", dialect === 'mysql'), national: true, line: startLine })
      continue
    }
    if ((char === 'X' || char === 'x') && text[index + 1] === "'") {
      index++
      tokens.push({ kind: 'hex', hex: readQuoted("'", false), line: startLine })
      continue
    }
    if ((char === 'B' || char === 'b') && text[index + 1] === "'") {
      index++
      tokens.push({ kind: 'bits', bits: readQuoted("'", false), line: startLine })
      continue
    }
    if (char === '0' && (text[index + 1] === 'x' || text[index + 1] === 'X')) {
      const match = /^0[xX]([0-9a-fA-F]*)/.exec(text.slice(index, index + 2 + hexRunLength(text, index + 2)))!
      tokens.push({ kind: 'hex', hex: match[1], line: startLine })
      index += match[0].length
      continue
    }
    if (char === "'") {
      tokens.push({ kind: 'string', text: readQuoted("'", dialect === 'mysql'), national: false, line: startLine })
      continue
    }
    if (char === '"') {
      const value = readQuoted('"', dialect === 'mysql')
      tokens.push(dialect === 'mysql' ? { kind: 'string', text: value, national: false, line: startLine } : { kind: 'name', text: value, line: startLine })
      continue
    }
    if (char === '`') {
      tokens.push({ kind: 'name', text: readQuoted('`', false), line: startLine })
      continue
    }
    if (char === '[' && dialect === 'sqlserver') {
      tokens.push({ kind: 'name', text: readQuoted(']', false), line: startLine })
      continue
    }
    if (isDigit(char) || (char === '.' && isDigit(text[index + 1]))) {
      const match = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(text.slice(index, index + 400))!
      tokens.push({ kind: 'number', text: match[0], line: startLine })
      index += match[0].length
      continue
    }
    if (isWordStart(char)) {
      index++
      while (index < text.length && isWordPart(text[index])) index++
      const word = text.slice(start, index)
      tokens.push({ kind: 'word', text: word, upper: word.toUpperCase(), line: startLine })
      continue
    }
    tokens.push({ kind: 'symbol', text: char, line: startLine })
    index++
  }
  return tokens
}

function readQuotedText(text: string, from: number, closing: string, backslashEscapes: boolean) {
  let value = ''
  let segmentStart = from
  let index = from
  while (index < text.length) {
    const char = text[index]
    if (backslashEscapes && char === '\\') {
      value += text.slice(segmentStart, index)
      const escaped = text[index + 1]
      if (escaped === undefined) return undefined
      value += mySqlEscapes[escaped] ?? escaped
      index += 2
      segmentStart = index
      continue
    }
    if (char === closing) {
      value += text.slice(segmentStart, index)
      if (text[index + 1] === closing) {
        value += closing
        index += 2
        segmentStart = index
        continue
      }
      return { value, end: index + 1 }
    }
    index++
  }
  return undefined
}

function countNewlines(text: string, from: number, to: number): number {
  let count = 0
  for (let index = text.indexOf('\n', from); index !== -1 && index < to; index = text.indexOf('\n', index + 1)) count++
  return count
}

function hexRunLength(text: string, from: number): number {
  let length = 0
  while (from + length < text.length && /[0-9a-fA-F]/.test(text[from + length])) length++
  return length
}

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= '0' && char <= '9'
}

function isWordStart(char: string): boolean {
  return /[\p{L}_@#$]/u.test(char)
}

function isWordPart(char: string): boolean {
  return /[\p{L}\p{N}_@#$]/u.test(char)
}
