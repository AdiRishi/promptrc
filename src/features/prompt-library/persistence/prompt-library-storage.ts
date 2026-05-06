import {
  type PromptLibraryPersistedSnapshot,
  type PromptLibraryRemoteSnapshot,
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
      snapshot: PromptLibraryRemoteSnapshot
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
  acceptFirstSignInCopy: (prompts: PromptRecord[]) => Promise<PromptRecord[]>
  addStarterPrompts: (prompts: PromptRecord[]) => Promise<PromptRecord[]>
  declineFirstSignInCopy: () => Promise<PromptLibraryRemoteSnapshot>
  deletePrompt: (promptId: string) => Promise<void>
  hydrate: () => Promise<Extract<PromptLibraryHydrationResult, { source: 'remote' }>>
  recordPromptUse: (promptId: string) => Promise<PromptRecord>
  savePrompt: (prompt: PromptRecord) => Promise<PromptRecord>
}

export type PromptLibraryStorage = LocalPromptLibraryStorage | RemotePromptLibraryStorage

export const normalizeStorageError = (error: unknown) => {
  return error instanceof Error ? error.message : 'Unable to sync prompts'
}
