import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  compatibilityDate: '2026-04-22',
  preset: 'cloudflare_module',
  cloudflare: {
    deployConfig: true,
    nodeCompat: true,
    wrangler: {
      name: 'promptrc',
      observability: {
        enabled: true,
        head_sampling_rate: 1,
      },
      preview_urls: true,
    },
  },
})
