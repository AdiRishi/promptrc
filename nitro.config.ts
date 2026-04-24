import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  compatibilityDate: '2026-04-22',
  preset: 'cloudflare_module',
  cloudflare: {
    deployConfig: true,
    nodeCompat: true,
    wrangler: {
      name: 'promptrc',
      d1_databases: [
        {
          binding: 'DB',
          database_name: 'promptrc',
          database_id: 'ebb333ba-49ff-438b-988e-a4180447b48c',
          migrations_dir: '../../migrations',
        },
      ],
      observability: {
        enabled: true,
        head_sampling_rate: 1,
      },
      preview_urls: true,
      routes: [
        {
          pattern: 'promptrc.app',
          custom_domain: true,
        },
        {
          pattern: 'www.promptrc.app',
          custom_domain: true,
        },
      ],
    },
  },
})
