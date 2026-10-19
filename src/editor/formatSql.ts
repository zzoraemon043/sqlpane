import { format } from 'sql-formatter'

export function formatSql(sql: string): string {
  return format(sql, { language: 'duckdb', keywordCase: 'upper', tabWidth: 2, linesBetweenQueries: 1 })
}
