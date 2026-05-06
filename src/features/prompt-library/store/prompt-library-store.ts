import { createStore } from 'zustand/vanilla'

import { INITIAL_PROMPTS } from '@/features/prompt-library/model/prompt-library-data'
import {
  createInitialComposerState,
  createPromptDraft,
  createPromptRecordFromDraft,
  duplicatePromptRecord,
  getExistingSelectedPromptId,
  incrementPromptRecordUses,
  updatePromptRecordFromDraft,
  upsertPromptRecord,
} from '@/features/prompt-library/model/prompt-library-records'
import { getStartHerePrompt } from '@/features/prompt-library/model/starter-prompts'
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
  isFresh: boolean
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

type FirstSignInCopyState = {
  status: 'idle' | 'prompting' | 'copying' | 'error'
  localPrompts: PromptRecord[]
  error: string | null
}

type PromptOnboardingState = {
  firstSignInCopy: FirstSignInCopyState
}

type PromptLibraryStateShape = PromptCollectionState &
  PromptWorkspaceState &
  PromptSyncState &
  PromptOnboardingState

const createInitialState = (): PromptLibraryStateShape => ({
  prompts: INITIAL_PROMPTS,
  isFresh: true,
  query: '',
  selectedPromptId: INITIAL_PROMPTS[0]?.id ?? null,
  composer: createInitialComposerState(),
  confirmDeleteId: null,
  hasHydrated: false,
  syncMode: 'local',
  syncStatus: 'idle',
  syncError: null,
  firstSignInCopy: {
    status: 'idle',
    localPrompts: [],
    error: null,
  },
})

type SaveComposerResult =
  | { status: 'created' | 'updated'; prompt: PromptRecord }
  | { status: 'invalid' | 'idle' }

export type PromptLibraryState = PromptLibraryStateShape

export type PromptLibraryActions = {
  restoreLocalState: (persistedState: PromptLibraryPersistedSnapshot | null) => void
  seedStarterPrompts: (starterPrompts: PromptRecord[]) => void
  markPromptLibraryNotFresh: () => void
  offerFirstSignInCopy: (localPrompts: PromptRecord[]) => void
  beginFirstSignInCopy: () => void
  completeFirstSignInCopy: (copiedPrompts: PromptRecord[]) => void
  declineFirstSignInCopy: () => void
  failFirstSignInCopy: (message: string) => void
  replacePrompt: (prompt: PromptRecord) => void
  replacePrompts: (prompts: PromptRecord[], options?: { isFresh?: boolean }) => void
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
            isFresh: persistedState?.isFresh ?? state.isFresh,
            query: persistedState?.query ?? state.query,
            selectedPromptId,
            composer: persistedState?.composer ?? state.composer,
            confirmDeleteId: null,
            hasHydrated: true,
            firstSignInCopy: createInitialState().firstSignInCopy,
          }
        })
      },
      seedStarterPrompts: (starterPrompts) => {
        set(() => ({
          prompts: starterPrompts,
          selectedPromptId: getStartHerePrompt(starterPrompts)?.id ?? starterPrompts[0]?.id ?? null,
          composer: createInitialComposerState(),
          confirmDeleteId: null,
          hasHydrated: true,
          isFresh: true,
          firstSignInCopy: createInitialState().firstSignInCopy,
        }))
      },
      markPromptLibraryNotFresh: () => {
        set({ isFresh: false })
      },
      offerFirstSignInCopy: (localPrompts) => {
        set({
          firstSignInCopy: {
            status: 'prompting',
            localPrompts,
            error: null,
          },
        })
      },
      beginFirstSignInCopy: () => {
        set((state) => ({
          firstSignInCopy: {
            ...state.firstSignInCopy,
            status: 'copying',
            error: null,
          },
        }))
      },
      completeFirstSignInCopy: (copiedPrompts) => {
        set({
          prompts: copiedPrompts,
          isFresh: false,
          selectedPromptId: copiedPrompts[0]?.id ?? null,
          composer: createInitialComposerState(),
          confirmDeleteId: null,
          firstSignInCopy: createInitialState().firstSignInCopy,
        })
      },
      declineFirstSignInCopy: () => {
        set({
          prompts: [],
          isFresh: false,
          selectedPromptId: null,
          composer: createInitialComposerState(),
          confirmDeleteId: null,
          firstSignInCopy: createInitialState().firstSignInCopy,
        })
      },
      failFirstSignInCopy: (message) => {
        set((state) => ({
          firstSignInCopy: {
            ...state.firstSignInCopy,
            status: 'error',
            error: message,
          },
        }))
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
      replacePrompts: (prompts, options) => {
        set((state) => ({
          prompts,
          isFresh: options?.isFresh ?? state.isFresh,
          selectedPromptId: getExistingSelectedPromptId(prompts, state.selectedPromptId),
          composer: createInitialComposerState(),
          confirmDeleteId: null,
          hasHydrated: true,
          firstSignInCopy: createInitialState().firstSignInCopy,
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
            isFresh: false,
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
          isFresh: false,
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
          isFresh: false,
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
            isFresh: false,
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
          isFresh: state.prompts.some((prompt) => prompt.id === promptId) ? false : state.isFresh,
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
  isFresh: state.isFresh,
  query: state.query,
  selectedPromptId: state.selectedPromptId,
  composer: state.composer,
})
