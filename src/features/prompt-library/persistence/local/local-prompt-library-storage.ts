import { parsePromptLibraryPersistedSnapshot } from '@/features/prompt-library/model/prompt-library-validation'
import {
  markWwwHostLibraryImported,
  mergeWwwHostLibrary,
  readWwwHostLibrary,
} from '@/features/prompt-library/persistence/local/www-host-library'
import {
  type LocalPromptLibraryStorage,
  normalizeStorageError,
} from '@/features/prompt-library/persistence/prompt-library-storage'
import { type PromptLibraryPersistedSnapshot } from '@/features/prompt-library/types'

export const LOCAL_STORAGE_KEY = 'promptrc.library.v1'

const parseStoredSnapshot = (rawValue: string | null): PromptLibraryPersistedSnapshot | null => {
  try {
    if (!rawValue) {
      return null
    }

    const parsedValue = JSON.parse(rawValue) as { state?: unknown }

    return parsePromptLibraryPersistedSnapshot(parsedValue.state)
  } catch {
    return null
  }
}

export const readLocalPromptLibrarySnapshot = (): PromptLibraryPersistedSnapshot | null => {
  try {
    return parseStoredSnapshot(localStorage.getItem(LOCAL_STORAGE_KEY))
  } catch {
    return null
  }
}

const writeLocalSnapshot = (snapshot: PromptLibraryPersistedSnapshot) => {
  localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify({
      state: snapshot,
      version: 1,
    }),
  )
}

const importWwwHostLibrary = async () => {
  const rawValue = await readWwwHostLibrary()

  if (rawValue === undefined) {
    return
  }

  const current = readLocalPromptLibrarySnapshot()
  const merged = mergeWwwHostLibrary(current, parseStoredSnapshot(rawValue))

  if (merged && merged !== current) {
    writeLocalSnapshot(merged)
  }

  markWwwHostLibraryImported()
}

export const createLocalPromptLibraryStorage = (): LocalPromptLibraryStorage => ({
  mode: 'local',
  hydrate: async () => {
    try {
      await importWwwHostLibrary()
    } catch {
      // Storage that refuses the import still holds this host's library.
    }

    return {
      source: 'local',
      snapshot: readLocalPromptLibrarySnapshot(),
    }
  },
  persistSnapshot: writeLocalSnapshot,
  reportError: normalizeStorageError,
})
