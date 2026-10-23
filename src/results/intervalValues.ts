import { DataType, IntervalUnit, type Vector } from 'apache-arrow'

export interface IntervalValue {
  months: number
  days: number
  nanoseconds: bigint
}

export function isMonthDayNano(vector: Vector): boolean {
  return DataType.isInterval(vector.type) && Number(vector.type.unit) === IntervalUnit.MONTH_DAY_NANO
}

export function monthDayNanoReader(vector: Vector): (rowIndex: number) => IntervalValue | null {
  const starts: number[] = []
  let total = 0
  for (const chunk of vector.data) {
    starts.push(total)
    total += chunk.length
  }
  return (rowIndex) => {
    if (rowIndex < 0 || rowIndex >= total || !vector.isValid(rowIndex)) return null
    let chunkIndex = starts.length - 1
    while (chunkIndex > 0 && starts[chunkIndex] > rowIndex) chunkIndex--
    const values = vector.data[chunkIndex].values as Int32Array
    const base = (rowIndex - starts[chunkIndex]) * 4
    const nanoseconds = (BigInt(values[base + 3]) << 32n) | BigInt(values[base + 2] >>> 0)
    return { months: values[base], days: values[base + 1], nanoseconds }
  }
}

export function intervalFromParts(unit: IntervalUnit, parts: ArrayLike<number>): IntervalValue {
  if (unit === IntervalUnit.DAY_TIME) return { months: 0, days: parts[0], nanoseconds: BigInt(parts[1]) * 1_000_000n }
  return { months: parts[0] * 12 + parts[1], days: 0, nanoseconds: 0n }
}

function countText(count: number, unit: string): string {
  return `${count} ${Math.abs(count) === 1 ? unit : `${unit}s`}`
}

function clockText(nanoseconds: bigint): string {
  const sign = nanoseconds < 0n ? '-' : ''
  const microseconds = (nanoseconds < 0n ? -nanoseconds : nanoseconds) / 1_000n
  const seconds = microseconds / 1_000_000n
  const fraction = microseconds % 1_000_000n
  const clock = [seconds / 3600n, (seconds % 3600n) / 60n, seconds % 60n].map((part) => part.toString().padStart(2, '0')).join(':')
  const fractionText = fraction === 0n ? '' : `.${fraction.toString().padStart(6, '0').replace(/0+$/, '')}`
  return `${sign}${clock}${fractionText}`
}

export function formatIntervalValue({ months, days, nanoseconds }: IntervalValue): string {
  const years = Math.trunc(months / 12)
  const pieces: string[] = []
  if (years !== 0) pieces.push(countText(years, 'year'))
  if (months % 12 !== 0) pieces.push(countText(months % 12, 'month'))
  if (days !== 0) pieces.push(countText(days, 'day'))
  if (nanoseconds !== 0n || pieces.length === 0) pieces.push(clockText(nanoseconds))
  return pieces.join(' ')
}
