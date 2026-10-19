import { cellText, type QueryResult } from './queryResult'

export const minimumColumnWidth = 60
export const maximumInitialWidth = 360
const characterWidth = 7.5
const padding = 28
const sampleRows = 50

export function initialColumnWidths(result: QueryResult): number[] {
  return result.columns.map((column, columnIndex) => {
    let longest = column.name.length + 2
    for (let rowIndex = 0; rowIndex < Math.min(result.rowCount, sampleRows); rowIndex++) {
      longest = Math.max(longest, (cellText(result, rowIndex, columnIndex) ?? 'NULL').length)
    }
    return clampWidth(longest * characterWidth + padding, maximumInitialWidth)
  })
}

export function clampWidth(width: number, maximum = 2000): number {
  return Math.round(Math.min(maximum, Math.max(minimumColumnWidth, width)))
}
