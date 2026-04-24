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

type PromptLibraryStorageBase = {
  reportError: (error: unknown) => string
}

export type LocalPromptLibraryStorage = PromptLibraryStorageBase & {
  mode: Extract<PromptSyncMode, 'local'>
  hydrate: () => Promise<Extract<PromptLibraryHydrationResult, { source: 'local' }>>
  persistSnapshot: (snapshot: PromptLibraryPersistedSnapshot) => void
}

export type RemotePromptLibraryStorage = PromptLibraryStorageBase & {
  mode: Extract<PromptSyncMode, 'remote'>
  deletePrompt: (promptId: string) => Promise<void>
  hydrate: () => Promise<Extract<PromptLibraryHydrationResult, { source: 'remote' }>>
  incrementUses: (promptId: string) => Promise<PromptRecord>
  savePrompt: (prompt: PromptRecord) => Promise<PromptRecord>
}

export type PromptLibraryStorage = LocalPromptLibraryStorage | RemotePromptLibraryStorage

export const normalizeStorageError = (error: unknown) => {
  return error instanceof Error ? error.message : 'Unable to sync prompts'
}
