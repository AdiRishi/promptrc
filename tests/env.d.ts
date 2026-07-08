import { type D1Migration } from 'cloudflare:test'

declare global {
  namespace Cloudflare {
    interface Env {
      PROMPT_IMAGES: R2Bucket
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}

export {}
