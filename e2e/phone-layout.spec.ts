import { expect, test } from '@playwright/test'
import { openApp } from './workspace'

test.use({ viewport: { width: 375, height: 740 } })

test('keeps the header and Open files inside a phone screen', async ({ page }) => {
  await openApp(page)
  const header = page.locator('.app-header')
  expect(await header.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(375)
  const open = page.getByRole('button', { name: /^(Open files|開啟檔案)$/ })
  await expect(open).toBeInViewport({ ratio: 1 })
})
