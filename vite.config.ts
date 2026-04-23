import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig, loadEnv } from 'vite'

import { getCanonicalSiteUrl } from './src/lib/site-config'
import { sitemapPlugin } from './src/lib/vite-sitemap-plugin'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = getCanonicalSiteUrl(env.VITE_SITE_URL)

  return {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      devtools(),
      nitro(),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
      sitemapPlugin({
        baseUrl: siteUrl,
        verbose: mode !== 'production',
      }),
    ],
  }
})
