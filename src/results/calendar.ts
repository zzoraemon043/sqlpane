const infiniteEpoch = 9223372036854775807n
const infiniteDays = 2147483647n

function floorDiv(value: bigint, divisor: bigint): bigint {
  const quotient = value / divisor
  return value % divisor < 0n ? quotient - 1n : quotient
}

function civilFromDays(days: bigint): { year: bigint; month: number; day: number } {
  const shifted = days + 719468n
  const era = floorDiv(shifted, 146097n)
  const dayOfEra = shifted - era * 146097n
  const yearOfEra = (dayOfEra - dayOfEra / 1460n + dayOfEra / 36524n - dayOfEra / 146096n) / 365n
  const dayOfYear = dayOfEra - (365n * yearOfEra + yearOfEra / 4n - yearOfEra / 100n)
  const monthIndex = (5n * dayOfYear + 2n) / 153n
  const day = Number(dayOfYear - (153n * monthIndex + 2n) / 5n + 1n)
  const month = Number(monthIndex < 10n ? monthIndex + 3n : monthIndex - 9n)
  const year = yearOfEra + era * 400n + (month <= 2 ? 1n : 0n)
  return { year, month, day }
}

function formatCivilDate(days: bigint): { text: string; era: string } {
  const { year, month, day } = civilFromDays(days)
  const shown = year >= 1n ? year : 1n - year
  return {
    text: `${String(shown).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    era: year >= 1n ? '' : ' (BC)',
  }
}

export function formatDateMilliseconds(milliseconds: number): string {
  const days = BigInt(Math.round(milliseconds / 86_400_000))
  if (days >= infiniteDays) return 'infinity'
  if (days <= -infiniteDays) return '-infinity'
  const { text, era } = formatCivilDate(days)
  return `${text}${era}`
}

export function isInfiniteEpoch(epoch: bigint): boolean {
  return epoch === infiniteEpoch || epoch === -infiniteEpoch
}

export function formatEpoch(epoch: bigint, perSecond: bigint): string {
  if (epoch === infiniteEpoch) return 'infinity'
  if (epoch === -infiniteEpoch) return '-infinity'
  const seconds = floorDiv(epoch, perSecond)
  const fraction = epoch - seconds * perSecond
  const secondOfDay = Number(seconds - floorDiv(seconds, 86_400n) * 86_400n)
  const { text, era } = formatCivilDate(floorDiv(seconds, 86_400n))
  const clock = [Math.floor(secondOfDay / 3600), Math.floor((secondOfDay % 3600) / 60), secondOfDay % 60]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
  const digits = fraction === 0n ? '' : `.${fraction.toString().padStart(String(perSecond).length - 1, '0').replace(/0+$/, '')}`
  return `${text}${era} ${clock}${digits}`
}
