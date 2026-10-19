import { cellText, type QueryResult } from '../results/queryResult'

const byteOrderMark = String.fromCharCode(0xfeff)

export function csvField(text: string | null): string {
  if (text === null) return ''
  return /[",\r\n]/.test(text) || text.trim() !== text ? `"${text.replaceAll('"', '""')}"` : text
}

export function exportCsv(result: QueryResult, rows: ArrayLike<number>): string {
  const lines = [result.columns.map((column) => csvField(column.name)).join(',')]
  for (let position = 0; position < rows.length; position++) {
    const rowIndex = rows[position]
    lines.push(result.columns.map((_, columnIndex) => csvField(cellText(result, rowIndex, columnIndex))).join(','))
  }
  return `${byteOrderMark}${lines.join('\r\n')}\r\n`
}
