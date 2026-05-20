import { describe, expect, it, vi } from 'vitest'

import {
  type PromptLibraryCommandRouter,
  getPromptLibraryKeyboardCommandId,
  runPromptLibraryCommand,
} from '@/features/prompt-library/commands/prompt-library-command-router'

const createRouter = (
  overrides: Partial<PromptLibraryCommandRouter> = {},
): PromptLibraryCommandRouter => ({
  commandState: {
    composerMode: 'view',
    hasActivePrompt: true,
  },
  copyActivePrompt: vi.fn(),
  deletePrompt: vi.fn(),
  duplicatePrompt: vi.fn(),
  focusSearch: vi.fn(),
  selectNextPrompt: vi.fn(),
  selectPreviousPrompt: vi.fn(),
  startEditActivePrompt: vi.fn(),
  startNewPrompt: vi.fn(),
  ...overrides,
})

describe('prompt library command router', () => {
  it('maps keyboard intent to command ids', () => {
    expect(getPromptLibraryKeyboardCommandId({ key: 'n', isCopyShortcut: false })).toBe(
      'new-prompt',
    )
    expect(getPromptLibraryKeyboardCommandId({ key: '/', isCopyShortcut: false })).toBe(
      'focus-search',
    )
    expect(getPromptLibraryKeyboardCommandId({ key: 'c', isCopyShortcut: true })).toBe(
      'copy-prompt-body',
    )
    expect(getPromptLibraryKeyboardCommandId({ key: '?', isCopyShortcut: false })).toBeNull()
  })

  it('runs command ids through one dispatch interface', () => {
    const router = createRouter()

    expect(runPromptLibraryCommand('new-prompt', router)).toBe(true)
    expect(runPromptLibraryCommand('next-prompt', router)).toBe(true)
    expect(runPromptLibraryCommand('copy-prompt-body', router)).toBe(true)

    expect(router.startNewPrompt).toHaveBeenCalledOnce()
    expect(router.selectNextPrompt).toHaveBeenCalledOnce()
    expect(router.copyActivePrompt).toHaveBeenCalledOnce()
  })

  it('does not run unavailable command ids', () => {
    const router = createRouter({
      commandState: {
        composerMode: 'new',
        hasActivePrompt: true,
      },
    })

    expect(runPromptLibraryCommand('delete-prompt', router)).toBe(false)
    expect(router.deletePrompt).not.toHaveBeenCalled()
  })
})
