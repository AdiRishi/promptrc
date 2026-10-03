import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type PromptLibraryCommandId } from '@/features/prompt-library/commands/prompt-library-command-surface'
import { usePromptLibraryHotkeys } from '@/features/prompt-library/hooks/use-prompt-library-hotkeys'
import { type ComposerMode } from '@/features/prompt-library/types'

type HotkeyHarnessProps = {
  composerMode?: ComposerMode
  isOverlayOpen?: boolean
  onRunCommand?: (commandId: PromptLibraryCommandId) => void
  onTogglePalette?: () => void
  onSaveComposer?: () => void
  onCancelComposer?: () => void
}

function HotkeyHarness({
  composerMode = 'view',
  isOverlayOpen = false,
  onRunCommand = vi.fn(),
  onTogglePalette = vi.fn(),
  onSaveComposer = vi.fn(),
  onCancelComposer = vi.fn(),
}: HotkeyHarnessProps) {
  usePromptLibraryHotkeys({
    commandState: {
      canSharePrompts: true,
      composerMode,
      hasActivePrompt: true,
    },
    composerMode,
    isOverlayOpen,
    isHelpOpen: false,
    onCancelComposer,
    onRunCommand,
    onSaveComposer,
    onToggleHelp: vi.fn(),
    onTogglePalette,
  })

  return (
    <>
      <input aria-label="Filter entries" defaultValue="selected words" />
      <ol data-prompt-list>
        <li>
          <button type="button">Entry</button>
        </li>
      </ol>
      <div tabIndex={-1}>Reader</div>
    </>
  )
}

const keydown = (target: EventTarget, init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })

  target.dispatchEvent(event)

  return event
}

afterEach(() => {
  cleanup()
  window.getSelection()?.removeAllRanges()
})

describe('usePromptLibraryHotkeys', () => {
  it('lets single-letter shortcuts type inside inputs', () => {
    const onRunCommand = vi.fn()
    render(<HotkeyHarness onRunCommand={onRunCommand} />)

    const event = keydown(screen.getByLabelText('Filter entries'), { key: 'n' })

    expect(event.defaultPrevented).toBe(false)
    expect(onRunCommand).not.toHaveBeenCalled()
  })

  it('copies the Prompt Body from inside an input when no text is selected', () => {
    const onRunCommand = vi.fn()
    render(<HotkeyHarness onRunCommand={onRunCommand} />)

    const input = screen.getByLabelText<HTMLInputElement>('Filter entries')
    input.setSelectionRange(0, 0)

    const event = keydown(input, { key: 'c', metaKey: true })

    expect(event.defaultPrevented).toBe(true)
    expect(onRunCommand).toHaveBeenCalledWith('copy-prompt-body')
  })

  it('leaves ⌘C alone when text inside an input is selected', () => {
    const onRunCommand = vi.fn()
    render(<HotkeyHarness onRunCommand={onRunCommand} />)

    const input = screen.getByLabelText<HTMLInputElement>('Filter entries')
    input.setSelectionRange(0, 8)

    const event = keydown(input, { key: 'c', ctrlKey: true })

    expect(event.defaultPrevented).toBe(false)
    expect(onRunCommand).not.toHaveBeenCalled()
  })

  it('runs letter commands outside text inputs, including capture and pin', () => {
    const onRunCommand = vi.fn()
    render(<HotkeyHarness onRunCommand={onRunCommand} />)

    expect(keydown(window, { key: 's' }).defaultPrevented).toBe(true)
    keydown(window, { key: 'c' })
    keydown(window, { key: 'p' })

    expect(onRunCommand.mock.calls.map(([commandId]) => commandId)).toEqual([
      'share-prompt',
      'capture',
      'toggle-pin',
    ])
  })

  it('opens the command palette with ⌘K even while typing', () => {
    const onTogglePalette = vi.fn()
    render(<HotkeyHarness onTogglePalette={onTogglePalette} />)

    const event = keydown(screen.getByLabelText('Filter entries'), { key: 'k', metaKey: true })

    expect(event.defaultPrevented).toBe(true)
    expect(onTogglePalette).toHaveBeenCalledOnce()
  })

  it('ignores library shortcuts while an overlay owns the keyboard', () => {
    const onRunCommand = vi.fn()
    render(<HotkeyHarness isOverlayOpen onRunCommand={onRunCommand} />)

    keydown(window, { key: 'x' })
    keydown(window, { key: 'c', metaKey: true })

    expect(onRunCommand).not.toHaveBeenCalled()
  })

  it('moves with the arrow keys from the list but lets them scroll elsewhere', () => {
    const onRunCommand = vi.fn()
    render(<HotkeyHarness onRunCommand={onRunCommand} />)

    const fromList = keydown(screen.getByRole('button', { name: 'Entry' }), { key: 'ArrowDown' })
    const fromReader = keydown(screen.getByText('Reader'), { key: 'ArrowDown' })

    expect(fromList.defaultPrevented).toBe(true)
    expect(fromReader.defaultPrevented).toBe(false)
    expect(onRunCommand).toHaveBeenCalledExactlyOnceWith('next-prompt')
  })

  it('saves with ⌘Enter and cancels with Esc while composing', () => {
    const onSaveComposer = vi.fn()
    const onCancelComposer = vi.fn()
    const onRunCommand = vi.fn()
    render(
      <HotkeyHarness
        composerMode="edit"
        onCancelComposer={onCancelComposer}
        onRunCommand={onRunCommand}
        onSaveComposer={onSaveComposer}
      />,
    )

    keydown(screen.getByLabelText('Filter entries'), { key: 'Enter', metaKey: true })
    keydown(window, { key: 'Escape' })
    keydown(window, { key: 'x' })

    expect(onSaveComposer).toHaveBeenCalledOnce()
    expect(onCancelComposer).toHaveBeenCalledOnce()
    expect(onRunCommand).not.toHaveBeenCalled()
  })
})
