import { useMemo, useState } from 'react'
import { useMessages } from '../i18n/i18nContext'
import type { QueryResult } from '../results/queryResult'
import { BarChart, XYChart } from './CartesianChart'
import { categorySeries, defaultColumns, isNumericColumn, isTemporalColumn, pieSlices, pointSeries, type ChartKind } from './chartData'
import { PieChart } from './PieChart'

const chartKinds: ChartKind[] = ['bar', 'line', 'scatter', 'pie']

export function ChartPanel({ result, rows }: { result: QueryResult; rows: Int32Array }) {
  const text = useMessages()
  const defaults = useMemo(() => defaultColumns(result), [result])
  const [kind, setKind] = useState<ChartKind>('bar')
  const [xColumn, setXColumn] = useState(defaults.x)
  const [yColumn, setYColumn] = useState(defaults.y)
  const numericColumns = result.columns.map((_, index) => index).filter((index) => isNumericColumn(result, index))
  const chartLabel = `${text.chartKinds[kind]}: ${result.columns[yColumn]?.name ?? ''} / ${result.columns[xColumn]?.name ?? ''}`

  return (
    <div className="chart-panel">
      <div className="chart-controls">
        <label>
          {text.chartType}
          <select aria-label={text.chartType} value={kind} onChange={(event) => setKind(event.target.value as ChartKind)}>
            {chartKinds.map((option) => (
              <option key={option} value={option}>
                {text.chartKinds[option]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {kind === 'pie' || kind === 'bar' ? text.chartCategory : text.chartXAxis}
          <select aria-label={text.chartXAxis} value={xColumn} onChange={(event) => setXColumn(Number(event.target.value))}>
            {result.columns.map((column, index) => (
              <option key={index} value={index}>
                {column.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {text.chartValue}
          <select aria-label={text.chartValue} value={yColumn} onChange={(event) => setYColumn(Number(event.target.value))}>
            {result.columns.map((column, index) => (
              <option key={index} value={index}>
                {column.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {numericColumns.length === 0 ? <p className="muted">{text.chartNeedsNumbers}</p> : <ChartBody result={result} rows={rows} kind={kind} xColumn={xColumn} yColumn={yColumn} label={chartLabel} />}
    </div>
  )
}

function ChartBody({ result, rows, kind, xColumn, yColumn, label }: { result: QueryResult; rows: Int32Array; kind: ChartKind; xColumn: number; yColumn: number; label: string }) {
  const text = useMessages()
  if (kind === 'bar') return <BarChart points={categorySeries(result, rows, xColumn, yColumn)} label={label} />
  if (kind === 'pie') return <PieChart slices={pieSlices(categorySeries(result, rows, xColumn, yColumn, 1000), text.chartOther)} label={label} />
  const xIsCategory = !isNumericColumn(result, xColumn) && !isTemporalColumn(result, xColumn)
  return <XYChart points={pointSeries(result, rows, xColumn, yColumn)} label={label} mode={kind} xIsCategory={xIsCategory} />
}
