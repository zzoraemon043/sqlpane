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

  it('quotes options safely', () => {
    expect(readCsvExpression("it's.csv", { delimiter: '|', header: true })).toBe(
      "read_csv('it''s.csv', auto_detect = true, delim = '|', header = true)",
    )
  })
})
