import { getPromptCopyText } from '@/features/prompt-library/model/prompt-copy'
import {
  createPromptRecordFromDraft,
  createEmptyPromptDraft,
  deriveTitleFromBody,
} from '@/features/prompt-library/model/prompt-library-integrity'
import { createPromptRun } from '@/features/prompt-library/model/prompt-runs'
import {
  matchesPromptFilter,
  matchesPromptQuery,
  selectPromptLibraryVisibleState,
} from '@/features/prompt-library/selectors/prompt-library-selectors'
import { type PromptLibraryStoreApi } from '@/features/prompt-library/store/prompt-library-store'
import { type PromptLibraryClient } from '@/features/prompt-library/sync/prompt-library-client'
import {
  type PromptImage,
  type PromptKind,
  type PromptRecord,
  type PromptRunVerdict,
  type PromptShareRecord,
  type PromptShareRevokeResult,
} from '@/features/prompt-library/types'

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

export type PromptCopyRequest = {
  values?: Readonly<Record<string, string>>
  stepIndex?: number
}

export type PromptCaptureInput = {
  kind: PromptKind
  body: string
  title?: string
  category?: string
  tagsInput?: string
}

export type PromptRunRequest = {
  model: string
  verdict: PromptRunVerdict
  note?: string
}

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
      filter: state.filter,
      sort: state.sort,
    })
  }

  const notifySyncFailure = (message: string) => {
    notify(`Couldn’t sync — ${message}`)
  }

  const deleteDiscardedPromptImages = async (images: PromptImage[]) => {
    const imageIds = Array.from(new Set(images.map((image) => image.id)))

    if (imageIds.length === 0) {
      return
    }

    const results = await Promise.all(imageIds.map((imageId) => library.deletePromptImage(imageId)))
    const failedResult = results.find((result) => result.status === 'failed')

    if (failedResult) {
      notifySyncFailure(failedResult.message)
    }
  }

  const commitPrompt = async (prompt: PromptRecord, discardedImages: PromptImage[] = []) => {
    const result = await library.savePrompt(prompt)

    if (result.status === 'failed') {
      notifySyncFailure(result.message)
      return
    }

    store.getState().actions.replacePrompt(result.value)
    void deleteDiscardedPromptImages(discardedImages)
  }

  const selectPrompt = (promptId: string) => {
    if (store.getState().composer.mode !== 'view') {
      notify('Finish editing first — save or press Esc')
      return
    }

    store.getState().actions.selectPrompt(promptId)
  }

  const copyActivePrompt = async (request: PromptCopyRequest = {}) => {
    const activePrompt = getVisibleState().activePrompt

    if (!activePrompt) {
      return
    }

    try {
      await clipboard.writeText(getPromptCopyText(activePrompt, request))
    } catch {
      notify('Clipboard access is unavailable')
      return
    }

    store.getState().actions.incrementUses(activePrompt.id)

    const result = await library.recordPromptUse(activePrompt.id)

    if (result.status === 'failed') {
      notifySyncFailure(result.message)
    } else if (result.value) {
      store.getState().actions.replacePrompt(result.value)
    }

    notify(
      request.stepIndex === undefined
        ? `Copied “${activePrompt.title}”`
        : `Copied step ${request.stepIndex + 1} of “${activePrompt.title}”`,
    )
  }

  const shareActivePrompt = async (): Promise<PromptShareRecord | null> => {
    const activePrompt = getVisibleState().activePrompt

    if (!activePrompt) {
      return null
    }

    if (!library.canSharePrompts) {
      notify('Sign in to share prompts')
      return null
    }

    const result = await library.createPromptShare(activePrompt.id)

    if (result.status === 'failed') {
      notifySyncFailure(result.message)
      return null
    }

    const shareUrl = getShareUrl(result.value.id)

    try {
      await clipboard.writeText(shareUrl)
    } catch {
      notify(`Share link ready — ${shareUrl}`)
      return result.value
    }

    notify(`Share link copied for “${activePrompt.title}”`)

    return result.value
  }

  const revokeActivePromptShare = async (): Promise<PromptShareRevokeResult | null> => {
    const activePrompt = getVisibleState().activePrompt

    if (!activePrompt) {
      return null
    }

    if (!library.canSharePrompts) {
      notify('Sign in to share prompts')
      return null
    }

    const result = await library.revokePromptShare(activePrompt.id)

    if (result.status === 'failed') {
      notifySyncFailure(result.message)
      return null
    }

    notify(
      result.value.revoked
        ? `Share link revoked for “${activePrompt.title}”`
        : 'There was no active share link',
    )

    return result.value
  }

  /** A saved Prompt must not open hidden behind the current filter. */
  const revealPrompt = (prompt: PromptRecord) => {
    const { actions, filter } = store.getState()

    if (!matchesPromptFilter(prompt, filter)) {
      actions.setFilter({ type: 'all' })
    }

    if (!matchesPromptQuery(prompt, store.getState().query)) {
      actions.clearQuery()
    }
  }

  const saveComposer = () => {
    const result = store.getState().actions.saveComposer()

    if (result.status === 'invalid') {
      notify('Give it a title and a body first')
      focusTitleInput?.()
      return
    }

    if (result.status === 'pending-images') {
      notify('Wait for image uploads to finish')
      return
    }

    if (result.status === 'created') {
      revealPrompt(result.prompt)
      void commitPrompt(result.prompt, result.discardedImages)
      notify(`Saved “${result.prompt.title}”`)
      return
    }

    if (result.status === 'updated') {
      revealPrompt(result.prompt)
      void commitPrompt(result.prompt, result.discardedImages)
      notify(`Updated “${result.prompt.title}”`)
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
      notify(`Duplicated as “${duplicatedPrompt.title}”`)
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
      notify('Press delete again to confirm')
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
      notify(`Deleted “${removedPrompt.title}”`)
    }
  }

  const startEditActivePrompt = () => {
    const activePrompt = getVisibleState().activePrompt

    if (activePrompt) {
      store.getState().actions.startEdit(activePrompt.id)
    }
  }

  const togglePinActivePrompt = () => {
    const activePrompt = getVisibleState().activePrompt

    if (!activePrompt) {
      return
    }

    const updatedPrompt = store.getState().actions.setPinned(activePrompt.id, !activePrompt.pinned)

    if (updatedPrompt) {
      void commitPrompt(updatedPrompt)
      notify(
        updatedPrompt.pinned
          ? `Pinned “${updatedPrompt.title}”`
          : `Unpinned “${updatedPrompt.title}”`,
      )
    }
  }

  const logRunForActivePrompt = (request: PromptRunRequest) => {
    const activePrompt = getVisibleState().activePrompt

    if (!activePrompt) {
      return false
    }

    const run = createPromptRun(request)

    if (!run) {
      notify('Name the model you ran it against')
      return false
    }

    const updatedPrompt = store.getState().actions.addRun(activePrompt.id, run)

    if (!updatedPrompt) {
      return false
    }

    void commitPrompt(updatedPrompt)
    notify(`Logged a ${run.verdict} on ${run.model}`)

    return true
  }

  const removeRunFromActivePrompt = (runId: string) => {
    const activePrompt = getVisibleState().activePrompt

    if (!activePrompt) {
      return
    }

    const updatedPrompt = store.getState().actions.removeRun(activePrompt.id, runId)

    if (updatedPrompt) {
      void commitPrompt(updatedPrompt)
      notify('Run removed')
    }
  }

  /** Quick capture: saves immediately, deriving a title when none is given. */
  const capturePrompt = (input: PromptCaptureInput) => {
    // Capturing selects the new Prompt; doing that mid-edit would point the open
    // draft at the wrong record.
    if (store.getState().composer.mode !== 'view') {
      notify('Finish editing first — save or press Esc')
      return null
    }

    const body = input.body.trim()

    if (!body) {
      notify('Nothing to capture yet')
      return null
    }

    const prompt = createPromptRecordFromDraft({
      ...createEmptyPromptDraft(input.kind),
      body,
      title: input.title?.trim() || deriveTitleFromBody(body) || 'Untitled',
      category: input.category ?? '',
      tagsInput: input.tagsInput ?? '',
    })

    if (!prompt) {
      notify('Nothing to capture yet')
      return null
    }

    store.getState().actions.insertPrompt(prompt)
    void commitPrompt(prompt)
    notify(`Captured “${prompt.title}”`)

    return prompt
  }

  return {
    capturePrompt,
    copyActivePrompt,
    logRunForActivePrompt,
    removeRunFromActivePrompt,
    togglePinActivePrompt,
    deletePrompt,
    duplicatePrompt,
    revokeActivePromptShare,
    saveComposer,
    selectPrompt,
    shareActivePrompt,
    startEditActivePrompt,
  }
}
