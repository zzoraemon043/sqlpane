import { expect, test } from '@playwright/test'
import { handWrittenFixture } from './fixturePaths'
import { openApp, openFixtures } from './workspace'

test('imports a mysqldump script and shows the import report', async ({ page }) => {
  await openApp(page)
  await openFixtures(page, [handWrittenFixture('shop-mysqldump.sql')])
  const tableList = page.locator('.table-list')
  await expect(tableList.getByRole('button', { name: 'customers', exact: true })).toBeVisible()
  await expect(tableList.getByRole('button', { name: 'orders', exact: true })).toBeVisible()
  const failedRows = page.getByRole('region', { name: /Rows not imported|未匯入的資料列/ })
  await expect(failedRows).toContainText('58')
  await expect(page.getByRole('region', { name: /Skipped statements|略過的陳述式/ })).toContainText('LOCK TABLES 2')
})

test('imports a SQL Server script with GO batches', async ({ page }) => {
  await openApp(page)
  await openFixtures(page, [handWrittenFixture('school-sqlserver.sql')])
  const tableList = page.locator('.table-list')
  await expect(tableList.getByRole('button', { name: 'Students', exact: true })).toBeVisible()
  await expect(tableList.getByRole('button', { name: 'Courses', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: /Skipped statements|略過的陳述式/ })).toContainText('GO 13')
})
