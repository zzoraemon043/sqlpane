import { defineConfig } from '@playwright/test'
import baseConfig from './playwright.config'

export default defineConfig({
  ...baseConfig,
  testDir: 'scripts/screenshots',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
})
