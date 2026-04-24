import { useMemo } from 'react'

import { createLocalPromptLibraryStorage } from '@/features/prompt-library/storage/local-prompt-library-storage'
import { type PromptLibraryStorage } from '@/features/prompt-library/storage/prompt-library-storage'
import { useRemotePromptLibraryStorage } from '@/features/prompt-library/storage/remote-prompt-library-storage'

export function usePromptLibraryStorage(isSignedIn: boolean): PromptLibraryStorage {
  const localStorageAdapter = useMemo(() => createLocalPromptLibraryStorage(), [])
  const remoteStorageAdapter = useRemotePromptLibraryStorage()

  return isSignedIn ? remoteStorageAdapter : localStorageAdapter
}
