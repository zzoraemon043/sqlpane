import { expect, type Page } from '@playwright/test'

export async function openApp(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByTestId('file-input')).toBeAttached()
  await expect(page.getByRole('button', { name: /Open files|開啟檔案/ })).toBeEnabled({ timeout: 30_000 })
}

export async function openFixtures(page: Page, paths: string[]): Promise<void> {
  await page.getByTestId('file-input').setInputFiles(paths)
}

export async function dropFile(page: Page, name: string, content: string, mimeType: string): Promise<void> {
  const dataTransfer = await page.evaluateHandle(
    ({ name, content, mimeType }) => {
      const transfer = new DataTransfer()
      transfer.items.add(new File([content], name, { type: mimeType }))
      return transfer
    },
    { name, content, mimeType },
  )
  await page.getByTestId('drop-zone').dispatchEvent('dragover', { dataTransfer })
  await page.getByTestId('drop-zone').dispatchEvent('drop', { dataTransfer })
}
