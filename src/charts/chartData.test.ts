import { describe, expect, it } from 'vitest'
import { describeResult } from '../results/queryResult'
import { startSharedEngine } from '../test-support/sharedEngine'
import { categorySeries, defaultColumns, extent, niceTicks, pieSlices, pointSeries } from './chartData'

const engine = startSharedEngine()

async function sample() {
  const sql = `SELECT * FROM (VALUES ('north', 1.5::DECIMAL(4,1), DATE '2024-01-01'), ('south', 2.0, DATE '2024-01-02'), ('north', 3.0, NULL), (NULL, NULL, DATE '2024-01-03')) AS t(region, amount, day)`
  return describeResult(sql, await engine().run(sql), 1)
}

describe('chart data', () => {
  it('sums values per category in order of appearance', async () => {
    const result = await sample()
    expect(categorySeries(result, [0, 1, 2, 3], 0, 1)).toEqual([
      { label: 'north', value: 4.5 },
      { label: 'south', value: 2 },
    ])
    expect(categorySeries(result, [0, 1, 2], 0, 1, 1)).toEqual([{ label: 'north', value: 4.5 }])
  })

  it('builds points with dates or row positions on the x axis', async () => {
    const result = await sample()
    expect(pointSeries(result, [0, 1, 2, 3], 2, 1)).toEqual([
      { x: Date.UTC(2024, 0, 1), y: 1.5, label: '2024-01-01' },
      { x: Date.UTC(2024, 0, 2), y: 2, label: '2024-01-02' },
    ])
    expect(pointSeries(result, [0, 1, 2], 0, 1).map((point) => point.x)).toEqual([0, 1, 2])
  })

  it('groups small pie slices into one', () => {
    const points = [5, 4, 3, 2, 1, 0].map((value, index) => ({ label: `p${index}`, value }))
    expect(pieSlices(points, 'Other', 3)).toEqual([
      { label: 'p0', value: 5 },
      { label: 'p1', value: 4 },
      { label: 'Other', value: 6 },
    ])
  })

  it('picks readable ticks', () => {
    expect(niceTicks(0, 10)).toEqual([0, 2, 4, 6, 8, 10])
    expect(niceTicks(0.1, 0.9, 4)).toEqual([0.2, 0.4, 0.6, 0.8])
    expect(niceTicks(3, 3)).toEqual([3])
    expect(extent([3, -1, 2])).toEqual([-1, 3])
  })

  it('suggests a label column and a numeric column', async () => {
    expect(defaultColumns(await sample())).toEqual({ x: 0, y: 1 })
  })
})
