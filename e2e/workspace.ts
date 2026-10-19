import { expect, type Page } from '@playwright/test'

export async function openApp(page: Page): Promise<void> {
  await page.goto('./')
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

export async function replaceEditorText(page: Page, sql: string): Promise<void> {
  const editor = page.getByRole('textbox', { name: /SQL editor|SQL 編輯器/ })
  await editor.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('Delete')
  await page.keyboard.insertText(sql)
}

export async function runEditor(page: Page): Promise<void> {
  await page.keyboard.press('ControlOrMeta+Enter')
}
