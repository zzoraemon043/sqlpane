import { arcPath, chartHeight, chartWidth, truncateLabel } from './chartGeometry'
import type { CategoryPoint } from './chartData'

const sliceColors = 10

export function PieChart({ slices, label }: { slices: CategoryPoint[]; label: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const radius = chartHeight / 2 - 24
  const centerX = chartHeight / 2 + 24
  const centerY = chartHeight / 2
  const boundaries = slices.reduce<number[]>((angles, slice) => [...angles, angles[angles.length - 1] + (total > 0 ? (slice.value / total) * Math.PI * 2 : 0)], [0])
  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="chart" role="img" aria-label={label}>
      {slices.map((slice, index) => (
        <path key={slice.label} className={`chart-slice slice-${index % sliceColors}`} d={arcPath(centerX, centerY, radius, boundaries[index], boundaries[index + 1])}>
          <title>{`${slice.label}: ${slice.value} (${((slice.value / total) * 100).toFixed(1)}%)`}</title>
        </path>
      ))}
      <g className="chart-legend">
        {slices.map((slice, index) => (
          <g key={slice.label} transform={`translate(${chartHeight + 64} ${32 + index * 28})`}>
            <rect className={`chart-slice slice-${index % sliceColors}`} width={14} height={14} rx={3} />
            <text x={22} y={12}>
              {truncateLabel(slice.label, 28)} · {((slice.value / total) * 100).toFixed(1)}%
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
