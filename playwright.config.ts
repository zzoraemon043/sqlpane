import { defineConfig, devices } from '@playwright/test'

const port = 4391
const basePath = process.env.BASE_PATH ?? '/'

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/generateFixtures.ts',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}${basePath}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}${basePath}`,
    reuseExistingServer: false,
  },
})
