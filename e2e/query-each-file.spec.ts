import { expect, test } from '@playwright/test'
import { generatedFixture, handWrittenFixture } from './fixturePaths'
import { openApp, openFixtures, replaceEditorText, runEditor } from './workspace'

const cases = [
  { file: handWrittenFixture('orders.csv'), table: 'orders', sql: 'SELECT round(sum(amount), 2) AS v FROM orders', expected: '228.75' },
  { file: handWrittenFixture('cities.tsv'), table: 'cities', sql: 'SELECT max(population) AS v FROM cities', expected: '2700000' },
  { file: handWrittenFixture('products.json'), table: 'products', sql: "SELECT name AS v FROM products WHERE sku = 'B-2'", expected: 'Pencil' },
  { file: handWrittenFixture('events.ndjson'), table: 'events', sql: 'SELECT count(*) AS v FROM events', expected: '3' },
  { file: generatedFixture('measurements.parquet'), table: 'measurements', sql: "SELECT reading AS v FROM measurements WHERE sensor = 'west'", expected: '4.75' },
  { file: generatedFixture('inventory.xlsx'), table: 'inventory_Stock', sql: 'SELECT sum(quantity) AS v FROM inventory_Stock', expected: '42' },
  { file: generatedFixture('music.sqlite'), table: 'albums', sql: 'SELECT count(*) AS v FROM albums JOIN artists ON artists.id = albums.artist_id WHERE artists.name = \'Test Band\'', expected: '2' },
  { file: handWrittenFixture('shop-mysqldump.sql'), table: 'orders', sql: 'SELECT count(*) AS v FROM orders JOIN customers ON customers.id = orders.customer_id', expected: '3' },
  { file: handWrittenFixture('school-sqlserver.sql'), table: 'Students', sql: 'SELECT Name AS v FROM Students WHERE StudentID = 1', expected: '範例學生' },
]

for (const { file, table, sql, expected } of cases) {
  test(`opens ${file.split(/[\\/]/).pop()} and queries it`, async ({ page }) => {
    await openApp(page)
    await openFixtures(page, [file])
    await expect(page.locator('.table-list').getByText(table, { exact: true })).toBeVisible()
    await replaceEditorText(page, sql)
    await runEditor(page)
    const grid = page.getByRole('grid', { name: /Results|查詢結果/ })
    await expect(grid.getByRole('gridcell', { name: expected, exact: true })).toBeVisible()
  })
}
