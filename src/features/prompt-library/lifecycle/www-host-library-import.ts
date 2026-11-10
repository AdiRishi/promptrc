import {
  isWwwHostLibrarySaved,
  markWwwHostLibraryImported,
  mergeWwwHostLibrary,
  readWwwHostLibrary,
} from '@/features/prompt-library/persistence/local/www-host-library'
import {
  type PromptLibraryStoreApi,
  getPromptLibraryPersistedSnapshot,
} from '@/features/prompt-library/store/prompt-library-store'

type WwwHostLibraryImportOptions = {
  /** False once the session that asked has ended, for example after signing in. */
  isActive: () => boolean
  readWwwLibrary?: typeof readWwwHostLibrary
  isSaved?: typeof isWwwHostLibrarySaved
  markImported?: () => void
}

/**
 * Brings a library saved on the www host into a signed-out library that is
 * already loaded and in use. The answer takes a network round trip, so it is
 * merged into the store as it stands when the answer arrives, not as it stood
 * when the question was asked.
 *
 * The import counts as done only once the merged library is in storage.
 * Otherwise a reload would lose what was brought over and never ask again.
 */
export const importWwwHostLibrary = async (
  store: PromptLibraryStoreApi,
  {
    isActive,
    readWwwLibrary = readWwwHostLibrary,
    isSaved = isWwwHostLibrarySaved,
    markImported = markWwwHostLibraryImported,
  }: WwwHostLibraryImportOptions,
) => {
  const fromWww = await readWwwLibrary()

  if (fromWww === undefined || !isActive()) {
    return
  }

  const current = getPromptLibraryPersistedSnapshot(store.getState())
  const merged = mergeWwwHostLibrary(current, fromWww)

  if (merged !== current) {
    store.getState().actions.restoreLocalState(merged)

    if (!isSaved(merged)) {
      return
    }
  }

  markImported()
}
