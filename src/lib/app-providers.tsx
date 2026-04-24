import { ClerkProvider } from '@clerk/tanstack-react-start'
import { QueryClientProvider } from '@tanstack/react-query'
import { type PropsWithChildren } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { promptrcClerkAppearance } from '@/features/auth/clerk-appearance'
import { queryClient } from '@/lib/query-client'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider
        afterSignOutUrl="/"
        appearance={promptrcClerkAppearance}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
      >
        {children}
      </ClerkProvider>
      <Toaster />
    </QueryClientProvider>
  )
}
