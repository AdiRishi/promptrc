import { useAuth } from '@clerk/tanstack-react-start'
import {
  type PropsWithChildren,
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useStore } from 'zustand'

import {
  type PromptLibraryClient,
  applyHydrationResult,
  createPromptLibraryClient,
} from '@/features/prompt-library/storage/prompt-library-client'
import { usePromptLibraryStorage } from '@/features/prompt-library/storage/use-prompt-library-storage'
import {
  type PromptLibraryStore,
  type PromptLibraryStoreApi,
  createPromptLibraryStore,
  getPromptLibraryPersistedSnapshot,
} from '@/features/prompt-library/store/prompt-library-store'

type PromptLibraryMeta = {
  searchInputRef: React.RefObject<HTMLInputElement | null>
  titleInputRef: React.RefObject<HTMLInputElement | null>
}

type PromptLibraryContextValue = {
  library: PromptLibraryClient
  store: PromptLibraryStoreApi
  meta: PromptLibraryMeta
}

const PromptLibraryContext = createContext<PromptLibraryContextValue | null>(null)

const usePromptLibraryContext = () => {
  const context = use(PromptLibraryContext)

  if (!context) {
    throw new Error('PromptLibraryProvider is missing from the component tree.')
  }

  return context
}

export function PromptLibraryProvider({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn } = useAuth()
  const storage = usePromptLibraryStorage(isSignedIn === true)
  const [store] = useState(createPromptLibraryStore)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const titleInputRef = useRef<HTMLInputElement | null>(null)

  const library = useMemo(() => createPromptLibraryClient(storage, store), [storage, store])

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
        if (isActive) {
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
        }
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

  const value = useMemo<PromptLibraryContextValue>(
    () => ({
      library,
      store,
      meta: {
        searchInputRef,
        titleInputRef,
      },
    }),
    [library, store],
  )

  return <PromptLibraryContext value={value}>{children}</PromptLibraryContext>
}

export const usePromptLibraryStore = <TSelection,>(
  selector: (state: PromptLibraryStore) => TSelection,
) => {
  const { store } = usePromptLibraryContext()

  return useStore(store, selector)
}

export const usePromptLibraryMeta = () => {
  return usePromptLibraryContext().meta
}

export const usePromptLibraryClient = () => {
  return usePromptLibraryContext().library
}
