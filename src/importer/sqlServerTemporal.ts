const DAY_MS = 86_400_000

const temporalTypes = new Set(['DATETIME', 'SMALLDATETIME', 'DATE', 'DATETIME2', 'TIME'])

export function isSqlServerTemporal(castType: string | undefined): castType is string {
  return castType !== undefined && temporalTypes.has(castType)
}

interface Moment {
  days: number
  epoch: number
  micros: number
}

export function sqlServerTemporalText(hex: string, castType: string, columnType: string): string | null {
  const moment = decodeMoment(hexBytes(hex), castType)
  if (!moment) return null
  if (columnType === 'TIME') return formatTime(moment.micros)
  const date = formatDate(moment.epoch + moment.days * DAY_MS)
  return columnType === 'DATE' ? date : `${date} ${formatTime(moment.micros)}`
}

function decodeMoment(bytes: number[], castType: string): Moment | null {
  switch (castType) {
    case 'DATETIME':
      if (bytes.length !== 8) return null
      return { days: bigEndian(bytes.slice(0, 4), true), epoch: EPOCH_1900, micros: Math.round((bigEndian(bytes.slice(4)) * 10_000) / 3) }
    case 'SMALLDATETIME':
      if (bytes.length !== 4) return null
      return { days: bigEndian(bytes.slice(0, 2)), epoch: EPOCH_1900, micros: bigEndian(bytes.slice(2)) * 60_000_000 }
    case 'DATE':
      if (bytes.length < 3) return null
      return { days: littleEndian(bytes.slice(0, 3)), epoch: EPOCH_0001, micros: 0 }
    case 'DATETIME2':
      return decodeDateTime2(bytes)
    case 'TIME':
      return decodeTime(bytes)
  }
  return null
}

function decodeDateTime2(bytes: number[]): Moment | null {
  const precision = bytes[0]
  if (precision === undefined || precision > 7) return null
  const timeLength = timeByteLength(precision)
  if (bytes.length < 1 + timeLength + 3) return null
  const micros = scaleToMicros(littleEndian(bytes.slice(1, 1 + timeLength)), precision)
  return { days: littleEndian(bytes.slice(1 + timeLength, 4 + timeLength)), epoch: EPOCH_0001, micros }
}

function decodeTime(bytes: number[]): Moment | null {
  const precision = bytes[0]
  if (precision === undefined || precision > 7) return null
  const timeLength = timeByteLength(precision)
  if (bytes.length < 1 + timeLength) return null
  return { days: 0, epoch: EPOCH_0001, micros: scaleToMicros(littleEndian(bytes.slice(1, 1 + timeLength)), precision) }
}

function timeByteLength(precision: number): number {
  return precision <= 2 ? 3 : precision <= 4 ? 4 : 5
}

function scaleToMicros(units: number, precision: number): number {
  return precision >= 6 ? Math.floor(units / 10 ** (precision - 6)) : units * 10 ** (6 - precision)
}

const EPOCH_1900 = Date.UTC(1900, 0, 1)

const EPOCH_0001 = (() => {
  const date = new Date(0)
  date.setUTCFullYear(1, 0, 1)
  return date.getTime()
})()

function hexBytes(hex: string): number[] {
  const even = hex.length % 2 === 1 ? `0${hex}` : hex
  return (even.match(/../g) ?? []).map((pair) => Number.parseInt(pair, 16))
}

function bigEndian(bytes: number[], signed = false): number {
  const value = bytes.reduce((sum, byte) => sum * 256 + byte, 0)
  const range = 256 ** bytes.length
  return signed && value >= range / 2 ? value - range : value
}

function littleEndian(bytes: number[]): number {
  return bigEndian([...bytes].reverse())
}

function formatDate(ms: number): string {
  const date = new Date(ms)
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

function formatTime(micros: number): string {
  const seconds = Math.floor(micros / 1_000_000)
  const fraction = micros % 1_000_000
  const clock = `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`
  return fraction === 0 ? clock : `${clock}.${String(fraction).padStart(6, '0')}`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
