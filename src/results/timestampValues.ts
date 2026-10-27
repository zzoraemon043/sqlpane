import { DataType, type Vector } from 'apache-arrow'

const unitsPerSecond = [1n, 1_000n, 1_000_000n, 1_000_000_000n]

export class TimestampValue {
  constructor(
    readonly epoch: bigint,
    readonly unit: number,
  ) {}

  get perSecond(): bigint {
    return unitsPerSecond[this.unit] ?? 1n
  }

  valueOf(): number {
    return Number((this.epoch * 1000n) / this.perSecond)
  }
}

export function isTimestampVector(vector: Vector): boolean {
  return DataType.isTimestamp(vector.type)
}

export function timestampReader(vector: Vector): (rowIndex: number) => TimestampValue | null {
  const unit = Number((vector.type as { unit: number }).unit)
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
    return new TimestampValue(rawEpoch(vector.data[chunkIndex].values, rowIndex - starts[chunkIndex]), unit)
  }
}

function rawEpoch(values: ArrayLike<number | bigint>, offset: number): bigint {
  if (values instanceof BigInt64Array) return values[offset]
  const words = values as Int32Array
  return (BigInt(words[offset * 2 + 1]) << 32n) | BigInt(words[offset * 2] >>> 0)
}

export function formatTimestampValue(value: TimestampValue): string {
  const perSecond = value.perSecond
  let seconds = value.epoch / perSecond
  let fraction = value.epoch % perSecond
  if (fraction < 0n) {
    seconds -= 1n
    fraction += perSecond
  }
  const clock = new Date(Number(seconds) * 1000).toISOString().replace('T', ' ').slice(0, 19)
  if (fraction === 0n) return clock
  return `${clock}.${fraction.toString().padStart(String(perSecond).length - 1, '0').replace(/0+$/, '')}`
}
