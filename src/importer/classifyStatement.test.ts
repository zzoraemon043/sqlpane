import { describe, expect, it } from 'vitest'
import { previewOf, statementKind, unwrapConditionalComment } from './classifyStatement'
import { tokenize } from './tokenizer'

const kindOf = (sql: string) => statementKind(tokenize(sql, 'mysql'))

describe('statement classification', () => {
  it('names statements that do not change data', () => {
    expect(kindOf('SET NAMES utf8mb4')).toBe('SET NAMES')
    expect(kindOf('SET @OLD_SQL_MODE=@@SQL_MODE')).toBe('SET')
    expect(kindOf('USE shop')).toBe('USE')
    expect(kindOf('LOCK TABLES `a` WRITE')).toBe('LOCK TABLES')
    expect(kindOf('UNLOCK TABLES')).toBe('UNLOCK TABLES')
    expect(kindOf('DROP TABLE IF EXISTS `a`')).toBe('DROP TABLE')
    expect(kindOf('ALTER TABLE `a` DISABLE KEYS')).toBe('ALTER TABLE')
    expect(kindOf('CREATE DATABASE shop')).toBe('CREATE DATABASE')
    expect(kindOf('SET IDENTITY_INSERT [dbo].[a] ON')).toBe('SET IDENTITY_INSERT')
    expect(kindOf('PRINT 1')).toBe('PRINT')
    expect(kindOf('(1)')).toBe('UNRECOGNIZED')
  })

  it('unwraps MySQL conditional comments', () => {
    expect(unwrapConditionalComment('/*!40101 SET NAMES utf8 */')).toBe('SET NAMES utf8')
    expect(unwrapConditionalComment('/*!SET x=1*/')).toBe('SET x=1')
    expect(unwrapConditionalComment('SELECT 1')).toBe('SELECT 1')
  })

  it('shortens previews to one line', () => {
    expect(previewOf('SET\n  x = 1')).toBe('SET x = 1')
    expect(previewOf('x'.repeat(200))).toHaveLength(120)
  })
})
