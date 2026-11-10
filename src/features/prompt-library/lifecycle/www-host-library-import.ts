import {
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
  markImported?: () => void
}

/**
 * Brings a library saved on the www host into a signed-out library that is
 * already loaded and in use. The answer takes a network round trip, so it is
 * merged into the store as it stands when the answer arrives, not as it stood
 * when the question was asked.
 */
export const importWwwHostLibrary = async (
  store: PromptLibraryStoreApi,
  {
    isActive,
    readWwwLibrary = readWwwHostLibrary,
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
  }

  markImported()
}
