import { DataType } from 'apache-arrow'
import { cellText, cellValue, type QueryResult } from '../results/queryResult'

export type ChartKind = 'bar' | 'line' | 'scatter' | 'pie'

export interface CategoryPoint {
  label: string
  value: number
}

export interface XYPoint {
  x: number
  y: number
  label: string
}

export const categoryLimit = 50
export const pieSliceLimit = 10
export const pointLimit = 5000

export function isNumericColumn(result: QueryResult, columnIndex: number): boolean {
  const type = result.table.schema.fields[columnIndex]?.type
  return Boolean(type && (DataType.isInt(type) || DataType.isFloat(type) || DataType.isDecimal(type)))
}

export function isTemporalColumn(result: QueryResult, columnIndex: number): boolean {
  const type = result.table.schema.fields[columnIndex]?.type
  return Boolean(type && (DataType.isDate(type) || DataType.isTimestamp(type)))
}

export function numericValue(result: QueryResult, rowIndex: number, columnIndex: number): number | null {
  if (isTemporalColumn(result, columnIndex)) {
    const raw = cellValue(result, rowIndex, columnIndex)
    return raw === null || raw === undefined ? null : Number(raw)
  }
  const text = cellText(result, rowIndex, columnIndex)
  if (text === null) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

export function categorySeries(result: QueryResult, rows: ArrayLike<number>, labelColumn: number, valueColumn: number, limit = categoryLimit): CategoryPoint[] {
  const totals = new Map<string, number>()
  for (let position = 0; position < rows.length; position++) {
    const rowIndex = rows[position]
    const value = numericValue(result, rowIndex, valueColumn)
    if (value === null) continue
    const label = cellText(result, rowIndex, labelColumn) ?? 'NULL'
    if (!totals.has(label) && totals.size >= limit) continue
    totals.set(label, (totals.get(label) ?? 0) + value)
  }
  return [...totals].map(([label, value]) => ({ label, value }))
}

export function pieSlices(points: CategoryPoint[], otherLabel: string, limit = pieSliceLimit): CategoryPoint[] {
  const positive = points.filter((point) => point.value > 0).sort((left, right) => right.value - left.value)
  if (positive.length <= limit) return positive
  const kept = positive.slice(0, limit - 1)
  const rest = positive.slice(limit - 1).reduce((sum, point) => sum + point.value, 0)
  return [...kept, { label: otherLabel, value: rest }]
}

export function pointSeries(result: QueryResult, rows: ArrayLike<number>, xColumn: number, yColumn: number, limit = pointLimit): XYPoint[] {
  const numericX = isNumericColumn(result, xColumn) || isTemporalColumn(result, xColumn)
  const points: XYPoint[] = []
  for (let position = 0; position < rows.length && points.length < limit; position++) {
    const rowIndex = rows[position]
    const y = numericValue(result, rowIndex, yColumn)
    const x = numericX ? numericValue(result, rowIndex, xColumn) : position
    if (y === null || x === null) continue
    points.push({ x, y, label: cellText(result, rowIndex, xColumn) ?? 'NULL' })
  }
  return points
}

export function niceTicks(minimum: number, maximum: number, desired = 5): number[] {
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return []
  if (minimum === maximum) return [minimum]
  const rawStep = (maximum - minimum) / desired
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rawStep)!
  const ticks: number[] = []
  for (let tick = Math.ceil(minimum / step) * step; tick <= maximum + step / 1e6; tick += step) ticks.push(Number(tick.toPrecision(12)))
  return ticks
}

export function extent(values: number[]): [number, number] {
  let minimum = Infinity
  let maximum = -Infinity
  for (const value of values) {
    if (value < minimum) minimum = value
    if (value > maximum) maximum = value
  }
  return [minimum, maximum]
}

export function defaultColumns(result: QueryResult): { x: number; y: number } {
  const numeric = result.columns.map((_, index) => index).filter((index) => isNumericColumn(result, index))
  const y = numeric.find((index) => index !== 0) ?? numeric[0] ?? 0
  const x = result.columns.findIndex((_, index) => index !== y)
  return { x: x === -1 ? 0 : x, y }
}
