import { useAuth } from '@clerk/tanstack-react-start'
import { useServerFn } from '@tanstack/react-start'
import {
  type PropsWithChildren,
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { useStore } from 'zustand'

import {
  deleteRemotePrompt,
  incrementRemotePromptUses,
  listRemotePrompts,
  upsertRemotePrompt,
} from '@/features/prompt-library/server/prompt-library-functions'
import {
  type PromptLibraryPersistedSnapshot,
  type PromptLibraryStore,
  type PromptLibraryStoreApi,
  createPromptLibraryStore,
  getPromptLibraryPersistedSnapshot,
} from '@/features/prompt-library/store/prompt-library-store'
import { type PromptRecord } from '@/features/prompt-library/types'

const LOCAL_STORAGE_KEY = 'promptrc.library.v1'

type PromptLibraryMeta = {
  searchInputRef: React.RefObject<HTMLInputElement | null>
  titleInputRef: React.RefObject<HTMLInputElement | null>
}

type PromptLibraryStorage = {
  mode: PromptLibraryStore['syncMode']
  deletePrompt: (promptId: string) => Promise<void>
  hydrate: (store: PromptLibraryStoreApi) => Promise<(() => void) | void>
  incrementUses: (promptId: string) => Promise<void>
  reportError: (error: unknown) => string
  savePrompt: (prompt: PromptRecord) => Promise<void>
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
      .hydrate(store)
      .then((cleanup) => {
        if (isActive) {
          unsubscribe = cleanup ?? undefined
          store.getState().actions.setSyncState({ syncMode: storage.mode, syncStatus: 'ready' })
        } else {
          cleanup?.()
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

const normalizeStorageError = (error: unknown) => {
  return error instanceof Error ? error.message : 'Unable to sync prompts'
}

const readLocalSnapshot = (): PromptLibraryPersistedSnapshot | null => {
  const rawValue = localStorage.getItem(LOCAL_STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  const parsedValue = JSON.parse(rawValue) as {
    state?: Partial<PromptLibraryPersistedSnapshot>
  }

  if (!parsedValue.state) {
    return null
  }

  return parsedValue.state as PromptLibraryPersistedSnapshot
}

const writeLocalSnapshot = (state: PromptLibraryStore) => {
  localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify({
      state: getPromptLibraryPersistedSnapshot(state),
      version: 1,
    }),
  )
}

const createNoopStorageMutation = async () => {}

function usePromptLibraryStorage(isSignedIn: boolean): PromptLibraryStorage {
  const listPrompts = useServerFn(listRemotePrompts)
  const upsertPrompt = useServerFn(upsertRemotePrompt)
  const removePrompt = useServerFn(deleteRemotePrompt)
  const incrementPromptUses = useServerFn(incrementRemotePromptUses)

  const localStorageAdapter = useMemo<PromptLibraryStorage>(
    () => ({
      mode: 'local',
      deletePrompt: createNoopStorageMutation,
      hydrate: (store) => {
        store.getState().actions.restoreLocalState(readLocalSnapshot())
        writeLocalSnapshot(store.getState())

        return Promise.resolve(store.subscribe(writeLocalSnapshot))
      },
      incrementUses: createNoopStorageMutation,
      reportError: (error) => normalizeStorageError(error),
      savePrompt: createNoopStorageMutation,
    }),
    [],
  )

  const reportRemoteError = useCallback((store: PromptLibraryStoreApi, error: unknown) => {
    const message = normalizeStorageError(error)

    store.getState().actions.setSyncState({
      syncMode: 'remote',
      syncStatus: 'error',
      syncError: message,
    })

    return message
  }, [])

  const remoteStoreRef = useRef<PromptLibraryStoreApi | null>(null)

  const remoteStorageAdapter = useMemo<PromptLibraryStorage>(
    () => ({
      mode: 'remote',
      deletePrompt: async (promptId) => {
        await removePrompt({ data: promptId })
        remoteStoreRef.current?.getState().actions.setSyncState({
          syncMode: 'remote',
          syncStatus: 'ready',
        })
      },
      hydrate: async (store) => {
        remoteStoreRef.current = store
        store.getState().actions.replacePrompts(await listPrompts())
      },
      incrementUses: async (promptId) => {
        await incrementPromptUses({ data: promptId })
        remoteStoreRef.current?.getState().actions.setSyncState({
          syncMode: 'remote',
          syncStatus: 'ready',
        })
      },
      reportError: (error) => {
        const store = remoteStoreRef.current

        if (!store) {
          return normalizeStorageError(error)
        }

        return reportRemoteError(store, error)
      },
      savePrompt: async (prompt) => {
        await upsertPrompt({ data: prompt })
        remoteStoreRef.current?.getState().actions.setSyncState({
          syncMode: 'remote',
          syncStatus: 'ready',
        })
      },
    }),
    [incrementPromptUses, listPrompts, removePrompt, reportRemoteError, upsertPrompt],
  )

  return isSignedIn ? remoteStorageAdapter : localStorageAdapter
}
