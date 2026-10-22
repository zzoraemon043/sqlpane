export interface TextRange {
  from: number
  to: number
}

export function statementRanges(text: string): TextRange[] {
  const ranges: TextRange[] = []
  let start = 0
  let index = 0
  while (index < text.length) {
    const char = text[index]
    const next = text[index + 1]
    if (char === "'" || char === '"') index = skipQuoted(text, index, char)
    else if (char === '-' && next === '-') index = skipUntil(text, index, '\n')
    else if (char === '/' && next === '*') index = skipUntil(text, index + 2, '*/')
    else if (char === '$' && next === '$') index = skipUntil(text, index + 2, '$$')
    else if (char === ';') {
      ranges.push({ from: start, to: index + 1 })
      start = index + 1
      index++
    } else index++
  }
  if (start < text.length) ranges.push({ from: start, to: text.length })
  return ranges
}

function skipQuoted(text: string, from: number, quote: string): number {
  let index = from + 1
  while (index < text.length) {
    if (text[index] === quote) {
      if (text[index + 1] === quote) index += 2
      else return index + 1
    } else index++
  }
  return text.length
}

function skipUntil(text: string, from: number, terminator: string): number {
  const found = text.indexOf(terminator, from)
  return found === -1 ? text.length : found + terminator.length
}

export function hasCode(text: string): boolean {
  const withoutComments = text.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  return withoutComments.replace(/;/g, '').trim() !== ''
}

export function statementAtOffset(text: string, offset: number): TextRange | undefined {
  const ranges = statementRanges(text).filter((range) => hasCode(text.slice(range.from, range.to)))
  if (ranges.length === 0) return undefined
  const index = ranges.findIndex((range) => offset >= range.from && offset < range.to)
  if (index !== -1) {
    const containing = trimRange(text, ranges[index])
    const previous = index > 0 ? trimRange(text, ranges[index - 1]) : undefined
    if (previous && offset < containing.from && !text.slice(previous.to, offset).includes('\n')) return previous
    return containing
  }
  const before = ranges.filter((range) => range.to <= offset).at(-1)
  return trimRange(text, before ?? ranges[0])
}

function trimRange(text: string, range: TextRange): TextRange {
  let from = range.from
  let to = range.to
  while (from < to && /\s/.test(text[from])) from++
  while (to > from && /\s/.test(text[to - 1])) to--
  return { from, to }
}
