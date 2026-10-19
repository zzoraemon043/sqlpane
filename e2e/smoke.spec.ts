import { expect, test } from '@playwright/test'
import { openApp } from './workspace'

test('runs a query with the self-hosted engine and no foreign requests', async ({ page, baseURL }) => {
  const foreignRequests: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith(baseURL!) && !url.startsWith('blob:') && !url.startsWith('data:')) foreignRequests.push(url)
  })
  await openApp(page)
  await page.getByRole('button', { name: /^(Run|執行)$/ }).click()
  await expect(page.getByTestId('result-summary')).toContainText('1')
  await expect(page.getByRole('grid', { name: /Results|查詢結果/ })).toContainText('42')
  expect(foreignRequests).toEqual([])
})
