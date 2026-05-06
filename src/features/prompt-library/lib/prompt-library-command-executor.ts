import { createPromptLibraryProjection } from '@/features/prompt-library/lib/prompt-library-projection'
import { filenameOf } from '@/features/prompt-library/lib/prompt-library-utils'
import { type PromptLibraryClient } from '@/features/prompt-library/storage/prompt-library-client'
import { type PromptLibraryStoreApi } from '@/features/prompt-library/store/prompt-library-store'
import { type PromptRecord } from '@/features/prompt-library/types'

type PromptLibraryClipboard = {
  writeText: (value: string) => Promise<void>
}

type PromptLibraryCommandExecutorOptions = {
  clipboard: PromptLibraryClipboard
  focusTitleInput?: () => void
  library: PromptLibraryClient
  notify: (message: string) => void
  store: PromptLibraryStoreApi
}

export type PromptLibraryCommandExecutor = ReturnType<typeof createPromptLibraryCommandExecutor>

export const createPromptLibraryCommandExecutor = ({
  clipboard,
  focusTitleInput,
  library,
  notify,
  store,
}: PromptLibraryCommandExecutorOptions) => {
  const getProjection = () => {
    const state = store.getState()

    return createPromptLibraryProjection({
      prompts: state.prompts,
      query: state.query,
      selectedPromptId: state.selectedPromptId,
    })
  }

  const markSyncReady = () => {
    store.getState().actions.setSyncState({ syncMode: library.mode, syncStatus: 'ready' })
  }

  const markSyncError = (error: unknown) => {
    const message = library.reportError(error)

    store.getState().actions.setSyncState({
      syncMode: library.mode,
      syncStatus: 'error',
      syncError: message,
    })
    notify(`sync failed - ${message}`)
  }

  const commitPrompt = async (prompt: PromptRecord, operation: 'add' | 'update') => {
    try {
      const savedPrompt =
        operation === 'add' ? await library.addPrompt(prompt) : await library.updatePrompt(prompt)

      store.getState().actions.replacePrompt(savedPrompt)
      markSyncReady()
    } catch (error) {
      markSyncError(error)
    }
  }

  const selectPrompt = (promptId: string) => {
    if (store.getState().composer.mode !== 'view') {
      notify('press esc to finish editing first')
      return
    }

    store.getState().actions.selectPrompt(promptId)
  }

  const copyActivePrompt = async () => {
    const activePrompt = getProjection().activePrompt

    if (!activePrompt) {
      return
    }

    try {
      await clipboard.writeText(activePrompt.body)
    } catch {
      notify('clipboard access is unavailable')
      return
    }

    store.getState().actions.incrementUses(activePrompt.id)

    try {
      const syncedPrompt = await library.recordPromptUse(activePrompt.id)

      if (syncedPrompt) {
        store.getState().actions.replacePrompt(syncedPrompt)
      }

      markSyncReady()
    } catch (error) {
      markSyncError(error)
    }

    notify(`copied -> ${activePrompt.title}`)
  }

  const saveComposer = () => {
    const result = store.getState().actions.saveComposer()

    if (result.status === 'invalid') {
      notify('title and body required')
      focusTitleInput?.()
      return
    }

    if (result.status === 'created') {
      void commitPrompt(result.prompt, 'add')
      notify(`wrote ${filenameOf(result.prompt.title)}.md`)
      return
    }

    if (result.status === 'updated') {
      void commitPrompt(result.prompt, 'update')
      notify(`saved ${filenameOf(result.prompt.title)}.md`)
    }
  }

  const duplicatePrompt = () => {
    const activePrompt = getProjection().activePrompt

    if (!activePrompt) {
      return
    }

    const duplicatedPrompt = store.getState().actions.duplicatePrompt(activePrompt.id)

    if (duplicatedPrompt) {
      void commitPrompt(duplicatedPrompt, 'add')
      notify(`duplicated -> ${duplicatedPrompt.title}`)
    }
  }

  const deletePrompt = () => {
    const projection = getProjection()
    const activePrompt = projection.activePrompt

    if (!activePrompt) {
      return
    }

    const actions = store.getState().actions

    if (store.getState().confirmDeleteId !== activePrompt.id) {
      actions.requestDeletePrompt(activePrompt.id)
      notify('press delete again to confirm')
      return
    }

    const nextSelectedPromptId = projection.getNearestPromptIdAfterRemoval(activePrompt.id)
    const removedPrompt = actions.deletePrompt(activePrompt.id, nextSelectedPromptId)

    if (removedPrompt) {
      void library.removePrompt(removedPrompt.id).then(markSyncReady).catch(markSyncError)
      notify(`removed -> ${removedPrompt.title}`)
    }
  }

  const startEditActivePrompt = () => {
    const activePrompt = getProjection().activePrompt

    if (activePrompt) {
      store.getState().actions.startEdit(activePrompt.id)
    }
  }

  return {
    copyActivePrompt,
    deletePrompt,
    duplicatePrompt,
    saveComposer,
    selectPrompt,
    startEditActivePrompt,
  }
}
