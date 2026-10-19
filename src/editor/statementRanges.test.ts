import { describe, expect, it } from 'vitest'
import { hasCode, statementAtOffset, statementRanges } from './statementRanges'

const textAt = (text: string, offset: number) => {
  const range = statementAtOffset(text, offset)
  return range && text.slice(range.from, range.to)
}

describe('statement ranges', () => {
  it('splits on semicolons outside quotes and comments', () => {
    const text = "SELECT ';'; -- a; b\nSELECT \"x;y\" /* ; */ FROM t; SELECT $$;$$"
    expect(statementRanges(text).map((range) => text.slice(range.from, range.to).trim())).toEqual([
      "SELECT ';';",
      '-- a; b\nSELECT "x;y" /* ; */ FROM t;',
      'SELECT $$;$$',
    ])
  })

  it('finds the statement under the cursor', () => {
    const text = 'SELECT 1;\n\nSELECT 2;\nSELECT 3'
    expect(textAt(text, 0)).toBe('SELECT 1;')
    expect(textAt(text, 14)).toBe('SELECT 2;')
    expect(textAt(text, text.length)).toBe('SELECT 3')
  })

  it('uses the previous statement when the cursor is after it', () => {
    const text = 'SELECT 1;\n\n   '
    expect(textAt(text, text.length)).toBe('SELECT 1;')
  })

  it('ignores ranges that only contain comments', () => {
    expect(hasCode('-- only\n/* comment */ ;')).toBe(false)
    expect(textAt('-- note\n;', 3)).toBeUndefined()
  })
})
