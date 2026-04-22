import { QueryClientProvider } from '@tanstack/react-query'
import { type PropsWithChildren } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/query-client'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  )
}
