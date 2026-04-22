import { createFileRoute } from '@tanstack/react-router'

import { PromptLibraryApp } from '@/features/prompt-library/components/prompt-library-app'

export const Route = createFileRoute('/')({
  ssr: false,
  component: HomeRoute,
  head: () => ({
    meta: [
      {
        title: 'promptrc',
      },
      {
        name: 'description',
        content:
          'A terminal-inspired prompt library for storing, searching, and reusing your best AI prompts.',
      },
    ],
  }),
})

function HomeRoute() {
  return <PromptLibraryApp />
}
