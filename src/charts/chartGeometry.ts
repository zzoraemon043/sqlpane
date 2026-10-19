export const chartWidth = 800
export const chartHeight = 380
export const margin = { top: 16, right: 24, bottom: 72, left: 72 }

export function linearScale(domain: [number, number], range: [number, number]) {
  const [domainStart, domainEnd] = domain
  const [rangeStart, rangeEnd] = range
  const span = domainEnd - domainStart || 1
  return (value: number) => rangeStart + ((value - domainStart) / span) * (rangeEnd - rangeStart)
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: Math.abs(value) >= 100_000 ? 'compact' : 'standard', maximumFractionDigits: 2 }).format(value)
}

export function truncateLabel(label: string, length = 14): string {
  return label.length > length ? `${label.slice(0, length - 1)}…` : label
}

export function arcPath(centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number): string {
  const point = (angle: number) => [centerX + radius * Math.sin(angle), centerY - radius * Math.cos(angle)]
  if (endAngle - startAngle >= Math.PI * 2 - 1e-9) {
    return `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 1 1 ${centerX - 0.01} ${centerY - radius} Z`
  }
  const [startX, startY] = point(startAngle)
  const [endX, endY] = point(endAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`
}
