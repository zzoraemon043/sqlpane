import { beforeAll, describe, expect, it } from 'vitest'
import { installDomParser } from '../test-support/domParser'
import { selectRows, startSharedEngine } from '../test-support/sharedEngine'
import { buildXlsx } from '../test-support/xlsxFixture'
import { loadExcelWorkbook } from './excelLoader'

beforeAll(installDomParser)
const engine = startSharedEngine()

describe('excel loader', () => {
  it('creates one table per sheet named after the file and sheet', async () => {
    const bytes = buildXlsx(
      [
        {
          name: 'Items',
          rowsXml:
            '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>' +
            '<row r="2"><c r="A2"><v>1</v></c><c r="B2" t="s"><v>3</v></c><c r="C2" s="2"><v>45292</v></c></row>' +
            '<row r="3"><c r="A3"><v>2</v></c><c r="B3" t="s"><v>4</v></c></row>',
        },
        { name: 'Notes', rowsXml: '<row r="1"><c r="A1" t="inlineStr"><is><t>text</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>hello</t></is></c></row>' },
        { name: 'Blank', rowsXml: '' },
      ],
      ['id', 'name', 'added', '蘋果', 'pear'],
    )
    const result = await loadExcelWorkbook(engine(), 'stock', bytes, ['stock_Items'])
    expect(result.tables).toEqual([
      { name: 'stock_Items_2', rowCount: 2 },
      { name: 'stock_Notes', rowCount: 1 },
    ])
    expect(result.warnings).toEqual(['empty sheet skipped: Blank'])
    expect(await selectRows(engine(), 'SELECT id, name, CAST(added AS VARCHAR) AS added FROM stock_Items_2 ORDER BY id')).toEqual([
      { id: 1, name: '蘋果', added: '2024-01-01 00:00:00' },
      { id: 2, name: 'pear', added: null },
    ])
    expect(await selectRows(engine(), 'SELECT * FROM stock_Notes')).toEqual([{ text: 'hello' }])
  })
})
