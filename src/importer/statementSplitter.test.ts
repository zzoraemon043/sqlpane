import { describe, expect, it } from 'vitest'
import { splitScript } from './statementSplitter'

const statements = (events: ReturnType<typeof splitScript>) => events.filter((event) => event.type === 'statement').map((event) => event.text)

describe('statement splitter', () => {
  it('splits on semicolons outside strings, names and comments', () => {
    const script = "INSERT INTO a VALUES ('x;y');\n-- note; here\nINSERT INTO `b;c` VALUES (1); /* block; */ SELECT 2;"
    expect(statements(splitScript(script, 'mysql'))).toEqual(["INSERT INTO a VALUES ('x;y')", 'INSERT INTO `b;c` VALUES (1)', 'SELECT 2'])
  })

  it('honours backslash escapes only for MySQL', () => {
    expect(statements(splitScript("SELECT 'a\\';b';SELECT 1;", 'mysql'))).toEqual(["SELECT 'a\\';b'", 'SELECT 1'])
    expect(statements(splitScript("SELECT 'a\\';SELECT 'b';", 'sqlserver'))).toEqual(["SELECT 'a\\'", "SELECT 'b'"])
  })

  it('keeps doubled quotes inside strings and brackets', () => {
    expect(statements(splitScript("SELECT 'it''s;';SELECT [a]];b];", 'sqlserver'))).toEqual(["SELECT 'it''s;'", 'SELECT [a]];b]'])
  })

  it('treats GO lines as batch separators for SQL Server', () => {
    const events = splitScript("CREATE TABLE t (a int)\nGO\nINSERT t VALUES (N'GO')\ngo 2\nSELECT 1", 'sqlserver')
    expect(events).toEqual([
      { type: 'statement', text: 'CREATE TABLE t (a int)', line: 1 },
      { type: 'separator', text: 'GO', line: 2 },
      { type: 'statement', text: "INSERT t VALUES (N'GO')", line: 3 },
      { type: 'separator', text: 'go 2', line: 4 },
      { type: 'statement', text: 'SELECT 1', line: 5 },
    ])
  })

  it('does not split on a GO line inside a string', () => {
    expect(statements(splitScript("INSERT t VALUES ('line\nGO\nmore')\nGO\n", 'sqlserver'))).toEqual(["INSERT t VALUES ('line\nGO\nmore')"])
  })

  it('follows DELIMITER changes in MySQL dumps', () => {
    const script = 'DELIMITER ;;\nCREATE TRIGGER t BEFORE INSERT ON a FOR EACH ROW BEGIN SET @x = 1; END ;;\nDELIMITER ;\nSELECT 1;'
    const events = splitScript(script, 'mysql')
    expect(events.map((event) => event.type)).toEqual(['separator', 'statement', 'separator', 'statement'])
    expect(statements(events)[0]).toBe('CREATE TRIGGER t BEFORE INSERT ON a FOR EACH ROW BEGIN SET @x = 1; END')
  })

  it('keeps MySQL conditional comments as statements', () => {
    expect(statements(splitScript('/*!40101 SET NAMES utf8 */;\n/*!40000 ALTER TABLE `a` DISABLE KEYS */;', 'mysql'))).toEqual([
      '/*!40101 SET NAMES utf8 */',
      '/*!40000 ALTER TABLE `a` DISABLE KEYS */',
    ])
  })

  it('removes hash comments in MySQL', () => {
    expect(statements(splitScript('# header\nSELECT 1;', 'mysql'))).toEqual(['SELECT 1'])
  })

  it('reports the line where each statement starts', () => {
    const events = splitScript('\n\n/* intro\n */\nSELECT 1;\n\nINSERT INTO a\nVALUES (1);', 'mysql')
    expect(events.map((event) => event.line)).toEqual([5, 7])
  })

  it('gives the same result for any chunk size', () => {
    const script = "SET NAMES utf8;\nINSERT INTO `a` VALUES (1,'x\\'y;'),(2,'--');\n/*!40000 ALTER TABLE `a` ENABLE KEYS */;\nDELIMITER $$\nSELECT 1$$\nDELIMITER ;\nSELECT 2;"
    const expected = splitScript(script, 'mysql')
    for (const size of [1, 2, 3, 5, 7, 13]) expect(splitScript(script, 'mysql', size)).toEqual(expected)
    const serverScript = "CREATE TABLE [x]([a] [int])\r\nGO\r\nINSERT [x] VALUES (N'it''s')\r\nGO\r\n"
    const serverExpected = splitScript(serverScript, 'sqlserver')
    expect(statements(serverExpected)).toHaveLength(2)
    for (const size of [1, 2, 4, 9]) expect(splitScript(serverScript, 'sqlserver', size)).toEqual(serverExpected)
  })
})
