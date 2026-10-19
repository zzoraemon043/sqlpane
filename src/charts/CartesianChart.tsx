import { chartHeight, chartWidth, compactNumber, linearScale, margin, truncateLabel } from './chartGeometry'
import { extent, niceTicks, type CategoryPoint, type XYPoint } from './chartData'

const plotWidth = chartWidth - margin.left - margin.right
const plotHeight = chartHeight - margin.top - margin.bottom

function yScaleFor(values: number[]) {
  const [low, high] = extent(values)
  const minimum = Math.min(0, low)
  const maximum = Math.max(0, high)
  const ticks = niceTicks(minimum, maximum)
  const domain: [number, number] = [Math.min(minimum, ticks[0] ?? minimum), Math.max(maximum, ticks.at(-1) ?? maximum)]
  return { scale: linearScale(domain, [margin.top + plotHeight, margin.top]), ticks }
}

function YAxis({ ticks, scale }: { ticks: number[]; scale: (value: number) => number }) {
  return (
    <g className="chart-axis">
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={margin.left} x2={margin.left + plotWidth} y1={scale(tick)} y2={scale(tick)} className="chart-grid" />
          <text x={margin.left - 8} y={scale(tick)} textAnchor="end" dominantBaseline="middle">
            {compactNumber(tick)}
          </text>
        </g>
      ))}
    </g>
  )
}

export function BarChart({ points, label }: { points: CategoryPoint[]; label: string }) {
  const { scale, ticks } = yScaleFor(points.map((point) => point.value))
  const band = plotWidth / Math.max(points.length, 1)
  const zero = scale(0)
  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="chart" role="img" aria-label={label}>
      <YAxis ticks={ticks} scale={scale} />
      {points.map((point, index) => {
        const x = margin.left + index * band + band * 0.1
        const y = scale(point.value)
        return (
          <g key={point.label}>
            <rect className="chart-bar" x={x} y={Math.min(y, zero)} width={band * 0.8} height={Math.abs(zero - y)}>
              <title>{`${point.label}: ${point.value}`}</title>
            </rect>
            <text className="chart-label" transform={`translate(${x + band * 0.4} ${margin.top + plotHeight + 12}) rotate(35)`}>
              {truncateLabel(point.label)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function XYChart({ points, label, mode, xIsCategory }: { points: XYPoint[]; label: string; mode: 'line' | 'scatter'; xIsCategory: boolean }) {
  const { scale: yScale, ticks: yTicks } = yScaleFor(points.map((point) => point.y))
  const [xLow, xHigh] = extent(points.map((point) => point.x))
  const xScale = linearScale([xLow, xHigh === xLow ? xLow + 1 : xHigh], [margin.left, margin.left + plotWidth])
  const ordered = mode === 'line' ? [...points].sort((left, right) => left.x - right.x) : points
  const path = ordered.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xScale(point.x).toFixed(1)} ${yScale(point.y).toFixed(1)}`).join(' ')
  const labelEvery = Math.max(1, Math.ceil(ordered.length / 12))
  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="chart" role="img" aria-label={label}>
      <YAxis ticks={yTicks} scale={yScale} />
      <g className="chart-axis">
        {ordered
          .filter((_, index) => index % labelEvery === 0)
          .map((point, index) => (
            <text key={index} className="chart-label" transform={`translate(${xScale(point.x)} ${margin.top + plotHeight + 12}) rotate(35)`}>
              {truncateLabel(xIsCategory ? point.label : point.label)}
            </text>
          ))}
      </g>
      {mode === 'line' && <path className="chart-line" d={path} />}
      {ordered.map((point, index) => (
        <circle key={index} className="chart-point" cx={xScale(point.x)} cy={yScale(point.y)} r={mode === 'line' ? 2.5 : 3.5}>
          <title>{`${point.label}: ${point.y}`}</title>
        </circle>
      ))}
    </svg>
  )
}
