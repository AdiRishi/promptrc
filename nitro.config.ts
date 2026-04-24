import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  preset: 'cloudflare_module',
  cloudflare: {
    deployConfig: true,
  },
})
