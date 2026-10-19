import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

const publicDirectory = join(import.meta.dirname, '..', 'public')
const svg = readFileSync(join(publicDirectory, 'icon.svg'), 'utf8')

const browser = await chromium.launch()
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
  await page.screenshot({ path: join(publicDirectory, `icon-${size}.png`), omitBackground: true })
  await page.close()
}
await browser.close()
