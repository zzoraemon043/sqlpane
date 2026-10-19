import { strFromU8, unzipSync, type Unzipped } from 'fflate'
import { isDateFormat, serialToDate } from './dateFormats'
import { attributeByLocalName, childrenByLocalName, elementsByLocalName, parseXml } from './xmlDocument'

export type CellValue = string | number | boolean | Date | null

export interface Worksheet {
  name: string
  rows: CellValue[][]
}

interface WorkbookContext {
  files: Unzipped
  sharedStrings: string[]
  dateStyleIndexes: Set<number>
  uses1904: boolean
}

export function readWorkbook(bytes: Uint8Array): Worksheet[] {
  const files = unzipSync(bytes)
  const workbook = parseXml(readText(files, 'xl/workbook.xml'))
  const context: WorkbookContext = {
    files,
    sharedStrings: readSharedStrings(files),
    dateStyleIndexes: readDateStyleIndexes(files),
    uses1904: elementsByLocalName(workbook, 'workbookPr').some((element) =>
      ['1', 'true'].includes(attributeByLocalName(element, 'date1904') ?? ''),
    ),
  }
  const targets = readRelationshipTargets(files)
  return elementsByLocalName(workbook, 'sheet').map((sheet) => {
    const relationshipId = attributeByLocalName(sheet, 'id') ?? ''
    const path = resolveSheetPath(targets.get(relationshipId) ?? '')
    return { name: sheet.getAttribute('name') ?? 'Sheet', rows: readSheetRows(context, path) }
  })
}

function readText(files: Unzipped, path: string): string {
  const entry = files[path]
  if (!entry) throw new Error(`the workbook is missing ${path}`)
  return strFromU8(entry)
}

function readOptionalText(files: Unzipped, path: string): string | undefined {
  const entry = files[path]
  return entry ? strFromU8(entry) : undefined
}

function readSharedStrings(files: Unzipped): string[] {
  const text = readOptionalText(files, 'xl/sharedStrings.xml')
  if (text === undefined) return []
  return elementsByLocalName(parseXml(text), 'si').map(textContentOfStringItem)
}

function textContentOfStringItem(item: Element): string {
  return elementsByLocalName(item, 't')
    .filter((element) => element.parentElement?.localName !== 'rPh')
    .map((element) => element.textContent ?? '')
    .join('')
}

function readDateStyleIndexes(files: Unzipped): Set<number> {
  const text = readOptionalText(files, 'xl/styles.xml')
  if (text === undefined) return new Set()
  const styles = parseXml(text)
  const customFormats = new Map<number, string>()
  for (const format of elementsByLocalName(styles, 'numFmt')) {
    customFormats.set(Number(format.getAttribute('numFmtId')), format.getAttribute('formatCode') ?? '')
  }
  const cellFormats = elementsByLocalName(styles, 'cellXfs')[0]
  if (!cellFormats) return new Set()
  const indexes = new Set<number>()
  childrenByLocalName(cellFormats, 'xf').forEach((format, index) => {
    const formatId = Number(format.getAttribute('numFmtId') ?? 0)
    if (isDateFormat(formatId, customFormats.get(formatId))) indexes.add(index)
  })
  return indexes
}

function readRelationshipTargets(files: Unzipped): Map<string, string> {
  const text = readOptionalText(files, 'xl/_rels/workbook.xml.rels')
  const targets = new Map<string, string>()
  if (text === undefined) return targets
  for (const relationship of elementsByLocalName(parseXml(text), 'Relationship')) {
    targets.set(relationship.getAttribute('Id') ?? '', relationship.getAttribute('Target') ?? '')
  }
  return targets
}

function resolveSheetPath(target: string): string {
  if (target.startsWith('/')) return target.slice(1)
  return `xl/${target}`
}

function readSheetRows(context: WorkbookContext, path: string): CellValue[][] {
  const text = readOptionalText(context.files, path)
  if (text === undefined) return []
  const rows: CellValue[][] = []
  let nextRowIndex = 0
  for (const row of elementsByLocalName(parseXml(text), 'row')) {
    const rowNumber = Number(row.getAttribute('r') ?? nextRowIndex + 1)
    nextRowIndex = rowNumber
    const values: CellValue[] = []
    let nextColumnIndex = 0
    for (const cell of childrenByLocalName(row, 'c')) {
      const reference = cell.getAttribute('r')
      const columnIndex = reference ? columnIndexFromReference(reference) : nextColumnIndex
      nextColumnIndex = columnIndex + 1
      values[columnIndex] = readCellValue(context, cell)
    }
    rows[rowNumber - 1] = Array.from(values, (value) => value ?? null)
  }
  return Array.from(rows, (row) => row ?? [])
}

export function columnIndexFromReference(reference: string): number {
  const letters = /^[A-Z]+/i.exec(reference)?.[0].toUpperCase() ?? 'A'
  let index = 0
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64)
  return index - 1
}

function readCellValue(context: WorkbookContext, cell: Element): CellValue {
  const type = cell.getAttribute('t') ?? 'n'
  const raw = childrenByLocalName(cell, 'v')[0]?.textContent ?? null
  if (type === 'inlineStr') {
    const item = childrenByLocalName(cell, 'is')[0]
    return item ? textContentOfStringItem(item) : null
  }
  if (raw === null) return null
  if (type === 's') return context.sharedStrings[Number(raw)] ?? null
  if (type === 'b') return raw === '1'
  if (type === 'e') return null
  if (type === 'str' || type === 'd') return type === 'd' ? new Date(raw) : raw
  const number = Number(raw)
  if (Number.isNaN(number)) return raw
  const styleIndex = Number(cell.getAttribute('s') ?? -1)
  return context.dateStyleIndexes.has(styleIndex) ? serialToDate(number, context.uses1904) : number
}
