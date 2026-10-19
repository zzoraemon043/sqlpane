import { expect, test } from '@playwright/test'
import { generatedFixture, handWrittenFixture } from './fixturePaths'
import { dropFile, openApp, openFixtures } from './workspace'

test('opens every supported file type as tables', async ({ page }) => {
  await openApp(page)
  await openFixtures(page, [
    handWrittenFixture('orders.csv'),
    handWrittenFixture('cities.tsv'),
    handWrittenFixture('products.json'),
    handWrittenFixture('events.ndjson'),
    generatedFixture('measurements.parquet'),
    generatedFixture('inventory.xlsx'),
    generatedFixture('music.sqlite'),
  ])
  const tableList = page.locator('.table-list')
  for (const name of ['orders', 'cities', 'products', 'events', 'measurements', 'inventory_Stock', 'inventory_Suppliers', 'artists', 'albums']) {
    await expect(tableList.getByText(name, { exact: true })).toBeVisible()
  }
  await expect(page.getByRole('status', { name: /Opened|已開啟/ })).toContainText('orders (3')
})

test('opens a dropped file and renames its table', async ({ page }) => {
  await openApp(page)
  await dropFile(page, 'dropped.csv', 'a,b\n1,2\n', 'text/csv')
  const tableList = page.locator('.table-list')
  await expect(tableList.getByText('dropped', { exact: true })).toBeVisible()
  await tableList.locator('summary').filter({ hasText: 'dropped' }).click()
  await page.getByRole('button', { name: /^(Rename|重新命名) dropped$/ }).click()
  await page.getByRole('textbox', { name: /New name for table|資料表新名稱/ }).fill('renamed')
  await page.getByRole('button', { name: /^(Save|儲存)$/ }).click()
  await expect(tableList.getByText('renamed', { exact: true })).toBeVisible()
})

test('explains how to export a script when a backup is opened', async ({ page }) => {
  await openApp(page)
  await dropFile(page, 'shop.bak', 'binary', 'application/octet-stream')
  await expect(page.getByText(/Generate Scripts|產生指令碼/)).toBeVisible()
})

test('overrides the CSV delimiter and header detection', async ({ page }) => {
  await openApp(page)
  await page.getByText(/^(CSV options|CSV 選項)$/).click()
  await page.getByLabel(/^(Delimiter|分隔符號)$/).selectOption(';')
  await page.getByLabel(/^(Header row|標題列)$/).selectOption('false')
  await openFixtures(page, [handWrittenFixture('no-header.csv')])
  await expect(page.locator('.table-list').getByText('no-header', { exact: true })).toBeVisible()
  await page.locator('.table-entry summary').filter({ hasText: 'no-header' }).click()
  await expect(page.getByRole('list', { name: /Columns of no-header|no-header 的欄位/ })).toContainText('column1')
  await expect(page.getByRole('status', { name: /Opened|已開啟/ })).toContainText('no-header (2')
})
