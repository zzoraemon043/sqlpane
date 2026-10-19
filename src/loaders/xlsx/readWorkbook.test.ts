import { beforeAll, describe, expect, it } from 'vitest'
import { installDomParser } from '../../test-support/domParser'
import { buildXlsx } from '../../test-support/xlsxFixture'
import { isDateFormat, serialToDate } from './dateFormats'
import { columnIndexFromReference, readWorkbook } from './readWorkbook'

beforeAll(installDomParser)

describe('xlsx reader', () => {
  it('reads shared strings, inline strings, numbers, booleans, errors and dates per sheet', () => {
    const bytes = buildXlsx(
      [
        {
          name: 'Orders',
          rowsXml:
            '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="inlineStr"><is><t>paid</t></is></c><c r="D1" t="s"><v>2</v></c></row>' +
            '<row r="2"><c r="A2"><v>1</v></c><c r="B2" s="1"><v>45292</v></c><c r="C2" t="b"><v>1</v></c><c r="D2" t="e"><v>#DIV/0!</v></c></row>' +
            '<row r="4"><c r="A4"><v>2.5</v></c><c r="C4" t="b"><v>0</v></c><c r="D4" t="str"><v>formula text</v></c></row>',
        },
        { name: 'Empty', rowsXml: '' },
      ],
      ['id', 'day', 'note'],
    )
    const [orders, empty] = readWorkbook(bytes)
    expect(orders.name).toBe('Orders')
    expect(orders.rows).toEqual([
      ['id', 'day', 'paid', 'note'],
      [1, new Date(Date.UTC(2024, 0, 1)), true, null],
      [],
      [2.5, null, false, 'formula text'],
    ])
    expect(empty).toEqual({ name: 'Empty', rows: [] })
  })

  it('converts column letters to indexes', () => {
    expect(columnIndexFromReference('A1')).toBe(0)
    expect(columnIndexFromReference('Z9')).toBe(25)
    expect(columnIndexFromReference('AA10')).toBe(26)
  })

  it('recognizes date formats', () => {
    expect(isDateFormat(14, undefined)).toBe(true)
    expect(isDateFormat(2, undefined)).toBe(false)
    expect(isDateFormat(164, 'yyyy/mm/dd')).toBe(true)
    expect(isDateFormat(165, '"Total" 0.00')).toBe(false)
    expect(isDateFormat(166, '[Red]0.00')).toBe(false)
  })

  it('supports both date systems', () => {
    expect(serialToDate(1, false).toISOString()).toBe('1899-12-31T00:00:00.000Z')
    expect(serialToDate(0, true).toISOString()).toBe('1904-01-01T00:00:00.000Z')
    expect(serialToDate(45292.5, false).toISOString()).toBe('2024-01-01T12:00:00.000Z')
  })

  it('rejects a file that is not a workbook', () => {
    expect(() => readWorkbook(new Uint8Array([1, 2, 3]))).toThrow()
  })
})
