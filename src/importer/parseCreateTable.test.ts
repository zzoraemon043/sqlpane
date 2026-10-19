import { describe, expect, it } from 'vitest'
import { isCreateTable, parseCreateTable } from './parseCreateTable'
import { tokenize } from './tokenizer'

describe('CREATE TABLE parser', () => {
  it('reads a mysqldump table definition', () => {
    const sql = `CREATE TABLE \`orders\` (
  \`id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
  \`customer\` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'name, with comma',
  \`paid\` tinyint(1) NOT NULL DEFAULT '0',
  \`total\` decimal(10,2) DEFAULT NULL,
  \`status\` enum('new','done') NOT NULL DEFAULT 'new',
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq\` (\`customer\`(20)),
  KEY \`idx_total\` (\`total\`),
  CONSTRAINT \`fk\` FOREIGN KEY (\`customer\`) REFERENCES \`c\` (\`name\`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4`
    const tokens = tokenize(sql, 'mysql')
    expect(isCreateTable(tokens)).toBe(true)
    const table = parseCreateTable(tokens, 'mysql')
    expect(table.qualifiedName).toEqual(['orders'])
    expect(table.primaryKey).toEqual(['id'])
    expect(table.columns.map(({ name, type, notNull }) => ({ name, type, notNull }))).toEqual([
      { name: 'id', type: 'UINTEGER', notNull: true },
      { name: 'customer', type: 'VARCHAR', notNull: false },
      { name: 'paid', type: 'BOOLEAN', notNull: true },
      { name: 'total', type: 'DECIMAL(10,2)', notNull: false },
      { name: 'status', type: 'VARCHAR', notNull: true },
      { name: 'created_at', type: 'TIMESTAMP', notNull: false },
    ])
  })

  it('reads a SQL Server Generate Scripts table definition', () => {
    const sql = `CREATE TABLE [dbo].[Customers](
	[CustomerID] [uniqueidentifier] NOT NULL,
	[Name] [nvarchar](max) NULL,
	[Balance] [money] NOT NULL,
	[Active] [bit] NULL,
	[Joined] [datetime2](7) NOT NULL,
	[Version] [timestamp] NOT NULL,
	[Total]  AS ([Balance]*(2)),
	[Code] [dbo].[ShortCode] NULL,
 CONSTRAINT [PK_Customers] PRIMARY KEY CLUSTERED 
(
	[CustomerID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]`
    const table = parseCreateTable(tokenize(sql, 'sqlserver'), 'sqlserver')
    expect(table.qualifiedName).toEqual(['dbo', 'Customers'])
    expect(table.primaryKey).toEqual(['CustomerID'])
    expect(table.skippedComputedColumns).toEqual(['Total'])
    expect(table.columns.map(({ name, type, notNull }) => `${name} ${type}${notNull ? ' NOT NULL' : ''}`)).toEqual([
      'CustomerID UUID NOT NULL',
      'Name VARCHAR',
      'Balance DECIMAL(19,4) NOT NULL',
      'Active BOOLEAN',
      'Joined TIMESTAMP NOT NULL',
      'Version BLOB NOT NULL',
      'Code VARCHAR',
    ])
  })

  it('marks inline primary keys as not null and handles IF NOT EXISTS', () => {
    const table = parseCreateTable(tokenize('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, v DOUBLE PRECISION)', 'mysql'), 'mysql')
    expect(table.primaryKey).toEqual(['id'])
    expect(table.columns).toEqual([
      { name: 'id', sourceType: { name: 'INTEGER', args: [], unsigned: false }, type: 'INTEGER', notNull: true },
      { name: 'v', sourceType: { name: 'DOUBLE PRECISION', args: [], unsigned: false }, type: 'DOUBLE', notNull: false },
    ])
  })

  it('rejects CREATE TABLE ... AS SELECT', () => {
    expect(() => parseCreateTable(tokenize('CREATE TABLE t AS SELECT 1', 'mysql'), 'mysql')).toThrow('not supported')
  })
})
