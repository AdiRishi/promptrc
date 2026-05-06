import { useEffect } from 'react'

import { type PromptLibraryStorage } from '@/features/prompt-library/persistence/prompt-library-storage'
import { type PromptLibraryStoreApi } from '@/features/prompt-library/store/prompt-library-store'
import { startPromptLibrarySession } from '@/features/prompt-library/sync/prompt-library-session'

type UsePromptLibraryHydrationOptions = {
  isLoaded: boolean
  storage: PromptLibraryStorage
  store: PromptLibraryStoreApi
}

export function usePromptLibraryHydration({
  isLoaded,
  storage,
  store,
}: UsePromptLibraryHydrationOptions) {
  useEffect(() => {
    if (!isLoaded) {
      return
    }

    return startPromptLibrarySession({ storage, store })
  }, [isLoaded, storage, store])
}
