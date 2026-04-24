import { parsePromptLibraryPersistedSnapshot } from '@/features/prompt-library/lib/prompt-library-validation'
import {
  type LocalPromptLibraryStorage,
  normalizeStorageError,
} from '@/features/prompt-library/storage/prompt-library-storage'
import { type PromptLibraryPersistedSnapshot } from '@/features/prompt-library/types'

const LOCAL_STORAGE_KEY = 'promptrc.library.v1'

const readLocalSnapshot = (): PromptLibraryPersistedSnapshot | null => {
  try {
    const rawValue = localStorage.getItem(LOCAL_STORAGE_KEY)

    if (!rawValue) {
      return null
    }

    const parsedValue = JSON.parse(rawValue) as { state?: unknown }

    return parsePromptLibraryPersistedSnapshot(parsedValue.state)
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

export const createLocalPromptLibraryStorage = (): LocalPromptLibraryStorage => ({
  mode: 'local',
  hydrate: () =>
    Promise.resolve({
      source: 'local',
      snapshot: readLocalSnapshot(),
    }),
  persistSnapshot: writeLocalSnapshot,
  reportError: normalizeStorageError,
})
