import { createFileRoute } from '@tanstack/react-router'

import { getAuthenticatedPromptImageResponse } from '@/features/prompt-library/server/prompt-library-functions'

export const Route = createFileRoute('/api/prompt-images/$imageId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        return getAuthenticatedPromptImageResponse(params.imageId)
      },
    },
  },
})
