import { expect, test } from '@playwright/test'

test('runs a query with the self-hosted engine and no foreign requests', async ({ page, baseURL }) => {
  const foreignRequests: string[] = []
  page.on('request', (request) => {
    if (!request.url().startsWith(baseURL!) && !request.url().startsWith('blob:') && !request.url().startsWith('data:')) {
      foreignRequests.push(request.url())
    }
  })
  await page.goto('/')
  await expect(page.getByTestId('engine-status')).toHaveText('ready', { timeout: 30_000 })
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByTestId('output')).toHaveText('[{"answer":42}]')
  expect(foreignRequests).toEqual([])
})
