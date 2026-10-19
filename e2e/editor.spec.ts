import { expect, test } from '@playwright/test'
import { handWrittenFixture } from './fixturePaths'
import { openApp, openFixtures, replaceEditorText, runEditor } from './workspace'

test('runs the statement under the cursor, completes names and formats', async ({ page }) => {
  await openApp(page)
  await openFixtures(page, [handWrittenFixture('orders.csv')])
  await expect(page.locator('.table-list').getByRole('button', { name: 'orders', exact: true })).toBeVisible()
  await replaceEditorText(page, 'SELECT 1 AS first;\nSELECT count(*) AS total FROM orders;')
  await runEditor(page)
  await expect(page.getByRole('table', { name: /Results|查詢結果/ })).toContainText('total')
  await expect(page.getByRole('table', { name: /Results|查詢結果/ })).toContainText('3')

  await replaceEditorText(page, 'SELECT custo')
  await page.keyboard.press('Control+Space')
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('customer')
  await page.keyboard.press('Escape')
  await replaceEditorText(page, 'SELECT * FROM ord')
  await page.keyboard.press('Control+Space')
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('orders')
  await page.keyboard.press('Escape')

  await replaceEditorText(page, 'select customer, sum(amount) from orders group by customer')
  await page.getByRole('button', { name: /^(Format|格式化)$/ }).click()
  await expect(page.locator('.cm-content')).toContainText('GROUP BY')
})

test('keeps history and saved queries after reload', async ({ page }) => {
  await openApp(page)
  await replaceEditorText(page, 'SELECT 7 AS lucky')
  await runEditor(page)
  await expect(page.getByRole('table', { name: /Results|查詢結果/ })).toContainText('7')
  await page.getByRole('button', { name: /^(Save query|儲存查詢)$/ }).click()
  await page.getByRole('textbox', { name: /Query name|查詢名稱/ }).fill('Lucky number')
  await page.getByRole('button', { name: /^(Save|儲存)$/ }).click()
  await page.reload()
  await openApp(page)
  await expect(page.getByRole('region', { name: /History|查詢紀錄/ })).toContainText('SELECT 7 AS lucky')
  await page.getByRole('region', { name: /Saved queries|已存查詢/ }).getByRole('button', { name: 'Lucky number', exact: true }).click()
  await expect(page.locator('.cm-content')).toContainText('SELECT 7 AS lucky')
})

test('shows the error message of a failing query', async ({ page }) => {
  await openApp(page)
  await replaceEditorText(page, 'SELECT * FROM missing_table')
  await runEditor(page)
  await expect(page.getByRole('alert')).toContainText('missing_table')
})

test('keeps working when IndexedDB is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: undefined })
  })
  await openApp(page)
  await expect(page.getByText(/Browser storage is unavailable|瀏覽器儲存空間無法使用/)).toBeVisible()
  await replaceEditorText(page, 'SELECT 5 AS five')
  await runEditor(page)
  await expect(page.getByRole('table', { name: /Results|查詢結果/ })).toContainText('5')
  await expect(page.getByRole('region', { name: /History|查詢紀錄/ })).toContainText('SELECT 5 AS five')
})
