import { useEffect, useEffectEvent } from 'react'

import { getPromptLibraryKeyboardCommandId } from '@/features/prompt-library/commands/prompt-library-command-router'
import {
  type PromptLibraryCommandId,
  type PromptLibraryCommandState,
  canRunPromptLibraryCommand,
} from '@/features/prompt-library/commands/prompt-library-command-surface'
import { type PromptLibraryVisibleState } from '@/features/prompt-library/selectors/prompt-library-selectors'

type UsePromptLibraryHotkeysOptions = {
  commandState: PromptLibraryCommandState
  composerMode: 'view' | 'new' | 'edit'
  isHelpOpen: boolean
  visibleState: PromptLibraryVisibleState
  onSaveComposer: () => void
  onCancelComposer: () => void
  onRunCommand: (commandId: PromptLibraryCommandId) => void
  onToggleHelp: () => void
}

export function usePromptLibraryHotkeys({
  commandState,
  composerMode,
  isHelpOpen,
  visibleState,
  onSaveComposer,
  onCancelComposer,
  onRunCommand,
  onToggleHelp,
}: UsePromptLibraryHotkeysOptions) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (isHelpOpen) {
      if (event.key === 'Escape' || event.key === '?') {
        event.preventDefault()
        onToggleHelp()
      }

      return
    }

    const target = event.target as HTMLElement | null
    const isTyping =
      !!target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

    if (event.key === 'Escape') {
      if (composerMode !== 'view') {
        event.preventDefault()
        onCancelComposer()
        return
      }

      if (isTyping) {
        target.blur()
      }

      return
    }

    if (composerMode !== 'view' && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      onSaveComposer()
      return
    }

    if (isTyping) {
      const isCopyShortcut =
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'c' &&
        composerMode === 'view' &&
        !window.getSelection()?.toString()

      if (!isCopyShortcut) {
        return
      }

      const commandId = getPromptLibraryKeyboardCommandId({
        key: event.key.toLowerCase(),
        isCopyShortcut: true,
      })

      if (commandId && canRunPromptLibraryCommand(commandId, commandState)) {
        event.preventDefault()
        onRunCommand(commandId)
      }

      return
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
      const selectedText = window.getSelection()?.toString()

      if (selectedText || !visibleState.activePrompt) {
        return
      }

      event.preventDefault()
      const commandId = getPromptLibraryKeyboardCommandId({
        key: event.key.toLowerCase(),
        isCopyShortcut: true,
      })

      if (commandId && canRunPromptLibraryCommand(commandId, commandState)) {
        onRunCommand(commandId)
      }

      return
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return
    }

    if (event.key === '?') {
      event.preventDefault()
      onToggleHelp()
      return
    }

    const commandId = getPromptLibraryKeyboardCommandId({
      key: event.key.toLowerCase(),
      isCopyShortcut: false,
    })

    if (commandId && canRunPromptLibraryCommand(commandId, commandState)) {
      event.preventDefault()
      onRunCommand(commandId)
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onKeyDown])
}
