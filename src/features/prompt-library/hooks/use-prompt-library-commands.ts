import { useCallback } from 'react'
import { toast } from 'sonner'

import { filenameOf } from '@/features/prompt-library/lib/prompt-library-utils'
import { type PromptLibraryStorage } from '@/features/prompt-library/storage/prompt-library-storage'
import { type PromptLibraryActions } from '@/features/prompt-library/store/prompt-library-store'
import { type PromptRecord } from '@/features/prompt-library/types'

type UsePromptLibraryCommandsOptions = {
  actions: PromptLibraryActions
  activePrompt: PromptRecord | null
  composerMode: 'view' | 'new' | 'edit'
  confirmDeleteId: string | null
  flatPromptIds: string[]
  prompts: PromptRecord[]
  storage: PromptLibraryStorage
  titleInputRef: React.RefObject<HTMLInputElement | null>
}

export function usePromptLibraryCommands({
  actions,
  activePrompt,
  composerMode,
  confirmDeleteId,
  flatPromptIds,
  prompts,
  storage,
  titleInputRef,
}: UsePromptLibraryCommandsOptions) {
  const markSyncError = useCallback(
    (error: unknown) => {
      const message = storage.reportError(error)

      actions.setSyncState({
        syncMode: storage.mode,
        syncStatus: 'error',
        syncError: message,
      })
      toast(`sync failed - ${message}`)
    },
    [actions, storage],
  )

  const persistPrompt = useCallback(
    async (prompt: PromptRecord) => {
      try {
        await storage.savePrompt(prompt)
        actions.setSyncState({ syncMode: storage.mode, syncStatus: 'ready' })
      } catch (error) {
        markSyncError(error)
      }
    },
    [actions, markSyncError, storage],
  )

  const selectPrompt = useCallback(
    (promptId: string) => {
      if (composerMode !== 'view') {
        toast('press esc to finish editing first')
        return
      }

      actions.selectPrompt(promptId)
    },
    [actions, composerMode],
  )

  const copyActivePrompt = useCallback(async () => {
    if (!activePrompt) {
      return
    }

    try {
      await navigator.clipboard.writeText(activePrompt.body)
    } catch {
      toast('clipboard access is unavailable')
      return
    }

    actions.incrementUses(activePrompt.id)

    try {
      await storage.incrementUses(activePrompt.id)
      actions.setSyncState({ syncMode: storage.mode, syncStatus: 'ready' })
    } catch (error) {
      markSyncError(error)
    }

    toast(`copied → ${activePrompt.title}`)
  }, [actions, activePrompt, markSyncError, storage])

  const saveComposer = useCallback(() => {
    const result = actions.saveComposer()

    if (result.status === 'invalid') {
      toast('title and body required')
      titleInputRef.current?.focus()
      return
    }

    if (result.status === 'created') {
      void persistPrompt(result.prompt)
      toast(`wrote ${filenameOf(result.prompt.title)}.md`)
      return
    }

    if (result.status === 'updated') {
      void persistPrompt(result.prompt)
      toast(`saved ${filenameOf(result.prompt.title)}.md`)
    }
  }, [actions, persistPrompt, titleInputRef])

  const duplicatePrompt = useCallback(() => {
    if (!activePrompt) {
      return
    }

    const duplicatedPrompt = actions.duplicatePrompt(activePrompt.id)

    if (duplicatedPrompt) {
      void persistPrompt(duplicatedPrompt)
      toast(`duplicated → ${duplicatedPrompt.title}`)
    }
  }, [actions, activePrompt, persistPrompt])

  const deletePrompt = useCallback(() => {
    if (!activePrompt) {
      return
    }

    if (confirmDeleteId !== activePrompt.id) {
      actions.requestDeletePrompt(activePrompt.id)
      toast('press delete again to confirm')
      return
    }

    const orderedPromptIds = flatPromptIds.includes(activePrompt.id)
      ? flatPromptIds
      : prompts.map((prompt) => prompt.id)
    const currentPromptIndex = orderedPromptIds.indexOf(activePrompt.id)
    const nextSelectedPromptId =
      orderedPromptIds[currentPromptIndex + 1] ?? orderedPromptIds[currentPromptIndex - 1] ?? null
    const removedPrompt = actions.deletePrompt(activePrompt.id, nextSelectedPromptId)

    if (removedPrompt) {
      void storage
        .deletePrompt(removedPrompt.id)
        .then(() => {
          actions.setSyncState({ syncMode: storage.mode, syncStatus: 'ready' })
        })
        .catch(markSyncError)
      toast(`removed → ${removedPrompt.title}`)
    }
  }, [actions, activePrompt, confirmDeleteId, flatPromptIds, markSyncError, prompts, storage])

  const startEditActivePrompt = useCallback(() => {
    if (!activePrompt) {
      return
    }

    actions.startEdit(activePrompt.id)
  }, [actions, activePrompt])

  return {
    copyActivePrompt,
    deletePrompt,
    duplicatePrompt,
    saveComposer,
    selectPrompt,
    startEditActivePrompt,
  }
}
