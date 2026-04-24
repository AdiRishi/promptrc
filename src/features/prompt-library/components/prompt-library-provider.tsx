import { useAuth } from '@clerk/tanstack-react-start'
import { type PropsWithChildren, createContext, use, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'

import {
  type PromptLibraryClient,
  createPromptLibraryClient,
} from '@/features/prompt-library/storage/prompt-library-client'
import { usePromptLibraryHydration } from '@/features/prompt-library/storage/use-prompt-library-hydration'
import { usePromptLibraryStorage } from '@/features/prompt-library/storage/use-prompt-library-storage'
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
  const { isLoaded, isSignedIn, userId } = useAuth()
  const storage = usePromptLibraryStorage(isSignedIn === true, userId ?? null)
  const [store] = useState(createPromptLibraryStore)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const titleInputRef = useRef<HTMLInputElement | null>(null)

  const library = useMemo(() => createPromptLibraryClient(storage, store), [storage, store])
  usePromptLibraryHydration({ isLoaded, storage, store })

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
