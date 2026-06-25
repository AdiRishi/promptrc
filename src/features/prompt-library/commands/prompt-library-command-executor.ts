import { filenameOf } from '@/features/prompt-library/rendering/prompt-library-formatting'
import { selectPromptLibraryVisibleState } from '@/features/prompt-library/selectors/prompt-library-selectors'
import { type PromptLibraryStoreApi } from '@/features/prompt-library/store/prompt-library-store'
import { type PromptLibraryClient } from '@/features/prompt-library/sync/prompt-library-client'
import { type PromptRecord } from '@/features/prompt-library/types'

type PromptLibraryClipboard = {
  writeText: (value: string) => Promise<void>
}

type PromptLibraryCommandExecutorOptions = {
  clipboard: PromptLibraryClipboard
  focusTitleInput?: () => void
  getShareUrl?: (shareId: string) => string
  library: PromptLibraryClient
  notify: (message: string) => void
  store: PromptLibraryStoreApi
}

export type PromptLibraryCommandExecutor = ReturnType<typeof createPromptLibraryCommandExecutor>

export const createPromptLibraryCommandExecutor = ({
  clipboard,
  focusTitleInput,
  getShareUrl = (shareId) => `/share/${shareId}`,
  library,
  notify,
  store,
}: PromptLibraryCommandExecutorOptions) => {
  const getVisibleState = () => {
    const state = store.getState()

    return selectPromptLibraryVisibleState({
      prompts: state.prompts,
      query: state.query,
      selectedPromptId: state.selectedPromptId,
    })
  }

  const notifySyncFailure = (message: string) => {
    notify(`sync failed - ${message}`)
  }

  const commitPrompt = async (prompt: PromptRecord) => {
    const result = await library.savePrompt(prompt)

    if (result.status === 'failed') {
      notifySyncFailure(result.message)
      return
    }

    store.getState().actions.replacePrompt(result.value)
  }

  const selectPrompt = (promptId: string) => {
    if (store.getState().composer.mode !== 'view') {
      notify('press esc to finish editing first')
      return
    }

    store.getState().actions.selectPrompt(promptId)
  }

  const copyActivePrompt = async () => {
    const activePrompt = getVisibleState().activePrompt

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

    const result = await library.recordPromptUse(activePrompt.id)

    if (result.status === 'failed') {
      notifySyncFailure(result.message)
    } else if (result.value) {
      store.getState().actions.replacePrompt(result.value)
    }

    notify(`copied -> ${activePrompt.title}`)
  }

  const shareActivePrompt = async () => {
    const activePrompt = getVisibleState().activePrompt

    if (!activePrompt) {
      return
    }

    if (!library.canSharePrompts) {
      notify('sign in to share prompts')
      return
    }

    const result = await library.createPromptShare(activePrompt.id)

    if (result.status === 'failed') {
      notifySyncFailure(result.message)
      return
    }

    const shareUrl = getShareUrl(result.value.id)

    try {
      await clipboard.writeText(shareUrl)
    } catch {
      notify(`share link ready -> ${shareUrl}`)
      return
    }

    notify(`share link copied -> ${activePrompt.title}`)
  }

  const revokeActivePromptShare = async () => {
    const activePrompt = getVisibleState().activePrompt

    if (!activePrompt) {
      return
    }

    if (!library.canSharePrompts) {
      notify('sign in to share prompts')
      return
    }

    const result = await library.revokePromptShare(activePrompt.id)

    if (result.status === 'failed') {
      notifySyncFailure(result.message)
      return
    }

    notify(
      result.value.revoked ? `share link revoked -> ${activePrompt.title}` : 'no active share link',
    )
  }

  const saveComposer = () => {
    const result = store.getState().actions.saveComposer()

    if (result.status === 'invalid') {
      notify('title and body required')
      focusTitleInput?.()
      return
    }

    if (result.status === 'created') {
      void commitPrompt(result.prompt)
      notify(`wrote ${filenameOf(result.prompt.title)}.md`)
      return
    }

    if (result.status === 'updated') {
      void commitPrompt(result.prompt)
      notify(`saved ${filenameOf(result.prompt.title)}.md`)
    }
  }

  const duplicatePrompt = () => {
    const activePrompt = getVisibleState().activePrompt

    if (!activePrompt) {
      return
    }

    const duplicatedPrompt = store.getState().actions.duplicatePrompt(activePrompt.id)

    if (duplicatedPrompt) {
      void commitPrompt(duplicatedPrompt)
      notify(`duplicated -> ${duplicatedPrompt.title}`)
    }
  }

  const deletePrompt = () => {
    const visibleState = getVisibleState()
    const activePrompt = visibleState.activePrompt

    if (!activePrompt) {
      return
    }

    const actions = store.getState().actions

    if (store.getState().confirmDeleteId !== activePrompt.id) {
      actions.requestDeletePrompt(activePrompt.id)
      notify('press delete again to confirm')
      return
    }

    const nextSelectedPromptId = visibleState.getNearestPromptIdAfterRemoval(activePrompt.id)
    const removedPrompt = actions.deletePrompt(activePrompt.id, nextSelectedPromptId)

    if (removedPrompt) {
      void library.deletePrompt(removedPrompt.id).then((result) => {
        if (result.status === 'failed') {
          notifySyncFailure(result.message)
        }
      })
      notify(`removed -> ${removedPrompt.title}`)
    }
  }

  const startEditActivePrompt = () => {
    const activePrompt = getVisibleState().activePrompt

    if (activePrompt) {
      store.getState().actions.startEdit(activePrompt.id)
    }
  }

  return {
    copyActivePrompt,
    deletePrompt,
    duplicatePrompt,
    revokeActivePromptShare,
    saveComposer,
    selectPrompt,
    shareActivePrompt,
    startEditActivePrompt,
  }
}
