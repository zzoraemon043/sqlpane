import { describe, expect, it } from 'vitest'
import { tokenize } from './tokenizer'

const kinds = (text: string, dialect: 'mysql' | 'sqlserver' = 'mysql') =>
  tokenize(text, dialect).map((token) => {
    switch (token.kind) {
      case 'hex':
        return `hex:${token.hex}`
      case 'bits':
        return `bits:${token.bits}`
      case 'string':
        return `${token.national ? 'nstring' : 'string'}:${token.text}`
      default:
        return `${token.kind}:${token.text}`
    }
  })

describe('tokenizer', () => {
  it('reads backtick and bracket identifiers', () => {
    expect(kinds('`my table`.`a``b`')).toEqual(['name:my table', 'symbol:.', 'name:a`b'])
    expect(kinds('[dbo].[Order Details]]x]', 'sqlserver')).toEqual(['name:dbo', 'symbol:.', 'name:Order Details]x'])
  })

  it('reads MySQL strings with backslash escapes', () => {
    expect(kinds("'a\\'b\\\\c\\nd\\0' 'e''f'")).toEqual(["string:a'b\\c\nd\u0000", "string:e'f"])
  })

  it('reads SQL Server strings without backslash escapes', () => {
    expect(kinds("N'中文' 'C:\\path' 'it''s'", 'sqlserver')).toEqual(['nstring:中文', 'string:C:\\path', "string:it's"])
  })

  it('reads hex and bit literals', () => {
    expect(kinds("0xDEADbeef X'0A0b' b'101' 0x")).toEqual(['hex:DEADbeef', 'hex:0A0b', 'bits:101', 'hex:'])
  })

  it('reads numbers and treats double quotes per dialect', () => {
    expect(kinds('12 3.5 .5 1e-3 -7')).toEqual(['number:12', 'number:3.5', 'number:.5', 'number:1e-3', 'symbol:-', 'number:7'])
    expect(kinds('"x"', 'mysql')).toEqual(['string:x'])
    expect(kinds('"x"', 'sqlserver')).toEqual(['name:x'])
  })

  it('tracks lines', () => {
    expect(tokenize("a\n'multi\nline'\nb", 'mysql').map((token) => token.line)).toEqual([0, 1, 3])
  })

  it('rejects unterminated strings', () => {
    expect(() => tokenize("'open", 'mysql')).toThrow('unterminated')
  })
})
