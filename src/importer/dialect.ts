export type Dialect = 'mysql' | 'sqlserver'

const sqlServerSignals = [/^\s*GO\s*$/im, /\[dbo\]\./i, /SET\s+ANSI_NULLS/i, /SET\s+QUOTED_IDENTIFIER/i, /\bN'/, /SET\s+IDENTITY_INSERT/i]
const mySqlSignals = [/`/, /mysqldump/i, /\/\*!\d{5}/, /ENGINE\s*=/i, /LOCK TABLES/i]

export function detectDialect(sample: string): Dialect {
  const sqlServerScore = sqlServerSignals.filter((signal) => signal.test(sample)).length
  const mySqlScore = mySqlSignals.filter((signal) => signal.test(sample)).length
  return sqlServerScore > mySqlScore ? 'sqlserver' : 'mysql'
}
