import { describe, expect, it } from 'vitest'

import {
  PROMPT_LIBRARY_HELP_GROUPS,
  PROMPT_LIBRARY_SHORTCUT_COMMAND_IDS,
  canRunPromptLibraryCommand,
  getPromptLibraryCommand,
} from '@/features/prompt-library/commands/prompt-library-command-surface'

describe('prompt library command surface', () => {
  it('uses the same command metadata for shortcuts and help rows', () => {
    const helpCommandIds = PROMPT_LIBRARY_HELP_GROUPS.flatMap((group) =>
      'commandIds' in group ? [...group.commandIds] : [],
    )

    expect(helpCommandIds).toEqual(expect.arrayContaining([...PROMPT_LIBRARY_SHORTCUT_COMMAND_IDS]))
    expect(getPromptLibraryCommand('copy-prompt-body')).toMatchObject({
      keys: ['Cmd', 'C'],
      label: 'copy Prompt Body',
    })
  })

  it('blocks Prompt commands while composing or without a visible Prompt', () => {
    expect(
      canRunPromptLibraryCommand('delete-prompt', {
        canSharePrompts: true,
        composerMode: 'edit',
        hasActivePrompt: true,
      }),
    ).toBe(false)
    expect(
      canRunPromptLibraryCommand('copy-prompt-body', {
        canSharePrompts: true,
        composerMode: 'view',
        hasActivePrompt: false,
      }),
    ).toBe(false)
    expect(
      canRunPromptLibraryCommand('new-prompt', {
        canSharePrompts: false,
        composerMode: 'view',
        hasActivePrompt: false,
      }),
    ).toBe(true)
    expect(
      canRunPromptLibraryCommand('share-prompt', {
        canSharePrompts: false,
        composerMode: 'view',
        hasActivePrompt: true,
      }),
    ).toBe(false)
    expect(
      canRunPromptLibraryCommand('share-prompt', {
        canSharePrompts: true,
        composerMode: 'view',
        hasActivePrompt: true,
      }),
    ).toBe(true)
  })
})
