import { useEffect } from 'react'

import { applyHydrationResult } from '@/features/prompt-library/storage/prompt-library-client'
import { type PromptLibraryStorage } from '@/features/prompt-library/storage/prompt-library-storage'
import {
  type PromptLibraryStore,
  type PromptLibraryStoreApi,
  getPromptLibraryPersistedSnapshot,
} from '@/features/prompt-library/store/prompt-library-store'

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

    let isActive = true
    let unsubscribe: (() => void) | undefined
    store.getState().actions.setSyncState({ syncMode: storage.mode, syncStatus: 'loading' })

    void storage
      .hydrate()
      .then((hydrationResult) => {
        if (!isActive) {
          return
        }

        applyHydrationResult(store, hydrationResult)

        let didPersistLocalSnapshot = true

        if (storage.mode === 'local') {
          const persistSnapshot = (state: PromptLibraryStore) => {
            try {
              storage.persistSnapshot(getPromptLibraryPersistedSnapshot(state))
            } catch (error) {
              didPersistLocalSnapshot = false

              const message = storage.reportError(error)
              store.getState().actions.setSyncState({
                syncMode: storage.mode,
                syncStatus: 'error',
                syncError: message,
              })
            }
          }

          persistSnapshot(store.getState())
          unsubscribe = store.subscribe(persistSnapshot)
        }

        if (!didPersistLocalSnapshot) {
          return
        }

        store.getState().actions.setSyncState({ syncMode: storage.mode, syncStatus: 'ready' })
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return
        }

        const message = storage.reportError(error)
        store.getState().actions.setSyncState({
          syncMode: storage.mode,
          syncStatus: 'error',
          syncError: message,
        })
      })

    return () => {
      isActive = false
      unsubscribe?.()
    }
  }, [isLoaded, storage, store])
}
