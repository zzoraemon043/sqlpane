import { describe, expect, it } from 'vitest'
import { tableNameFromFileName, uniqueColumnNames, uniqueTableName } from './tableNames'

describe('table names', () => {
  it('uses the file name without folders and known extensions', () => {
    expect(tableNameFromFileName('C:\\data\\sales 2024.csv')).toBe('sales 2024')
    expect(tableNameFromFileName('exports/orders.ndjson')).toBe('orders')
    expect(tableNameFromFileName('archive.tar.gz')).toBe('archive.tar.gz')
    expect(tableNameFromFileName('.csv')).toBe('table')
  })

  it('adds a numeric suffix when the name is taken, ignoring case', () => {
    expect(uniqueTableName('orders', ['Orders', 'orders_2'])).toBe('orders_3')
    expect(uniqueTableName('orders', ['customers'])).toBe('orders')
  })

  it('fills blank column names and separates duplicates', () => {
    expect(uniqueColumnNames(['id', '', 'Name', 'name', ' '])).toEqual(['id', 'column2', 'Name', 'name_2', 'column5'])
  })
})
