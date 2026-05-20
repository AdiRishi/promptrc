import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type PromptLibraryCommandId } from '@/features/prompt-library/commands/prompt-library-command-surface'
import { usePromptLibraryHotkeys } from '@/features/prompt-library/hooks/use-prompt-library-hotkeys'
import { type PromptLibraryVisibleState } from '@/features/prompt-library/selectors/prompt-library-selectors'
import { type PromptRecord } from '@/features/prompt-library/types'

const prompt: PromptRecord = {
  id: 'prompt-alpha',
  title: 'Alpha',
  body: 'Write a concise test plan.',
  category: 'Engineering',
  tags: ['testing'],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
}

const visibleState: PromptLibraryVisibleState = {
  activePrompt: prompt,
  categories: ['Engineering'],
  categoryKeys: ['Engineering'],
  emptyReason: null,
  filteredPrompts: [prompt],
  groupedPrompts: {
    Engineering: [prompt],
  },
  orderedPromptIds: [prompt.id],
  visiblePromptId: prompt.id,
  getNearestPromptIdAfterRemoval: () => null,
  getNextPromptId: () => prompt.id,
  getPreviousPromptId: () => prompt.id,
}

type HotkeyHarnessProps = {
  onRunCommand: (commandId: PromptLibraryCommandId) => void
}

function HotkeyHarness({ onRunCommand }: HotkeyHarnessProps) {
  usePromptLibraryHotkeys({
    commandState: {
      composerMode: 'view',
      hasActivePrompt: true,
    },
    composerMode: 'view',
    isHelpOpen: false,
    visibleState,
    onCancelComposer: vi.fn(),
    onRunCommand,
    onSaveComposer: vi.fn(),
    onToggleHelp: vi.fn(),
  })

  return <input aria-label="Search Prompts" />
}

afterEach(() => {
  cleanup()
  window.getSelection()?.removeAllRanges()
})

describe('usePromptLibraryHotkeys', () => {
  it('lets regular Prompt Library shortcut keys type inside inputs', () => {
    const onRunCommand = vi.fn()
    render(<HotkeyHarness onRunCommand={onRunCommand} />)

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'n',
    })

    screen.getByLabelText('Search Prompts').dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(onRunCommand).not.toHaveBeenCalled()
  })

  it('still runs the copy Prompt Body shortcut inside inputs when no text is selected', () => {
    const onRunCommand = vi.fn()
    render(<HotkeyHarness onRunCommand={onRunCommand} />)

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'c',
      metaKey: true,
    })

    screen.getByLabelText('Search Prompts').dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(onRunCommand).toHaveBeenCalledWith('copy-prompt-body')
  })
})
