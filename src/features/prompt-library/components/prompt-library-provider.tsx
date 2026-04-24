import { useAuth } from '@clerk/tanstack-react-start'
import { type PropsWithChildren, createContext, use, useEffect, useMemo, useRef } from 'react'
import { useStore } from 'zustand'

import {
  type PromptLibraryHydrationResult,
  type PromptLibraryStorage,
} from '@/features/prompt-library/storage/prompt-library-storage'
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
  storage: PromptLibraryStorage
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

const applyHydrationResult = (
  store: PromptLibraryStoreApi,
  hydrationResult: PromptLibraryHydrationResult,
) => {
  if (hydrationResult.source === 'local') {
    store.getState().actions.restoreLocalState(hydrationResult.snapshot)
    return
  }

  store.getState().actions.replacePrompts(hydrationResult.prompts)
}

export function PromptLibraryProvider({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn } = useAuth()
  const storage = usePromptLibraryStorage(isSignedIn === true)
  const storeRef = useRef<PromptLibraryStoreApi | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const titleInputRef = useRef<HTMLInputElement | null>(null)

  if (!storeRef.current) {
    storeRef.current = createPromptLibraryStore()
  }

  useEffect(() => {
    const store = storeRef.current

    if (!store || !isLoaded) {
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

          if (storage.persistSnapshot) {
            storage.persistSnapshot(getPromptLibraryPersistedSnapshot(store.getState()))
            unsubscribe = store.subscribe((state) => {
              storage.persistSnapshot?.(getPromptLibraryPersistedSnapshot(state))
            })
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
  }, [isLoaded, storage])

  const value = useMemo<PromptLibraryContextValue>(
    () => ({
      storage,
      store: storeRef.current as PromptLibraryStoreApi,
      meta: {
        searchInputRef,
        titleInputRef,
      },
    }),
    [storage],
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

export const usePromptLibraryStorageContext = () => {
  return usePromptLibraryContext().storage
}
