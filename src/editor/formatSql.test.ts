import { describe, expect, it } from 'vitest'
import { formatSql } from './formatSql'

describe('formatter', () => {
  it('formats DuckDB SQL with upper case keywords', () => {
    expect(formatSql('select a, count(*) from "my table" where b > 1 group by a')).toBe(
      'SELECT\n  a,\n  count(*)\nFROM\n  "my table"\nWHERE\n  b > 1\nGROUP BY\n  a',
    )
  })

  it('keeps separate statements apart', () => {
    expect(formatSql('select 1; select 2;')).toBe('SELECT\n  1;\n\nSELECT\n  2;')
  })
})
