const builtInDateFormatIds = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57])

export function isDateFormat(formatId: number, formatCode: string | undefined): boolean {
  if (formatCode === undefined) return builtInDateFormatIds.has(formatId)
  const withoutLiterals = formatCode.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, '')
  return /[dmyhs]/i.test(withoutLiterals) && !/^general$/i.test(withoutLiterals.trim())
}

const millisecondsPerDay = 86_400_000
const epoch1900 = Date.UTC(1899, 11, 30)
const epoch1904 = Date.UTC(1904, 0, 1)

export function serialToDate(serial: number, uses1904: boolean): Date {
  const epoch = uses1904 ? epoch1904 : epoch1900
  return new Date(Math.round(epoch + serial * millisecondsPerDay))
}
