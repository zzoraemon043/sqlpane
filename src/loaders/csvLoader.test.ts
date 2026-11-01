import { describe, expect, it } from 'vitest'
import { selectRows, startSharedEngine } from '../test-support/sharedEngine'
import { loadDelimitedFile, readCsvExpression } from './csvLoader'

const engine = startSharedEngine()
const encode = (text: string) => new TextEncoder().encode(text)

describe('delimited file loader', () => {
  it('detects header, delimiter and types', async () => {
    const result = await loadDelimitedFile(engine(), 'sales', 'sales.csv', encode('id,amount,day\n1,2.5,2024-01-01\n2,3.5,2024-01-02\n'), {})
    expect(result.tables).toEqual([{ name: 'sales', rowCount: 2 }])
    const types = await selectRows(engine(), "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sales' ORDER BY ordinal_position")
    expect(types.map((row) => row.data_type)).toEqual(['BIGINT', 'DOUBLE', 'DATE'])
  })

  it('reads tab separated text', async () => {
    await loadDelimitedFile(engine(), 'tabbed', 'tabbed.tsv', encode('name\tcity\nAmy\tTaipei\n'), { delimiter: '\t' })
    expect(await selectRows(engine(), 'SELECT * FROM tabbed')).toEqual([{ name: 'Amy', city: 'Taipei' }])
  })

  it('lets the user override the delimiter and header', async () => {
    await loadDelimitedFile(engine(), 'raw', 'raw.csv', encode('1;2\n3;4\n'), { delimiter: ';', header: false })
    expect(await selectRows(engine(), 'SELECT * FROM raw ORDER BY 1')).toEqual([
      { column0: 1, column1: 2 },
      { column0: 3, column1: 4 },
    ])
  })

  it('pads short rows instead of collapsing to one column', async () => {
    await loadDelimitedFile(engine(), 'ragged', 'ragged.csv', encode('a,b,c\n1,2,3\n4,5\n7,8,9\n'), {})
    expect(await selectRows(engine(), 'SELECT * FROM ragged ORDER BY a')).toEqual([
      { a: 1, b: 2, c: 3 },
      { a: 4, b: 5, c: null },
      { a: 7, b: 8, c: 9 },
    ])
  })

  it('infers types from every row when a late value changes the type', async () => {
    const lines = Array.from({ length: 25000 }, (_, index) => `${index},${index}`)
    const text = `id,v\n${lines.join('\n')}\n25000,abc\n`
    const result = await loadDelimitedFile(engine(), 'late', 'late.csv', encode(text), {})
    expect(result.tables).toEqual([{ name: 'late', rowCount: 25001 }])
    const types = await selectRows(engine(), "SELECT data_type FROM information_schema.columns WHERE table_name = 'late' ORDER BY ordinal_position")
    expect(types.map((row) => row.data_type)).toEqual(['BIGINT', 'VARCHAR'])
  })

  it('quotes options safely', () => {
    expect(readCsvExpression("it's.csv", { delimiter: '|', header: true })).toBe(
      "read_csv('it''s.csv', auto_detect = true, null_padding = true, delim = '|', header = true)",
    )
  })
})
