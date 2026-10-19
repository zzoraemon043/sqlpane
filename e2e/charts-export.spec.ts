import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { handWrittenFixture } from './fixturePaths'
import { openApp, openFixtures, replaceEditorText, runEditor } from './workspace'

async function showOrderTotals(page: Page) {
  await openApp(page)
  await openFixtures(page, [handWrittenFixture('orders.csv')])
  await expect(page.locator('.table-list').getByText('orders', { exact: true })).toBeVisible()
  await replaceEditorText(page, 'SELECT customer, sum(amount) AS total FROM orders GROUP BY customer ORDER BY customer')
  await runEditor(page)
  await expect(page.getByTestId('result-summary')).toContainText('2')
}

async function downloadText(page: Page, label: string): Promise<{ name: string; content: Buffer }> {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('group', { name: /Export|匯出/ }).getByRole('button', { name: label, exact: true }).click()])
  return { name: download.suggestedFilename(), content: readFileSync((await download.path())!) }
}

test('draws bar, line, scatter and pie charts from the result', async ({ page }) => {
  await showOrderTotals(page)
  await page.getByRole('tab', { name: /Chart|圖表/ }).click()
  const chartType = page.getByRole('combobox', { name: /Chart type|圖表類型/ })
  await expect(page.locator('svg.chart rect.chart-bar')).toHaveCount(2)
  await chartType.selectOption('line')
  await expect(page.locator('svg.chart path.chart-line')).toHaveCount(1)
  await chartType.selectOption('scatter')
  await expect(page.locator('svg.chart circle.chart-point')).toHaveCount(2)
  await chartType.selectOption('pie')
  await expect(page.locator('svg.chart path.chart-slice')).toHaveCount(2)
  await expect(page.getByRole('img', { name: /total/ })).toContainText('Alice Example')
})

test('exports the result as CSV, JSON, Parquet and Excel', async ({ page }) => {
  await showOrderTotals(page)
  const csv = await downloadText(page, 'CSV')
  expect(csv.name).toMatch(/\.csv$/)
  expect(csv.content.toString('utf8')).toBe('﻿customer,total\r\nAlice Example,153.75\r\nBob Sample,75\r\n')
  const json = await downloadText(page, 'JSON')
  expect(JSON.parse(json.content.toString('utf8'))).toEqual([
    { customer: 'Alice Example', total: 153.75 },
    { customer: 'Bob Sample', total: 75 },
  ])
  const parquet = await downloadText(page, 'Parquet')
  expect(parquet.name).toMatch(/\.parquet$/)
  expect(parquet.content.subarray(0, 4).toString('latin1')).toBe('PAR1')
  const excel = await downloadText(page, 'Excel')
  expect(excel.name).toMatch(/\.xlsx$/)
  expect(excel.content.subarray(0, 2).toString('latin1')).toBe('PK')
})

test('exports only the rows left after filtering', async ({ page }) => {
  await showOrderTotals(page)
  await page.getByRole('grid').getByRole('textbox', { name: /Filter customer|篩選 customer/ }).fill('bob')
  await expect(page.getByTestId('result-summary')).toContainText('1')
  await expect.poll(async () => (await downloadText(page, 'CSV')).content.toString('utf8')).toBe('﻿customer,total\r\nBob Sample,75\r\n')
})
