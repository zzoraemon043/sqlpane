import { describe, expect, it } from 'vitest'
import { mapType, type SourceType } from './typeMapping'

const type = (name: string, args: string[] = [], unsigned = false): SourceType => ({ name, args, unsigned })

describe('type mapping', () => {
  it.each([
    [type('tinyint', ['1']), 'BOOLEAN'],
    [type('tinyint', ['4']), 'TINYINT'],
    [type('tinyint', ['3'], true), 'UTINYINT'],
    [type('int', ['11']), 'INTEGER'],
    [type('int', ['10'], true), 'UINTEGER'],
    [type('mediumint'), 'INTEGER'],
    [type('bigint', ['20'], true), 'UBIGINT'],
    [type('decimal', ['10', '2']), 'DECIMAL(10,2)'],
    [type('decimal', ['65', '30']), 'DOUBLE'],
    [type('float'), 'REAL'],
    [type('double'), 'DOUBLE'],
    [type('bit', ['1']), 'BOOLEAN'],
    [type('bit', ['8']), 'UBIGINT'],
    [type('datetime'), 'TIMESTAMP'],
    [type('timestamp'), 'TIMESTAMP'],
    [type('year'), 'SMALLINT'],
    [type('varchar', ['255']), 'VARCHAR'],
    [type('enum', ["'a'", "'b'"]), 'VARCHAR'],
    [type('json'), 'VARCHAR'],
    [type('longblob'), 'BLOB'],
    [type('varbinary', ['16']), 'BLOB'],
    [type('date'), 'DATE'],
    [type('geometry'), 'BLOB'],
    [type('mystery'), 'VARCHAR'],
  ])('maps MySQL %o to %s', (source, expected) => {
    expect(mapType(source, 'mysql')).toBe(expected)
  })

  it.each([
    [type('bit'), 'BOOLEAN'],
    [type('tinyint'), 'UTINYINT'],
    [type('int'), 'INTEGER'],
    [type('nvarchar', ['max']), 'VARCHAR'],
    [type('nchar', ['10']), 'VARCHAR'],
    [type('ntext'), 'VARCHAR'],
    [type('uniqueidentifier'), 'UUID'],
    [type('money'), 'DECIMAL(19,4)'],
    [type('smallmoney'), 'DECIMAL(10,4)'],
    [type('decimal'), 'DECIMAL(18,0)'],
    [type('numeric', ['9', '3']), 'DECIMAL(9,3)'],
    [type('float'), 'DOUBLE'],
    [type('float', ['24']), 'REAL'],
    [type('datetime2', ['7']), 'TIMESTAMP'],
    [type('smalldatetime'), 'TIMESTAMP'],
    [type('datetimeoffset', ['7']), 'TIMESTAMPTZ'],
    [type('timestamp'), 'BLOB'],
    [type('rowversion'), 'BLOB'],
    [type('varbinary', ['max']), 'BLOB'],
    [type('image'), 'BLOB'],
    [type('xml'), 'VARCHAR'],
    [type('time', ['7']), 'TIME'],
  ])('maps SQL Server %o to %s', (source, expected) => {
    expect(mapType(source, 'sqlserver')).toBe(expected)
  })
})
