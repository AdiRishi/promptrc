import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig, loadEnv } from 'vite'

import { getCanonicalSiteUrl } from './src/lib/site-config.ts'
import { sitemapPlugin } from './src/lib/vite-sitemap-plugin.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = getCanonicalSiteUrl(env.VITE_SITE_URL)

  return {
    resolve: {
      tsconfigPaths: true,
    },
    build: {
      rollupOptions: {
        external: ['cloudflare:workers'],
      },
    },
    optimizeDeps: {
      // The D1 binding is loaded with a dynamic `import('cloudflare:workers')`.
      // Without this the dependency scan aborts, pre-bundling is skipped, and the
      // workerd dev runner ends up evaluating raw CommonJS (react/index.js).
      rolldownOptions: {
        external: ['cloudflare:workers'],
      },
    },
    plugins: [
      nitro(),
      tailwindcss(),
      tanstackStart(),
      // React Compiler via the native (Rust) oxc port — memoization is automatic,
      // so components don't need hand-written useMemo/useCallback.
      viteReact({ compiler: { logDiagnostics: mode !== 'production' } }),
      sitemapPlugin({
        baseUrl: siteUrl,
        verbose: mode !== 'production',
      }),
    ],
  }
})
