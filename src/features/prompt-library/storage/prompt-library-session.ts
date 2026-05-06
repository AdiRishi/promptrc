import { makePromptLibraryReady } from '@/features/prompt-library/storage/prompt-library-lifecycle'
import {
  type LocalPromptLibraryStorage,
  type PromptLibraryStorage,
} from '@/features/prompt-library/storage/prompt-library-storage'
import {
  type PromptLibraryStore,
  type PromptLibraryStoreApi,
  getPromptLibraryPersistedSnapshot,
} from '@/features/prompt-library/store/prompt-library-store'

type PromptLibrarySessionOptions = {
  storage: PromptLibraryStorage
  store: PromptLibraryStoreApi
}

export const startPromptLibrarySession = ({ storage, store }: PromptLibrarySessionOptions) => {
  let isActive = true
  let unsubscribe: (() => void) | undefined

  const setSyncError = (error: unknown) => {
    const message = storage.reportError(error)

    store.getState().actions.setSyncState({
      syncMode: storage.mode,
      syncStatus: 'error',
      syncError: message,
    })
  }

  store.getState().actions.setSyncState({ syncMode: storage.mode, syncStatus: 'loading' })

  void makePromptLibraryReady(storage, store)
    .then(() => {
      if (!isActive) {
        return
      }

      const localPersistence = startLocalPromptLibraryPersistence({ storage, store, setSyncError })

      if (!localPersistence.started) {
        return
      }

      unsubscribe = localPersistence.unsubscribe
      store.getState().actions.setSyncState({ syncMode: storage.mode, syncStatus: 'ready' })
    })
    .catch((error: unknown) => {
      if (isActive) {
        setSyncError(error)
      }
    })

  return () => {
    isActive = false
    unsubscribe?.()
  }
}

const startLocalPromptLibraryPersistence = ({
  storage,
  store,
  setSyncError,
}: {
  storage: PromptLibraryStorage
  store: PromptLibraryStoreApi
  setSyncError: (error: unknown) => void
}) => {
  if (storage.mode !== 'local') {
    return { started: true as const }
  }

  const persistSnapshot = createLocalSnapshotPersistor(storage, setSyncError)

  if (!persistSnapshot(store.getState())) {
    return { started: false as const }
  }

  return {
    started: true as const,
    unsubscribe: store.subscribe(persistSnapshot),
  }
}

const createLocalSnapshotPersistor = (
  storage: LocalPromptLibraryStorage,
  setSyncError: (error: unknown) => void,
) => {
  return (state: PromptLibraryStore) => {
    try {
      storage.persistSnapshot(getPromptLibraryPersistedSnapshot(state))
      return true
    } catch (error) {
      setSyncError(error)
      return false
    }
  }
}
