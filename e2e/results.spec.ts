import { expect, test } from '@playwright/test'
import { handWrittenFixture } from './fixturePaths'
import { openApp, openFixtures, replaceEditorText, runEditor } from './workspace'

const grid = (page: import('@playwright/test').Page) => page.getByRole('grid', { name: /Results|查詢結果/ })

test('shows a million rows with virtual scrolling, sorting and filtering', async ({ page }) => {
  await openApp(page)
  await replaceEditorText(page, 'SELECT range AS n, range % 7 AS bucket FROM range(1000000)')
  await runEditor(page)
  await expect(page.getByTestId('result-summary')).toContainText('1,000,000')
  await expect(page.getByTestId('result-summary')).toContainText('ms')
  expect(await grid(page).getByRole('row').count()).toBeLessThan(80)

  await grid(page).evaluate((element) => element.scrollTo(0, element.scrollHeight))
  await expect(grid(page).getByRole('gridcell', { name: '999999', exact: true })).toBeVisible()

  await grid(page).getByRole('columnheader', { name: /^n/ }).getByRole('button').click()
  await grid(page).getByRole('columnheader', { name: /^n/ }).getByRole('button').click()
  await expect(grid(page).getByRole('columnheader', { name: /^n/ })).toHaveAttribute('aria-sort', 'descending')
  await grid(page).evaluate((element) => element.scrollTo(0, 0))
  await expect(grid(page).getByRole('row').nth(2).getByRole('gridcell').first()).toHaveText('999999')

  await grid(page).getByRole('textbox', { name: /Filter bucket|篩選 bucket/ }).fill('3')
  await expect(page.getByTestId('result-summary')).toContainText('142,857')
})

test('resizes a column and previews a table from the schema sidebar', async ({ page }) => {
  await openApp(page)
  await openFixtures(page, [handWrittenFixture('orders.csv')])
  const entry = page.locator('.table-entry').filter({ hasText: 'orders' })
  await entry.locator('summary').click()
  await expect(page.getByRole('list', { name: /Columns of orders|orders 的欄位/ })).toContainText('amount')
  await expect(page.getByRole('list', { name: /Columns of orders|orders 的欄位/ })).toContainText('DOUBLE')
  await page.getByRole('button', { name: /^(Preview|預覽) orders$/ }).click()
  await expect(page.getByTestId('result-summary')).toContainText('3')
  const header = grid(page).getByRole('columnheader', { name: /customer/ })
  const before = (await header.boundingBox())!.width
  const handle = grid(page).getByRole('separator', { name: /customer/ })
  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 120, box.y + box.height / 2, { steps: 5 })
  await page.mouse.up()
  expect((await header.boundingBox())!.width).toBeGreaterThan(before + 80)
})
