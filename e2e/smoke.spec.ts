import { expect, test } from '@playwright/test'
import { openApp } from './workspace'

test('runs a query with the self-hosted engine and no foreign requests', async ({ page, baseURL }) => {
  const foreignRequests: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (!url.startsWith(baseURL!) && !url.startsWith('blob:') && !url.startsWith('data:')) foreignRequests.push(url)
  })
  await openApp(page)
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('output')).toHaveText('[{"answer":42}]')
  expect(foreignRequests).toEqual([])
})
