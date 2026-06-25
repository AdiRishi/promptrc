import {
  type PromptLibraryCommandId,
  type PromptLibraryCommandState,
  canRunPromptLibraryCommand,
} from '@/features/prompt-library/commands/prompt-library-command-surface'

export type PromptLibraryCommandRouter = {
  commandState: PromptLibraryCommandState
  copyActivePrompt: () => void | Promise<void>
  deletePrompt: () => void
  duplicatePrompt: () => void
  focusSearch: () => void
  selectNextPrompt: () => void
  selectPreviousPrompt: () => void
  shareActivePrompt: () => void | Promise<unknown>
  startEditActivePrompt: () => void
  startNewPrompt: () => void
}

type PromptLibraryKeyboardCommandInput = {
  isCopyShortcut: boolean
  key: string
}

export const getPromptLibraryKeyboardCommandId = ({
  isCopyShortcut,
  key,
}: PromptLibraryKeyboardCommandInput): PromptLibraryCommandId | null => {
  if (isCopyShortcut) {
    return 'copy-prompt-body'
  }

  switch (key) {
    case 'n':
      return 'new-prompt'
    case '/':
      return 'focus-search'
    case 'j':
      return 'next-prompt'
    case 'k':
      return 'previous-prompt'
    case 'e':
      return 'edit-prompt'
    case 'd':
      return 'duplicate-prompt'
    case 's':
      return 'share-prompt'
    case 'x':
      return 'delete-prompt'
    default:
      return null
  }
}

export const runPromptLibraryCommand = (
  commandId: PromptLibraryCommandId,
  router: PromptLibraryCommandRouter,
) => {
  if (!canRunPromptLibraryCommand(commandId, router.commandState)) {
    return false
  }

  switch (commandId) {
    case 'copy-prompt-body':
      void router.copyActivePrompt()
      break
    case 'delete-prompt':
      router.deletePrompt()
      break
    case 'duplicate-prompt':
      router.duplicatePrompt()
      break
    case 'edit-prompt':
      router.startEditActivePrompt()
      break
    case 'focus-search':
      router.focusSearch()
      break
    case 'new-prompt':
      router.startNewPrompt()
      break
    case 'next-prompt':
      router.selectNextPrompt()
      break
    case 'previous-prompt':
      router.selectPreviousPrompt()
      break
    case 'share-prompt':
      void router.shareActivePrompt()
      break
    default:
      return false
  }

  return true
}
