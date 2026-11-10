import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const migrations = await readD1Migrations(fileURLToPath(new URL('./migrations', import.meta.url)))

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    coverage: {
      provider: 'istanbul',
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'browser-unit',
          environment: 'jsdom',
          globals: true,
          include: ['tests/**/*.test.{ts,tsx}'],
          exclude: ['tests/**/*.server.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './wrangler.jsonc' },
            miniflare: {
              bindings: {
                TEST_MIGRATIONS: migrations,
              },
            },
          }),
        ],
        test: {
          name: 'cloudflare-server',
          include: ['tests/**/*.server.test.{ts,tsx}'],
          setupFiles: ['tests/setup-cloudflare.ts'],
        },
      },
    ],
    passWithNoTests: true,
  },
})
