import { describe, expect, it } from 'vitest'
import { detectDialect } from './dialect'

describe('dialect detection', () => {
  it('recognizes mysqldump output', () => {
    expect(detectDialect('-- MySQL dump 10.13\n/*!40101 SET NAMES utf8mb4 */;\nCREATE TABLE `a` (`id` int) ENGINE=InnoDB;')).toBe('mysql')
  })

  it('recognizes SQL Server generated scripts', () => {
    expect(detectDialect('SET ANSI_NULLS ON\nGO\nCREATE TABLE [dbo].[a]([id] [int] NULL)\nGO\n')).toBe('sqlserver')
  })

  it('defaults to MySQL for plain SQL', () => {
    expect(detectDialect('CREATE TABLE a (id int);')).toBe('mysql')
  })
})
