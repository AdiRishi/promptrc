'use client'

import { useAuth } from '@clerk/tanstack-react-start'
import { type PropsWithChildren, createContext, use, useEffect, useMemo, useRef } from 'react'
import { useStore } from 'zustand'

import { listRemotePrompts } from '@/features/prompt-library/server/prompt-library-functions'
import {
  type PromptLibraryStore,
  type PromptLibraryStoreApi,
  createPromptLibraryStore,
} from '@/features/prompt-library/store/prompt-library-store'

type PromptLibraryMeta = {
  searchInputRef: React.RefObject<HTMLInputElement | null>
  titleInputRef: React.RefObject<HTMLInputElement | null>
}

type PromptLibraryContextValue = {
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

    if (!isSignedIn) {
      window.__PROMPTRC_REMOTE_SYNC__ = false
      store.getState().actions.setSyncState({ syncMode: 'local', syncStatus: 'loading' })
      void Promise.resolve(store.persist.rehydrate()).then(() => {
        store.getState().actions.setSyncState({ syncMode: 'local', syncStatus: 'ready' })
      })
      return
    }

    let isActive = true
    window.__PROMPTRC_REMOTE_SYNC__ = true
    store.getState().actions.setSyncState({ syncMode: 'remote', syncStatus: 'loading' })

    void listRemotePrompts()
      .then((prompts) => {
        if (!isActive) {
          return
        }

        store.getState().actions.replacePrompts(prompts)
        store.getState().actions.setSyncState({ syncMode: 'remote', syncStatus: 'ready' })
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return
        }

        store.getState().actions.setSyncState({
          syncMode: 'remote',
          syncStatus: 'error',
          syncError: error instanceof Error ? error.message : 'Unable to sync prompts',
        })
      })

    return () => {
      isActive = false
    }
  }, [isLoaded, isSignedIn])

  const value = useMemo<PromptLibraryContextValue>(
    () => ({
      store: storeRef.current as PromptLibraryStoreApi,
      meta: {
        searchInputRef,
        titleInputRef,
      },
    }),
    [],
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
