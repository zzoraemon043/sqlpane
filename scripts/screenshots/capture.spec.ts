import { join } from 'node:path'
import { test, type Page } from '@playwright/test'

const root = join(import.meta.dirname, '..', '..')
const imageDirectory = join(root, 'docs', 'images')
const fixture = (name: string) => join(root, 'e2e', 'fixtures', name)
const generated = (name: string) => join(root, 'e2e', '.generated', name)

async function typeSql(page: Page, sql: string) {
  await page.locator('.cm-content').click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('Delete')
  await page.keyboard.insertText(sql)
}

for (const locale of ['zh-TW', 'en'] as const) {
  test.describe(locale, () => {
    test.use({ locale, viewport: { width: 1360, height: 860 } })

    test(`captures screenshots in ${locale}`, async ({ page }) => {
      await page.goto('./')
      await page.waitForFunction(() => {
        const button = document.querySelector('.header-actions button.primary')
        return button !== null && !button.hasAttribute('disabled')
      })
      await page.getByTestId('file-input').setInputFiles([fixture('orders.csv'), generated('music.sqlite'), fixture('shop-mysqldump.sql')])
      await page.locator('.import-report').waitFor()
      await page.locator('.table-entry summary').filter({ hasText: /^albums/ }).click()
      await typeSql(page, 'SELECT artists.name AS artist, count(*) AS albums\nFROM albums\nJOIN artists ON artists.id = albums.artist_id\nGROUP BY artists.name\nORDER BY albums DESC;')
      await page.keyboard.press('ControlOrMeta+Enter')
      await page.getByRole('grid').getByText('Test Band').waitFor()
      await page.screenshot({ path: join(imageDirectory, `workspace-${locale}.png`) })

      const notice = page.locator('.notice')
      await page.locator('.import-report').evaluate((element) => element.setAttribute('open', ''))
      await notice.screenshot({ path: join(imageDirectory, `import-report-${locale}.png`) })
      await notice.getByRole('button').last().click()

      await typeSql(page, 'SELECT customer, sum(amount) AS total\nFROM orders\nGROUP BY customer\nORDER BY total DESC;')
      await page.keyboard.press('ControlOrMeta+Enter')
      await page.getByRole('grid').getByText('Bob Sample').waitFor()
      await page.getByRole('tab').nth(1).click()
      await page.locator('svg.chart').waitFor()
      await page.screenshot({ path: join(imageDirectory, `chart-${locale}.png`) })
    })
  })
}
