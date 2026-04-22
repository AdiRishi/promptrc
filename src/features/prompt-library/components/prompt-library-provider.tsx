'use client'

import { type PropsWithChildren, createContext, use, useEffect, useMemo, useRef } from 'react'
import { useStore } from 'zustand'

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
  const storeRef = useRef<PromptLibraryStoreApi | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const titleInputRef = useRef<HTMLInputElement | null>(null)

  if (!storeRef.current) {
    storeRef.current = createPromptLibraryStore()
  }

  useEffect(() => {
    void storeRef.current?.persist.rehydrate()
  }, [])

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
