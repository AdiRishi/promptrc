import { createFileRoute } from '@tanstack/react-router'

import { getPublicPromptShareImageResponse } from '@/features/prompt-library/server/prompt-library-functions'

export const Route = createFileRoute('/api/shared-prompt-images/$shareId/$imageId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        return getPublicPromptShareImageResponse(params.shareId, params.imageId)
      },
    },
  },
})
