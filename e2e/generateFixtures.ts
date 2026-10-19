import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parquetWriteBuffer } from 'hyparquet-writer'
import { loadSqlJsForNode } from '../src/test-support/sqlJsNode'
import { buildXlsx } from '../src/test-support/xlsxFixture'

export const generatedDirectory = join(import.meta.dirname, '.generated')

export default async function generateFixtures(): Promise<void> {
  mkdirSync(generatedDirectory, { recursive: true })
  writeFileSync(join(generatedDirectory, 'measurements.parquet'), new Uint8Array(parquetWriteBuffer({
    columnData: [
      { name: 'sensor', data: ['north', 'south', 'east', 'west'], type: 'STRING' },
      { name: 'reading', data: [1.5, 2.25, 3, 4.75], type: 'DOUBLE' },
    ],
  })))
  writeFileSync(
    join(generatedDirectory, 'inventory.xlsx'),
    buildXlsx(
      [
        {
          name: 'Stock',
          rowsXml:
            '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
            '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>12</v></c></row>' +
            '<row r="3"><c r="A3" t="s"><v>3</v></c><c r="B3"><v>30</v></c></row>',
        },
        { name: 'Suppliers', rowsXml: '<row r="1"><c r="A1" t="inlineStr"><is><t>supplier</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Acme Test Co</t></is></c></row>' },
      ],
      ['item', 'quantity', 'bolts', 'nuts'],
    ),
  )
  const sqlJs = await loadSqlJsForNode()
  const database = new sqlJs.Database()
  database.run(`
    CREATE TABLE artists (id INTEGER PRIMARY KEY, name TEXT);
    INSERT INTO artists VALUES (1, 'Test Band'), (2, 'Sample Choir');
    CREATE TABLE albums (id INTEGER PRIMARY KEY, artist_id INTEGER, title TEXT);
    INSERT INTO albums VALUES (1, 1, 'First'), (2, 1, 'Second'), (3, 2, 'Third');
  `)
  writeFileSync(join(generatedDirectory, 'music.sqlite'), database.export())
  database.close()
}
