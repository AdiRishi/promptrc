import { useMemo } from 'react'

import { createLocalPromptLibraryStorage } from '@/features/prompt-library/persistence/local/local-prompt-library-storage'
import { type PromptLibraryStorage } from '@/features/prompt-library/persistence/prompt-library-storage'
import { useRemotePromptLibraryStorage } from '@/features/prompt-library/persistence/remote/remote-prompt-library-storage'

export function usePromptLibraryStorage(
  isSignedIn: boolean,
  userId: string | null,
): PromptLibraryStorage {
  const localStorageAdapter = useMemo(() => createLocalPromptLibraryStorage(), [])
  const remoteStorageAdapter = useRemotePromptLibraryStorage(userId)

  return isSignedIn ? remoteStorageAdapter : localStorageAdapter
}
