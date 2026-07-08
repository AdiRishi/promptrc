import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  preset: 'cloudflare_module',
  cloudflare: {
    deployConfig: true,
  },
  routes: {
    '/api/prompt-images/:imageId': {
      handler: './src/features/prompt-library/server/prompt-image-start-entry.ts',
      method: 'GET',
      format: 'web',
    },
    '/api/shared-prompt-images/:shareId/:imageId': {
      handler: './src/features/prompt-library/server/prompt-image-start-entry.ts',
      method: 'GET',
      format: 'web',
    },
  },
})
