import { expect, test } from '@playwright/test'
import { contentSecurityPolicy } from '../build/contentSecurityPolicy'
import { openApp, replaceEditorText, runEditor } from './workspace'

test('ships a content security policy that only allows the site itself', async ({ page }) => {
  const violations: string[] = []
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) violations.push(message.text())
  })
  await openApp(page)
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', contentSecurityPolicy)
  await replaceEditorText(page, 'SELECT 1 AS one')
  await runEditor(page)
  await expect(page.getByRole('grid', { name: /Results|查詢結果/ })).toContainText('1')
  expect(violations).toEqual([])
})

test('is installable and keeps working without a network connection', async ({ page, context }) => {
  await openApp(page)
  await expect(page.getByTestId('offline-status')).toHaveAttribute('data-status', 'ready', { timeout: 30_000 })
  const manifest = await page.evaluate(async () => (await fetch(document.querySelector<HTMLLinkElement>('link[rel=manifest]')!.href)).json())
  expect(manifest).toMatchObject({ display: 'standalone', start_url: './' })
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))

  await context.setOffline(true)
  await page.reload()
  await openApp(page)
  await replaceEditorText(page, "SELECT 'offline' AS mode, 6 * 7 AS answer")
  await runEditor(page)
  await expect(page.getByRole('grid', { name: /Results|查詢結果/ })).toContainText('offline')
  await expect(page.getByRole('grid', { name: /Results|查詢結果/ })).toContainText('42')
})
