import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { selectRows, startSharedEngine } from '../test-support/sharedEngine'
import type { ImportProgress } from './importReport'
import { importScript } from './importScript'
import { readTextChunks, type TextChunk } from './scriptChunks'

const engine = startSharedEngine()
const fixture = (name: string) => readFileSync(join(import.meta.dirname, '../../e2e/fixtures', name), 'utf8')

async function* chunked(text: string, size: number): AsyncGenerator<TextChunk> {
  for (let start = 0; start < text.length; start += size) {
    const piece = text.slice(start, start + size)
    yield { text: piece, bytes: new TextEncoder().encode(piece).length }
  }
}

function utf16le(text: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(2 + text.length * 2)
  bytes.set([0xff, 0xfe])
  for (let index = 0; index < text.length; index++) {
    bytes[2 + index * 2] = text.charCodeAt(index) & 0xff
    bytes[3 + index * 2] = text.charCodeAt(index) >> 8
  }
  return bytes
}

describe('script importer', () => {
  it('imports a mysqldump file in small streamed chunks', async () => {
    const script = fixture('shop-mysqldump.sql')
    const progress: ImportProgress[] = []
    const report = await importScript(engine(), chunked(script, 97), {
      totalBytes: new TextEncoder().encode(script).length,
      batchRows: 2,
      onProgress: (step) => progress.push(step),
    })
    expect(report.dialect).toBe('mysql')
    expect(report.tables).toEqual([
      { name: 'customers', sourceName: 'customers', rowCount: 3 },
      { name: 'orders', sourceName: 'orders', rowCount: 3 },
    ])
    expect(await selectRows(engine(), 'SELECT id, name, vip, CAST(joined AS VARCHAR) AS joined, notes FROM customers ORDER BY id')).toEqual([
      { id: 1, name: 'Test Customer One', vip: true, joined: '2023-01-15 09:30:00', notes: "likes 'quotes'; and semicolons" },
      { id: 2, name: '測試顧客', vip: false, joined: null, notes: null },
      { id: 3, name: 'Sample Person', vip: false, joined: null, notes: 'line1\nline2' },
    ])
    expect(await selectRows(engine(), 'SELECT id, CAST(total AS VARCHAR) AS total, status, hex(token) AS token, flags FROM orders ORDER BY id')).toEqual([
      { id: 100, total: '250.00', status: 'paid', token: '0A0B0C0D', flags: true },
      { id: 101, total: '19.99', status: 'new', token: null, flags: false },
      { id: 103, total: '5.50', status: 'shipped', token: '6162', flags: true },
    ])
    expect(report.failedRows).toEqual([{ line: 58, table: 'orders', reason: { code: 'valueTypeMismatch' } }])
    expect(report.zeroDatesAsNull).toBe(1)
    expect(report.warnings).toContainEqual({ code: 'zeroDatesAsNull', count: 1 })
    expect(report.skippedByKind).toMatchObject({ SET: 4, 'SET NAMES': 1, 'SET TIME_ZONE': 2, 'SET CHARACTER_SET_CLIENT': 2, 'DROP TABLE': 2, 'LOCK TABLES': 2, 'UNLOCK TABLES': 2, 'ALTER TABLE': 2, DELIMITER: 2, CREATE: 1 })
    expect(report.skipped.find((entry) => entry.kind === 'LOCK TABLES')).toEqual({ line: 35, kind: 'LOCK TABLES', preview: 'LOCK TABLES `customers` WRITE' })
    expect(report.failedStatements).toEqual([])
    expect(progress.at(-1)).toMatchObject({ bytesRead: new TextEncoder().encode(script).length, rowsInserted: 6 })
    expect(progress.length).toBeGreaterThan(10)
  })

  it('imports a UTF-16 SQL Server script with GO batches', async () => {
    const script = fixture('school-sqlserver.sql')
    const report = await importScript(engine(), readTextChunks(new Blob([utf16le(script)])))
    expect(report.dialect).toBe('sqlserver')
    expect(report.tables).toEqual([
      { name: 'Students', sourceName: 'Students', rowCount: 2 },
      { name: 'Courses', sourceName: 'Courses', rowCount: 2 },
    ])
    expect(await selectRows(engine(), 'SELECT StudentID, Name, Active, CAST(Balance AS VARCHAR) AS Balance, CAST(Guid AS VARCHAR) AS Guid, CAST(Enrolled AS VARCHAR) AS Enrolled FROM Students ORDER BY StudentID')).toEqual([
      { StudentID: 1, Name: '範例學生', Active: true, Balance: '100.5000', Guid: '6f9619ff-8b86-d011-b42d-00c04fc964ff', Enrolled: '2023-09-01 08:00:00' },
      { StudentID: 2, Name: 'Test Learner', Active: false, Balance: null, Guid: null, Enrolled: '2023-09-02 08:00:00' },
    ])
    expect(await selectRows(engine(), 'SELECT CourseID, Title, CAST(Credits AS VARCHAR) AS Credits, hex(Syllabus) AS Syllabus FROM Courses ORDER BY CourseID')).toEqual([
      { CourseID: 10, Title: "C:\\Intro 'Databases'", Credits: '3.0', Syllabus: '255044462D' },
      { CourseID: 11, Title: 'Statistics', Credits: '4.5', Syllabus: null },
    ])
    expect(report.failedRows).toHaveLength(1)
    expect(report.failedRows[0]).toMatchObject({ line: 35, table: 'Students' })
    expect(report.skippedByKind).toMatchObject({ GO: 13, USE: 1, 'SET ANSI_NULLS': 1, 'SET QUOTED_IDENTIFIER': 1, 'SET IDENTITY_INSERT': 2, 'ALTER TABLE': 1 })
  })

  it('renames imported tables that clash with open tables and creates missing tables from column lists', async () => {
    const report = await importScript(engine(), chunked('INSERT INTO extra (a, b) VALUES (1, 2);\nCREATE TABLE taken (x int);\nINSERT INTO taken VALUES (5);', 1000), {
      existingTableNames: ['taken'],
    })
    expect(report.tables).toEqual([
      { name: 'extra', sourceName: 'extra', rowCount: 1 },
      { name: 'taken_2', sourceName: 'taken', rowCount: 1 },
    ])
    expect(report.warnings).toContainEqual({ code: 'createdWithTextColumns', table: 'extra' })
    expect(await selectRows(engine(), 'SELECT x FROM taken_2')).toEqual([{ x: 5 }])
  })

  it('reports statements it cannot import with their line numbers', async () => {
    const report = await importScript(engine(), chunked("SELECT 1;\nINSERT INTO nowhere VALUES (1);\nINSERT INTO t2 SELECT 1;\nINSERT INTO x VALUES ('open", 1000))
    expect(report.failedStatements).toEqual([
      { line: 2, preview: 'INSERT INTO nowhere VALUES (1)', reason: { code: 'detail', text: 'table nowhere was not created in this script and the INSERT has no column list' } },
      { line: 3, preview: 'INSERT INTO t2 SELECT 1', reason: { code: 'detail', text: 'only INSERT ... VALUES is supported, found "SELECT"' } },
      { line: 4, preview: "INSERT INTO x VALUES ('open", reason: { code: 'detail', text: 'unterminated quoted text' } },
    ])
    expect(report.skipped).toEqual([{ line: 1, kind: 'SELECT', preview: 'SELECT 1' }])
  })

  it('reports rows whose value count does not match', async () => {
    const report = await importScript(engine(), chunked('CREATE TABLE pairs (a int, b int);\nINSERT INTO pairs VALUES (1, 2),\n(3);', 1000))
    expect(report.failedRows).toEqual([{ line: 3, table: 'pairs', reason: { code: 'valueCountMismatch', expected: 2, found: 1 } }])
    expect(report.tables).toEqual([{ name: 'pairs', sourceName: 'pairs', rowCount: 1 }])
  })

  it('handles an empty script', async () => {
    const report = await importScript(engine(), chunked('', 10))
    expect(report.tables).toEqual([])
  })
})
