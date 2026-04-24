import { useCallback } from 'react'
import { toast } from 'sonner'

import { filenameOf } from '@/features/prompt-library/lib/prompt-library-utils'
import { type PromptLibraryClient } from '@/features/prompt-library/storage/prompt-library-client'
import { type PromptLibraryActions } from '@/features/prompt-library/store/prompt-library-store'
import { type PromptRecord } from '@/features/prompt-library/types'

type UsePromptLibraryCommandsOptions = {
  actions: PromptLibraryActions
  activePrompt: PromptRecord | null
  composerMode: 'view' | 'new' | 'edit'
  confirmDeleteId: string | null
  flatPromptIds: string[]
  library: PromptLibraryClient
  prompts: PromptRecord[]
  titleInputRef: React.RefObject<HTMLInputElement | null>
}

export function usePromptLibraryCommands({
  actions,
  activePrompt,
  composerMode,
  confirmDeleteId,
  flatPromptIds,
  library,
  prompts,
  titleInputRef,
}: UsePromptLibraryCommandsOptions) {
  const markSyncError = useCallback(
    (error: unknown) => {
      const message = library.reportError(error)

      actions.setSyncState({
        syncMode: library.mode,
        syncStatus: 'error',
        syncError: message,
      })
      toast(`sync failed - ${message}`)
    },
    [actions, library],
  )

  const commitPrompt = useCallback(
    async (prompt: PromptRecord, operation: 'add' | 'update') => {
      try {
        const savedPrompt =
          operation === 'add' ? await library.addPrompt(prompt) : await library.updatePrompt(prompt)

        actions.replacePrompt(savedPrompt)
        actions.setSyncState({ syncMode: library.mode, syncStatus: 'ready' })
      } catch (error) {
        markSyncError(error)
      }
    },
    [actions, library, markSyncError],
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
      const syncedPrompt = await library.recordPromptUse(activePrompt.id)

      if (syncedPrompt) {
        actions.replacePrompt(syncedPrompt)
      }

      actions.setSyncState({ syncMode: library.mode, syncStatus: 'ready' })
    } catch (error) {
      markSyncError(error)
    }

    toast(`copied → ${activePrompt.title}`)
  }, [actions, activePrompt, library, markSyncError])

  const saveComposer = useCallback(() => {
    const result = actions.saveComposer()

    if (result.status === 'invalid') {
      toast('title and body required')
      titleInputRef.current?.focus()
      return
    }

    if (result.status === 'created') {
      void commitPrompt(result.prompt, 'add')
      toast(`wrote ${filenameOf(result.prompt.title)}.md`)
      return
    }

    if (result.status === 'updated') {
      void commitPrompt(result.prompt, 'update')
      toast(`saved ${filenameOf(result.prompt.title)}.md`)
    }
  }, [actions, commitPrompt, titleInputRef])

  const duplicatePrompt = useCallback(() => {
    if (!activePrompt) {
      return
    }

    const duplicatedPrompt = actions.duplicatePrompt(activePrompt.id)

    if (duplicatedPrompt) {
      void commitPrompt(duplicatedPrompt, 'add')
      toast(`duplicated → ${duplicatedPrompt.title}`)
    }
  }, [actions, activePrompt, commitPrompt])

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
      void library
        .removePrompt(removedPrompt.id)
        .then(() => {
          actions.setSyncState({ syncMode: library.mode, syncStatus: 'ready' })
        })
        .catch(markSyncError)
      toast(`removed → ${removedPrompt.title}`)
    }
  }, [actions, activePrompt, confirmDeleteId, flatPromptIds, library, markSyncError, prompts])

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
