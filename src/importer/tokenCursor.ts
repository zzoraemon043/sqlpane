import type { Token } from './tokenizer'

export class TokenCursor {
  readonly tokens: Token[]
  position: number

  constructor(tokens: Token[], position = 0) {
    this.tokens = tokens
    this.position = position
  }

  peek(offset = 0): Token | undefined {
    return this.tokens[this.position + offset]
  }

  next(): Token | undefined {
    return this.tokens[this.position++]
  }

  atEnd(): boolean {
    return this.position >= this.tokens.length
  }

  isWord(upper: string, offset = 0): boolean {
    const token = this.peek(offset)
    return token?.kind === 'word' && token.upper === upper
  }

  isSymbol(text: string, offset = 0): boolean {
    const token = this.peek(offset)
    return token?.kind === 'symbol' && token.text === text
  }

  acceptWord(upper: string): boolean {
    if (!this.isWord(upper)) return false
    this.position++
    return true
  }

  acceptSymbol(text: string): boolean {
    if (!this.isSymbol(text)) return false
    this.position++
    return true
  }

  expectSymbol(text: string): void {
    if (!this.acceptSymbol(text)) throw new Error(`expected "${text}" near ${describe(this.peek())}`)
  }

  skipBalanced(): void {
    if (!this.isSymbol('(')) {
      this.position++
      return
    }
    let depth = 0
    while (!this.atEnd()) {
      const token = this.next()!
      if (token.kind === 'symbol' && token.text === '(') depth++
      if (token.kind === 'symbol' && token.text === ')') {
        depth--
        if (depth === 0) return
      }
    }
  }

  currentLine(): number {
    return this.peek()?.line ?? this.tokens[this.tokens.length - 1]?.line ?? 0
  }
}

export function describe(token: Token | undefined): string {
  if (!token) return 'end of statement'
  switch (token.kind) {
    case 'word':
    case 'symbol':
    case 'name':
    case 'number':
      return `"${token.text}"`
    case 'string':
      return 'a string'
    case 'hex':
      return 'a hex literal'
    case 'bits':
      return 'a bit literal'
  }
}

export function readQualifiedName(cursor: TokenCursor): string[] {
  const parts: string[] = []
  do {
    const token = cursor.next()
    if (!token || (token.kind !== 'word' && token.kind !== 'name')) throw new Error(`expected a name near ${describe(token)}`)
    parts.push(token.text)
  } while (cursor.acceptSymbol('.'))
  return parts
}
