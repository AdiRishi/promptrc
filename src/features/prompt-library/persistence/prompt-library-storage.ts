import {
  type PromptLibraryPersistedSnapshot,
  type PromptLibraryRemoteSnapshot,
  type PromptRecord,
  type PromptShareRecord,
  type PromptShareRevokeResult,
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
  createPromptShare: (promptId: string) => Promise<PromptShareRecord>
  declineFirstSignInCopy: () => Promise<PromptLibraryRemoteSnapshot>
  deletePrompt: (promptId: string) => Promise<void>
  getPromptShare: (promptId: string) => Promise<PromptShareRecord | null>
  hydrate: () => Promise<Extract<PromptLibraryHydrationResult, { source: 'remote' }>>
  recordPromptUse: (promptId: string) => Promise<PromptRecord>
  revokePromptShare: (promptId: string) => Promise<PromptShareRevokeResult>
  savePrompt: (prompt: PromptRecord) => Promise<PromptRecord>
}

export type PromptLibraryStorage = LocalPromptLibraryStorage | RemotePromptLibraryStorage

export const normalizeStorageError = (error: unknown) => {
  return error instanceof Error ? error.message : 'Unable to sync prompts'
}
