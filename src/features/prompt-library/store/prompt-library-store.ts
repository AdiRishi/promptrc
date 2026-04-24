import { createStore } from 'zustand/vanilla'

import { INITIAL_PROMPTS } from '@/features/prompt-library/lib/prompt-library-data'
import {
  createInitialComposerState,
  createPromptRecordFromDraft,
  duplicatePromptRecord,
  getExistingSelectedPromptId,
  incrementPromptRecordUses,
  updatePromptRecordFromDraft,
  upsertPromptRecord,
} from '@/features/prompt-library/lib/prompt-library-domain'
import { createPromptDraft } from '@/features/prompt-library/lib/prompt-library-utils'
import {
  type ComposerState,
  type PromptDraft,
  type PromptLibraryPersistedSnapshot,
  type PromptRecord,
  type PromptSyncMode,
  type PromptSyncStatus,
} from '@/features/prompt-library/types'

type PromptCollectionState = {
  prompts: PromptRecord[]
}

type PromptWorkspaceState = {
  query: string
  selectedPromptId: string | null
  composer: ComposerState
  confirmDeleteId: string | null
}

type PromptSyncState = {
  hasHydrated: boolean
  syncMode: PromptSyncMode
  syncStatus: PromptSyncStatus
  syncError: string | null
}

type PromptLibraryStateShape = PromptCollectionState & PromptWorkspaceState & PromptSyncState

const createInitialState = (): PromptLibraryStateShape => ({
  prompts: INITIAL_PROMPTS,
  query: '',
  selectedPromptId: INITIAL_PROMPTS[0]?.id ?? null,
  composer: createInitialComposerState(),
  confirmDeleteId: null,
  hasHydrated: false,
  syncMode: 'local',
  syncStatus: 'idle',
  syncError: null,
})

type SaveComposerResult =
  | { status: 'created' | 'updated'; prompt: PromptRecord }
  | { status: 'invalid' | 'idle' }

export type PromptLibraryState = PromptLibraryStateShape

export type PromptLibraryActions = {
  restoreLocalState: (persistedState: PromptLibraryPersistedSnapshot | null) => void
  replacePrompt: (prompt: PromptRecord) => void
  replacePrompts: (prompts: PromptRecord[]) => void
  setSyncState: (
    syncState: Partial<Pick<PromptLibraryState, 'syncMode' | 'syncStatus' | 'syncError'>>,
  ) => void
  setQuery: (query: string) => void
  clearQuery: () => void
  selectPrompt: (promptId: string | null) => void
  startNew: () => void
  startEdit: (promptId: string) => void
  updateDraft: <TFieldName extends keyof PromptDraft>(
    field: TFieldName,
    value: PromptDraft[TFieldName],
  ) => void
  cancelComposer: () => void
  saveComposer: () => SaveComposerResult
  duplicatePrompt: (promptId: string) => PromptRecord | null
  requestDeletePrompt: (promptId: string) => void
  clearDeleteConfirmation: () => void
  deletePrompt: (promptId: string, nextSelectedPromptId?: string | null) => PromptRecord | null
  incrementUses: (promptId: string) => void
}

export type PromptLibraryStore = PromptLibraryState & {
  actions: PromptLibraryActions
}

export const createPromptLibraryStore = () => {
  return createStore<PromptLibraryStore>()((set, get) => ({
    ...createInitialState(),
    actions: {
      restoreLocalState: (persistedState) => {
        set((state) => {
          const prompts = persistedState?.prompts ?? state.prompts
          const selectedPromptId = getExistingSelectedPromptId(
            prompts,
            persistedState?.selectedPromptId ?? state.selectedPromptId,
          )

          return {
            prompts,
            query: persistedState?.query ?? state.query,
            selectedPromptId,
            composer: persistedState?.composer ?? state.composer,
            confirmDeleteId: null,
            hasHydrated: true,
          }
        })
      },
      replacePrompt: (replacementPrompt) => {
        set((state) => {
          const prompts = upsertPromptRecord(state.prompts, replacementPrompt)

          return {
            prompts,
            selectedPromptId: getExistingSelectedPromptId(prompts, state.selectedPromptId),
          }
        })
      },
      replacePrompts: (prompts) => {
        set((state) => ({
          prompts,
          selectedPromptId: getExistingSelectedPromptId(prompts, state.selectedPromptId),
          composer: createInitialComposerState(),
          confirmDeleteId: null,
          hasHydrated: true,
        }))
      },
      setSyncState: (syncState) => {
        set((state) => ({
          ...syncState,
          syncError:
            syncState.syncStatus && syncState.syncStatus !== 'error'
              ? null
              : (syncState.syncError ?? state.syncError),
        }))
      },
      setQuery: (query) => {
        set({ query })
      },
      clearQuery: () => {
        set({ query: '' })
      },
      selectPrompt: (selectedPromptId) => {
        set({ selectedPromptId })
      },
      startNew: () => {
        set({
          composer: {
            mode: 'new',
            draft: createInitialComposerState().draft,
          },
          confirmDeleteId: null,
        })
      },
      startEdit: (promptId) => {
        const prompt = get().prompts.find((entry) => entry.id === promptId)

        if (!prompt) {
          return
        }

        set({
          selectedPromptId: prompt.id,
          composer: {
            mode: 'edit',
            draft: createPromptDraft(prompt),
          },
          confirmDeleteId: null,
        })
      },
      updateDraft: (field, value) => {
        set((state) => ({
          composer: {
            ...state.composer,
            draft: {
              ...state.composer.draft,
              [field]: value,
            },
          },
        }))
      },
      cancelComposer: () => {
        set({
          composer: createInitialComposerState(),
          confirmDeleteId: null,
        })
      },
      saveComposer: () => {
        const state = get()

        if (state.composer.mode === 'view') {
          return { status: 'idle' }
        }

        if (state.composer.mode === 'new') {
          const createdPrompt = createPromptRecordFromDraft(state.composer.draft)

          if (!createdPrompt) {
            return { status: 'invalid' }
          }

          set((currentState) => ({
            prompts: [createdPrompt, ...currentState.prompts],
            selectedPromptId: createdPrompt.id,
            composer: createInitialComposerState(),
            confirmDeleteId: null,
          }))

          return { status: 'created', prompt: createdPrompt }
        }

        const promptToUpdate = state.prompts.find((prompt) => prompt.id === state.selectedPromptId)

        if (!promptToUpdate) {
          return { status: 'invalid' }
        }

        const updatedPrompt = updatePromptRecordFromDraft(promptToUpdate, state.composer.draft)

        if (!updatedPrompt) {
          return { status: 'invalid' }
        }

        set((currentState) => ({
          prompts: currentState.prompts.map((prompt) =>
            prompt.id === updatedPrompt.id ? updatedPrompt : prompt,
          ),
          selectedPromptId: updatedPrompt.id,
          composer: createInitialComposerState(),
          confirmDeleteId: null,
        }))

        return { status: 'updated', prompt: updatedPrompt }
      },
      duplicatePrompt: (promptId) => {
        const sourcePrompt = get().prompts.find((prompt) => prompt.id === promptId)

        if (!sourcePrompt) {
          return null
        }

        const duplicatePrompt = duplicatePromptRecord(sourcePrompt)

        set((state) => ({
          prompts: [duplicatePrompt, ...state.prompts],
          selectedPromptId: duplicatePrompt.id,
          confirmDeleteId: null,
        }))

        return duplicatePrompt
      },
      requestDeletePrompt: (promptId) => {
        set({ confirmDeleteId: promptId })
      },
      clearDeleteConfirmation: () => {
        set({ confirmDeleteId: null })
      },
      deletePrompt: (promptId, nextSelectedPromptId) => {
        const promptToDelete = get().prompts.find((prompt) => prompt.id === promptId)

        if (!promptToDelete) {
          return null
        }

        set((state) => {
          const nextPrompts = state.prompts.filter((prompt) => prompt.id !== promptId)

          return {
            prompts: nextPrompts,
            selectedPromptId: getExistingSelectedPromptId(
              nextPrompts,
              nextSelectedPromptId ?? state.selectedPromptId,
            ),
            confirmDeleteId: null,
          }
        })

        return promptToDelete
      },
      incrementUses: (promptId) => {
        set((state) => ({
          prompts: incrementPromptRecordUses(state.prompts, promptId),
        }))
      },
    },
  }))
}

export type PromptLibraryStoreApi = ReturnType<typeof createPromptLibraryStore>

export const getPromptLibraryPersistedSnapshot = (
  state: PromptLibraryStore,
): PromptLibraryPersistedSnapshot => ({
  prompts: state.prompts,
  query: state.query,
  selectedPromptId: state.selectedPromptId,
  composer: state.composer,
})
