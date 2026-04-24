import {
  type PromptLibraryPersistedSnapshot,
  type PromptRecord,
  type PromptSyncMode,
} from '@/features/prompt-library/types'

export type PromptLibraryHydrationResult =
  | {
      source: 'local'
      snapshot: PromptLibraryPersistedSnapshot | null
    }
  | {
      source: 'remote'
      prompts: PromptRecord[]
    }

export type PromptLibraryStorage = {
  mode: PromptSyncMode
  deletePrompt: (promptId: string) => Promise<void>
  hydrate: () => Promise<PromptLibraryHydrationResult>
  incrementUses: (promptId: string) => Promise<void>
  persistSnapshot?: (snapshot: PromptLibraryPersistedSnapshot) => void
  reportError: (error: unknown) => string
  savePrompt: (prompt: PromptRecord) => Promise<void>
}

export const normalizeStorageError = (error: unknown) => {
  return error instanceof Error ? error.message : 'Unable to sync prompts'
}

export const createNoopStorageMutation = async () => {}
