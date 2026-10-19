import { expect, test } from '@playwright/test'
import { openApp } from './workspace'

test.describe('with a Taiwanese browser', () => {
  test.use({ locale: 'zh-TW' })

  test('starts in Traditional Chinese and switches to English', async ({ page }) => {
    await openApp(page)
    await expect(page.getByRole('button', { name: '開啟檔案' })).toBeVisible()
    await expect(page.getByRole('button', { name: '執行' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW')
    await page.getByRole('combobox', { name: '語言' }).selectOption('en')
    await expect(page.getByRole('button', { name: 'Open files' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Open files' })).toBeVisible()
  })
})

test.describe('with an English browser', () => {
  test.use({ locale: 'en-US' })

  test('starts in English', async ({ page }) => {
    await openApp(page)
    await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible()
    await page.getByRole('combobox', { name: 'Language' }).selectOption('zh-TW')
    await expect(page.getByRole('button', { name: '儲存查詢' })).toBeVisible()
  })
})
