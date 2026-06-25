import { describe, expect, it } from 'vitest'

import {
  type PromptLibraryCommandRouter,
  getPromptLibraryKeyboardCommandId,
  runPromptLibraryCommand,
} from '@/features/prompt-library/commands/prompt-library-command-router'

const createRouter = (overrides: Partial<PromptLibraryCommandRouter> = {}) => {
  const events: string[] = []
  const router: PromptLibraryCommandRouter = {
    commandState: {
      canSharePrompts: true,
      composerMode: 'view',
      hasActivePrompt: true,
    },
    copyActivePrompt: () => {
      events.push('copy-active-prompt')
    },
    deletePrompt: () => {
      events.push('delete-prompt')
    },
    duplicatePrompt: () => {
      events.push('duplicate-prompt')
    },
    focusSearch: () => {
      events.push('focus-search')
    },
    selectNextPrompt: () => {
      events.push('select-next-prompt')
    },
    selectPreviousPrompt: () => {
      events.push('select-previous-prompt')
    },
    shareActivePrompt: () => {
      events.push('share-active-prompt')
    },
    startEditActivePrompt: () => {
      events.push('start-edit-active-prompt')
    },
    startNewPrompt: () => {
      events.push('start-new-prompt')
    },
    ...overrides,
  }

  return { events, router }
}

describe('prompt library command router', () => {
  it.each([
    ['n', false, 'new-prompt'],
    ['/', false, 'focus-search'],
    ['j', false, 'next-prompt'],
    ['k', false, 'previous-prompt'],
    ['e', false, 'edit-prompt'],
    ['d', false, 'duplicate-prompt'],
    ['s', false, 'share-prompt'],
    ['x', false, 'delete-prompt'],
    ['c', true, 'copy-prompt-body'],
  ] as const)('maps keyboard intent %s to %s', (key, isCopyShortcut, commandId) => {
    expect(getPromptLibraryKeyboardCommandId({ key, isCopyShortcut })).toBe(commandId)
  })

  it('ignores keys that are not Prompt Library commands', () => {
    expect(getPromptLibraryKeyboardCommandId({ key: '?', isCopyShortcut: false })).toBeNull()
  })

  it('runs command ids through one dispatch interface', () => {
    const { events, router } = createRouter()

    expect(runPromptLibraryCommand('new-prompt', router)).toBe(true)
    expect(runPromptLibraryCommand('next-prompt', router)).toBe(true)
    expect(runPromptLibraryCommand('share-prompt', router)).toBe(true)
    expect(runPromptLibraryCommand('copy-prompt-body', router)).toBe(true)

    expect(events).toEqual([
      'start-new-prompt',
      'select-next-prompt',
      'share-active-prompt',
      'copy-active-prompt',
    ])
  })

  it('does not run unavailable command ids', () => {
    const { events, router } = createRouter({
      commandState: {
        canSharePrompts: true,
        composerMode: 'new',
        hasActivePrompt: true,
      },
    })

    expect(runPromptLibraryCommand('delete-prompt', router)).toBe(false)
    expect(events).toEqual([])
  })

  it('only runs prompt-independent commands without an active Prompt', () => {
    const { events, router } = createRouter({
      commandState: {
        canSharePrompts: true,
        composerMode: 'view',
        hasActivePrompt: false,
      },
    })

    expect(runPromptLibraryCommand('focus-search', router)).toBe(true)
    expect(runPromptLibraryCommand('new-prompt', router)).toBe(true)
    expect(runPromptLibraryCommand('copy-prompt-body', router)).toBe(false)
    expect(runPromptLibraryCommand('next-prompt', router)).toBe(false)
    expect(runPromptLibraryCommand('share-prompt', router)).toBe(false)

    expect(events).toEqual(['focus-search', 'start-new-prompt'])
  })

  it('does not run cloud-only commands without share support', () => {
    const { events, router } = createRouter({
      commandState: {
        canSharePrompts: false,
        composerMode: 'view',
        hasActivePrompt: true,
      },
    })

    expect(runPromptLibraryCommand('share-prompt', router)).toBe(false)
    expect(events).toEqual([])
  })
})
