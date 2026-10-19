import { describe, expect, it } from 'vitest'
import { isInsert, parseInsert } from './parseInsert'
import { tokenize } from './tokenizer'

const parse = (sql: string, dialect: 'mysql' | 'sqlserver' = 'mysql') => parseInsert(tokenize(sql, dialect))

describe('INSERT parser', () => {
  it('reads a multi-row mysqldump insert', () => {
    const statement = parse("INSERT INTO `t` VALUES (1,'a',NULL,-2.5),(2,'b\\'c',0x0aff,1e3)")
    expect(statement.qualifiedName).toEqual(['t'])
    expect(statement.columns).toBeUndefined()
    expect(statement.rows).toEqual([
      { line: 0, values: [{ kind: 'number', text: '1' }, { kind: 'string', text: 'a', binary: false }, { kind: 'null' }, { kind: 'number', text: '-2.5' }] },
      { line: 0, values: [{ kind: 'number', text: '2' }, { kind: 'string', text: "b'c", binary: false }, { kind: 'hex', hex: '0aff' }, { kind: 'number', text: '1e3' }] },
    ])
  })

  it('reads SQL Server inserts without INTO, with N strings and CAST', () => {
    const statement = parse(
      "INSERT [dbo].[People] ([Id], [Name], [Born], [Score]) VALUES (1, N'林小姐', CAST(N'2001-02-03T04:05:06.000' AS DateTime), CAST(12.50 AS Decimal(18, 2)))",
      'sqlserver',
    )
    expect(statement.qualifiedName).toEqual(['dbo', 'People'])
    expect(statement.columns).toEqual(['Id', 'Name', 'Born', 'Score'])
    expect(statement.rows).toEqual([
      {
        line: 0,
        values: [
          { kind: 'number', text: '1' },
          { kind: 'string', text: '林小姐', binary: false },
          { kind: 'string', text: '2001-02-03T04:05:06.000', binary: false },
          { kind: 'number', text: '12.50' },
        ],
      },
    ])
  })

  it('reads CONVERT, introducers, booleans, bit literals and modifiers', () => {
    const statement = parse("INSERT IGNORE INTO t VALUES (CONVERT(datetime, '2020-01-01', 120), _binary 'xy', TRUE, b'1', CONVERT('z' USING utf8mb4), DEFAULT)")
    expect(statement.rows[0]).toEqual({
      line: 0,
      values: [
        { kind: 'string', text: '2020-01-01', binary: false },
        { kind: 'string', text: 'xy', binary: true },
        { kind: 'boolean', value: true },
        { kind: 'bits', bits: '1' },
        { kind: 'string', text: 'z', binary: false },
        { kind: 'null' },
      ],
    })
  })

  it('records unsupported expressions as failed rows and keeps going', () => {
    const statement = parse('INSERT INTO t (a, b) VALUES\n(1, NOW()),\n(2, 3),\n(4, 5 + 6)')
    expect(statement.rows).toEqual([
      { line: 1, error: 'unsupported expression "NOW"' },
      { line: 2, values: [{ kind: 'number', text: '2' }, { kind: 'number', text: '3' }] },
      { line: 3, error: 'unsupported expression near "+"' },
    ])
  })

  it('accepts REPLACE and rejects INSERT ... SELECT', () => {
    expect(isInsert(tokenize('REPLACE INTO t VALUES (1)', 'mysql'))).toBe(true)
    expect(() => parse('INSERT INTO t SELECT * FROM u')).toThrow('only INSERT ... VALUES')
  })
})
