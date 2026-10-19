import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  test: {
    testTimeout: 30_000,
    hookTimeout: 60_000,
    projects: [
      {
        extends: true,
        test: { name: 'node', include: ['src/**/*.test.{ts,tsx}'], exclude: ['src/**/*.dom.test.tsx'], environment: 'node' },
      },
      {
        extends: true,
        test: { name: 'dom', include: ['src/**/*.dom.test.tsx'], environment: 'jsdom' },
      },
    ],
  },
})
