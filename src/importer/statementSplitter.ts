import type { Dialect } from './dialect'

export type SplitEvent =
  | { type: 'statement'; text: string; line: number }
  | { type: 'separator'; text: string; line: number }

type State = 'normal' | 'single' | 'double' | 'backtick' | 'bracket' | 'lineComment' | 'blockComment'

const batchSeparator = /^\s*GO(?:\s+\d+)?\s*;?\s*$/i
const delimiterDirective = /^\s*DELIMITER\s+(\S+)\s*$/i

export class StatementSplitter {
  private readonly dialect: Dialect
  private state: State = 'normal'
  private current = ''
  private pending = ''
  private line = 1
  private statementLine = 0
  private lineStartIndex = 0
  private lineStartLine = 1
  private delimiter = ';'
  private conditionalDepth = 0

  constructor(dialect: Dialect) {
    this.dialect = dialect
  }

  push(text: string): SplitEvent[] {
    const input = this.pending + text
    const lookahead = Math.max(this.delimiter.length, 3)
    const safeLength = Math.max(0, input.length - lookahead)
    const events: SplitEvent[] = []
    const consumed = this.scan(input, safeLength, events)
    this.pending = input.slice(consumed)
    return events
  }

  finish(): SplitEvent[] {
    const events: SplitEvent[] = []
    const input = this.pending
    this.pending = ''
    this.scan(input, input.length, events)
    this.endOfLine(events)
    this.emitStatement(events)
    return events
  }

  private scan(input: string, limit: number, events: SplitEvent[]): number {
    let index = 0
    while (index < limit) {
      index = this.step(input, index, events)
    }
    return index
  }

  private step(input: string, index: number, events: SplitEvent[]): number {
    const char = input[index]
    const next = input[index + 1]
    switch (this.state) {
      case 'lineComment':
        if (char === '\n') {
          this.state = 'normal'
          return this.newline(events, index)
        }
        return index + 1
      case 'blockComment':
        if (char === '*' && next === '/') {
          this.state = 'normal'
          this.append(' ')
          return index + 2
        }
        if (char === '\n') {
          this.append('\n')
          this.line++
        }
        return index + 1
      case 'single':
      case 'double':
        return this.stepQuoted(input, index, this.state === 'single' ? "'" : '"', this.dialect === 'mysql')
      case 'backtick':
        return this.stepQuoted(input, index, '`', false)
      case 'bracket':
        return this.stepQuoted(input, index, ']', false)
      case 'normal':
        return this.stepNormal(input, index, events)
    }
  }

  private stepQuoted(input: string, index: number, closing: string, backslashEscapes: boolean): number {
    const char = input[index]
    if (backslashEscapes && char === '\\' && index + 1 < input.length) {
      this.appendTracked(input.slice(index, index + 2))
      return index + 2
    }
    if (char === closing) {
      if (input[index + 1] === closing) {
        this.append(closing + closing)
        return index + 2
      }
      this.append(closing)
      this.state = 'normal'
      return index + 1
    }
    this.appendTracked(char)
    return index + 1
  }

  private stepNormal(input: string, index: number, events: SplitEvent[]): number {
    const char = input[index]
    const next = input[index + 1]
    if (char === '\n') return this.newline(events, index)
    if (input.startsWith(this.delimiter, index) && this.conditionalDepth === 0 && !this.insideDelimiterDirective()) {
      this.emitStatement(events)
      return index + this.delimiter.length
    }
    if (char === '-' && next === '-') {
      this.state = 'lineComment'
      return index + 2
    }
    if (char === '#' && this.dialect === 'mysql') {
      this.state = 'lineComment'
      return index + 1
    }
    if (char === '/' && next === '*') {
      if (input[index + 2] === '!') {
        this.conditionalDepth++
        this.append('/*!')
        return index + 3
      }
      this.state = 'blockComment'
      return index + 2
    }
    if (char === '*' && next === '/' && this.conditionalDepth > 0) {
      this.conditionalDepth--
      this.append('*/')
      return index + 2
    }
    if (char === "'") this.state = 'single'
    else if (char === '"') this.state = 'double'
    else if (char === '`') this.state = 'backtick'
    else if (char === '[' && this.dialect === 'sqlserver') this.state = 'bracket'
    this.append(char)
    return index + 1
  }

  private insideDelimiterDirective(): boolean {
    return this.dialect === 'mysql' && /^\s*DELIMITER\s+\S*$/i.test(this.current.slice(this.lineStartIndex))
  }

  private newline(events: SplitEvent[], index: number): number {
    this.endOfLine(events)
    this.append('\n')
    this.line++
    this.lineStartIndex = this.current.length
    this.lineStartLine = this.line
    return index + 1
  }

  private endOfLine(events: SplitEvent[]) {
    const lineText = this.current.slice(this.lineStartIndex)
    const before = this.current.slice(0, this.lineStartIndex)
    if (this.dialect === 'sqlserver' && batchSeparator.test(lineText)) {
      this.current = before
      this.emitStatement(events)
      events.push({ type: 'separator', text: lineText.trim(), line: this.lineStartLine })
      return
    }
    const directive = this.dialect === 'mysql' ? delimiterDirective.exec(lineText) : null
    if (directive && before.trim() === '') {
      this.current = ''
      this.statementLine = 0
      this.delimiter = directive[1]
      events.push({ type: 'separator', text: `DELIMITER ${directive[1]}`, line: this.lineStartLine })
    }
  }

  private append(text: string) {
    if (this.statementLine === 0 && text.trim() !== '') this.statementLine = this.line
    this.current += text
  }

  private appendTracked(text: string) {
    this.append(text)
    for (const char of text) if (char === '\n') this.line++
  }

  private emitStatement(events: SplitEvent[]) {
    const text = this.current.trim()
    if (text !== '') events.push({ type: 'statement', text, line: this.statementLine })
    this.current = ''
    this.statementLine = 0
    this.lineStartIndex = 0
    this.lineStartLine = this.line
  }
}

export function splitScript(text: string, dialect: Dialect, chunkSize = text.length || 1): SplitEvent[] {
  const splitter = new StatementSplitter(dialect)
  const events: SplitEvent[] = []
  for (let start = 0; start < text.length; start += chunkSize) {
    events.push(...splitter.push(text.slice(start, start + chunkSize)))
  }
  events.push(...splitter.finish())
  return events
}
