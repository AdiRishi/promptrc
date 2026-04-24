import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const migrations = await readD1Migrations(fileURLToPath(new URL('./migrations', import.meta.url)))
const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
}

export default defineConfig({
  resolve: {
    alias,
  },
  test: {
    projects: [
      {
        resolve: {
          alias,
        },
        test: {
          name: 'browser-unit',
          environment: 'jsdom',
          globals: true,
          include: ['tests/**/*.test.{ts,tsx}'],
          exclude: ['tests/**/server/**/*.test.{ts,tsx}'],
        },
      },
      {
        resolve: {
          alias,
        },
        plugins: [
          cloudflareTest({
            miniflare: {
              compatibilityDate: '2026-04-22',
              compatibilityFlags: ['nodejs_compat'],
              d1Databases: ['DB'],
              bindings: {
                TEST_MIGRATIONS: migrations,
              },
            },
          }),
        ],
        test: {
          name: 'cloudflare-server',
          include: ['tests/**/server/**/*.test.{ts,tsx}'],
          setupFiles: ['tests/setup-cloudflare.ts'],
        },
      },
    ],
    passWithNoTests: true,
  },
})
