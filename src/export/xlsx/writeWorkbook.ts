import { strToU8, zipSync } from 'fflate'

export type WorkbookCell = string | number | boolean | Date | null

export const maximumSheetRows = 1_048_576

const contentTypes =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'
const rootRelationships =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
const workbookRelationships =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
const styles =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm:ss"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>'

const dateStyle = 1
const headerStyle = 2

function isAllowedXmlCodePoint(codePoint: number): boolean {
  if (codePoint === 0x9 || codePoint === 0xa || codePoint === 0xd) return true
  if (codePoint >= 0x20 && codePoint <= 0xd7ff) return true
  if (codePoint >= 0xe000 && codePoint <= 0xfffd) return true
  return codePoint >= 0x10000 && codePoint <= 0x10ffff
}

export function escapeXml(text: string): string {
  let cleaned = ''
  for (const character of text) {
    if (isAllowedXmlCodePoint(character.codePointAt(0)!)) cleaned += character
  }
  return cleaned.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

export function columnLetters(index: number): string {
  let letters = ''
  for (let remaining = index + 1; remaining > 0; remaining = Math.floor((remaining - 1) / 26)) {
    letters = String.fromCharCode(65 + ((remaining - 1) % 26)) + letters
  }
  return letters
}

export function dateToSerial(date: Date): number {
  return date.getTime() / 86_400_000 + 25_569
}

function cellXml(reference: string, value: WorkbookCell, style?: number): string {
  const styleAttribute = style === undefined ? '' : ` s="${style}"`
  if (value === null) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? `<c r="${reference}"${styleAttribute}><v>${value}</v></c>` : ''
  if (typeof value === 'boolean') return `<c r="${reference}" t="b"${styleAttribute}><v>${value ? 1 : 0}</v></c>`
  if (value instanceof Date) return `<c r="${reference}" s="${dateStyle}"><v>${dateToSerial(value)}</v></c>`
  return `<c r="${reference}" t="inlineStr"${styleAttribute}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
}

export function writeWorkbook(sheetName: string, header: string[], rows: Iterable<WorkbookCell[]>): Uint8Array {
  const parts: string[] = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>',
  ]
  const letters = header.map((_, index) => columnLetters(index))
  parts.push(`<row r="1">${header.map((name, index) => cellXml(`${letters[index]}1`, name, headerStyle)).join('')}</row>`)
  let rowNumber = 1
  for (const row of rows) {
    rowNumber++
    if (rowNumber > maximumSheetRows) break
    parts.push(`<row r="${rowNumber}">${row.map((value, index) => cellXml(`${letters[index]}${rowNumber}`, value)).join('')}</row>`)
  }
  parts.push('</sheetData></worksheet>')
  const safeName = escapeXml(sheetName.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet1')
  return zipSync({
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(rootRelationships),
    'xl/workbook.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(workbookRelationships),
    'xl/styles.xml': strToU8(styles),
    'xl/worksheets/sheet1.xml': strToU8(parts.join('')),
  })
}
