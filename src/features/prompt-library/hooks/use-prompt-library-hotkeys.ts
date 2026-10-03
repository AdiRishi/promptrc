import { useEffect, useEffectEvent } from 'react'

import { getPromptLibraryKeyboardCommandId } from '@/features/prompt-library/commands/prompt-library-command-router'
import {
  type PromptLibraryCommandId,
  type PromptLibraryCommandState,
  canRunPromptLibraryCommand,
} from '@/features/prompt-library/commands/prompt-library-command-surface'
import { type ComposerMode } from '@/features/prompt-library/types'

type UsePromptLibraryHotkeysOptions = {
  commandState: PromptLibraryCommandState
  composerMode: ComposerMode
  /** A dialog (palette, capture, keys) owns the keyboard while it is open. */
  isOverlayOpen: boolean
  isHelpOpen: boolean
  onSaveComposer: () => void
  onCancelComposer: () => void
  onRunCommand: (commandId: PromptLibraryCommandId) => void
  onToggleHelp: () => void
  onTogglePalette: () => void
}

const isTypingTarget = (target: EventTarget | null): target is HTMLElement => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

/** True when the user has text selected — then ⌘C must copy that, not the Prompt. */
const hasTextSelection = (target: EventTarget | null) => {
  if (
    (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) &&
    target.selectionStart !== null &&
    target.selectionStart !== target.selectionEnd
  ) {
    return true
  }

  return Boolean(window.getSelection()?.toString())
}

const isListNavigationTarget = (target: EventTarget | null) => {
  return (
    target === document.body ||
    (target instanceof HTMLElement && Boolean(target.closest('[data-prompt-list]')))
  )
}

export function usePromptLibraryHotkeys({
  commandState,
  composerMode,
  isOverlayOpen,
  isHelpOpen,
  onSaveComposer,
  onCancelComposer,
  onRunCommand,
  onToggleHelp,
  onTogglePalette,
}: UsePromptLibraryHotkeysOptions) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) {
      return
    }

    const isMod = event.metaKey || event.ctrlKey
    const key = event.key.toLowerCase()

    if (isMod && key === 'k' && !event.altKey && !event.shiftKey) {
      event.preventDefault()
      onTogglePalette()
      return
    }

    if (isHelpOpen && event.key === '?') {
      event.preventDefault()
      onToggleHelp()
      return
    }

    if (isOverlayOpen) {
      return
    }

    const target = event.target
    const isTyping = isTypingTarget(target)

    if (composerMode !== 'view') {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancelComposer()
      } else if (isMod && event.key === 'Enter') {
        event.preventDefault()
        onSaveComposer()
      }

      return
    }

    if (event.key === 'Escape') {
      if (isTyping) {
        target.blur()
      }

      return
    }

    if (isMod && key === 'c' && !event.altKey && !event.shiftKey) {
      if (hasTextSelection(target)) {
        return
      }

      const commandId = getPromptLibraryKeyboardCommandId({ key, isCopyShortcut: true })

      if (commandId && canRunPromptLibraryCommand(commandId, commandState)) {
        event.preventDefault()
        onRunCommand(commandId)
      }

      return
    }

    if (isTyping || isMod || event.altKey) {
      return
    }

    if (event.key === '?') {
      event.preventDefault()
      onToggleHelp()
      return
    }

    const isArrow = event.key === 'ArrowDown' || event.key === 'ArrowUp'

    // Arrows move the selection only from the list (or nowhere in particular);
    // elsewhere they keep scrolling the page as usual.
    if (isArrow && !isListNavigationTarget(target)) {
      return
    }

    const commandId = isArrow
      ? event.key === 'ArrowDown'
        ? 'next-prompt'
        : 'previous-prompt'
      : getPromptLibraryKeyboardCommandId({ key, isCopyShortcut: false })

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
  }, [])
}
