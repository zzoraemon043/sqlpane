import { describe, expect, it } from 'vitest'
import { startSharedEngine } from '../test-support/sharedEngine'
import { describeResult } from './queryResult'
import { filteredRowIndexes, nextSort, sortRowIndexes, visibleRowIndexes } from './resultView'

const engine = startSharedEngine()

async function sampleResult() {
  const sql = "SELECT * FROM (VALUES (3, 'Taipei', 1.5::DECIMAL(4,1)), (1, 'tainan', NULL), (2, NULL, 0.5), (10, 'Keelung', 2.0)) AS t(id, city, score)"
  return describeResult(sql, await engine().run(sql), 1)
}

describe('result view', () => {
  it('cycles sorting ascending, descending and off', () => {
    const ascending = nextSort(undefined, 1)
    expect(ascending).toEqual({ columnIndex: 1, direction: 'ascending' })
    const descending = nextSort(ascending, 1)
    expect(descending).toEqual({ columnIndex: 1, direction: 'descending' })
    expect(nextSort(descending, 1)).toBeUndefined()
    expect(nextSort(descending, 0)).toEqual({ columnIndex: 0, direction: 'ascending' })
  })

  it('sorts numbers numerically and keeps missing values last', async () => {
    const result = await sampleResult()
    const all = Int32Array.from([0, 1, 2, 3])
    expect([...sortRowIndexes(result, all, { columnIndex: 0, direction: 'ascending' })]).toEqual([1, 2, 0, 3])
    expect([...sortRowIndexes(result, all, { columnIndex: 0, direction: 'descending' })]).toEqual([3, 0, 2, 1])
    expect([...sortRowIndexes(result, all, { columnIndex: 2, direction: 'descending' })]).toEqual([3, 0, 2, 1])
    expect([...sortRowIndexes(result, all, { columnIndex: 1, direction: 'ascending' })]).toEqual([3, 0, 1, 2])
  })

  it('filters by text without case and by NULL', async () => {
    const result = await sampleResult()
    expect([...filteredRowIndexes(result, { 1: 'TAI' })]).toEqual([0, 1])
    expect([...filteredRowIndexes(result, { 1: 'null' })]).toEqual([2])
    expect([...filteredRowIndexes(result, { 1: 'tai', 0: '3' })]).toEqual([0])
    expect([...filteredRowIndexes(result, { 1: '  ' })]).toEqual([0, 1, 2, 3])
  })

  it('combines filtering and sorting', async () => {
    const result = await sampleResult()
    expect([...visibleRowIndexes(result, { 1: 'e' }, { columnIndex: 0, direction: 'descending' })]).toEqual([3, 0])
  })
})
