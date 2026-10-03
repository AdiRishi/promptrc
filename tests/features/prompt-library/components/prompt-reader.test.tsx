import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PromptReader } from '@/features/prompt-library/components/prompt-reader'
import { joinSequenceSteps } from '@/features/prompt-library/model/prompt-sequences'
import { type PromptRecord } from '@/features/prompt-library/types'

const createPrompt = (overrides: Partial<PromptRecord> = {}): PromptRecord => ({
  id: 'prompt-alpha',
  kind: 'prompt',
  title: 'Alpha',
  body: 'Review {{file}} for {{focus | correctness}}. Keep `{{literal}}` as is.',
  notes: 'Works because it names the focus.',
  category: 'Engineering',
  tags: ['review'],
  images: [],
  runs: [],
  pinned: false,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
  ...overrides,
})

const renderReader = (prompt: PromptRecord, overrides: Record<string, unknown> = {}) => {
  const handlers = {
    onCopy: vi.fn(),
    onEdit: vi.fn(),
    onTogglePin: vi.fn(),
    onDuplicate: vi.fn(),
    onShare: vi.fn(),
    onRevokeShare: vi.fn(),
    onDelete: vi.fn(),
    onLogRun: vi.fn(() => true),
    onRemoveRun: vi.fn(),
    onVariableChange: vi.fn(),
    onResetVariables: vi.fn(),
    onSelectTag: vi.fn(),
    onSelectCategory: vi.fn(),
  }

  render(
    <PromptReader
      canSharePrompts={false}
      catalogNumber={7}
      hasActivePromptShare={false}
      isConfirmingDelete={false}
      knownModels={['claude-opus-5-5']}
      prompt={prompt}
      variableValues={{}}
      {...handlers}
      {...overrides}
    />,
  )

  return handlers
}

afterEach(() => {
  cleanup()
})

describe('PromptReader', () => {
  it('renders fill-in blanks for variables in prose but not in code', () => {
    const handlers = renderReader(createPrompt())

    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeTruthy()
    expect(screen.getByText(/0 of 2 blanks filled/)).toBeTruthy()
    expect(document.querySelector('[data-prompt-variable="literal"]')).toBeNull()
    expect(screen.getByText('{{literal}}')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('file'), { target: { value: 'store.ts' } })

    expect(handlers.onVariableChange).toHaveBeenCalledWith('file', 'store.ts')
    expect(screen.getByLabelText('focus (defaults to correctness)')).toBeTruthy()
    expect(screen.getByText('Works because it names the focus.')).toBeTruthy()
    expect(screen.getAllByText('№ 007').length).toBeGreaterThan(0)
  })

  it('copies a sequence one step at a time', () => {
    const handlers = renderReader(
      createPrompt({
        kind: 'sequence',
        body: joinSequenceSteps(['Plan it.', 'Critique it.', 'Build it.']),
      }),
    )

    expect(screen.getByText('Step 2 of 3')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Copy step 2' }))

    expect(handlers.onCopy).toHaveBeenCalledWith({ stepIndex: 1 })
  })

  it('logs benchmark runs with the chosen verdict', () => {
    const handlers = renderReader(
      createPrompt({
        kind: 'benchmark',
        body: 'Summarise this.',
        notes: 'Pass when the decision leads.',
        runs: [
          {
            id: 'run-1',
            model: 'claude-opus-5-5',
            verdict: 'pass',
            note: '',
            ranAt: '2026-04-25T00:00:00.000Z',
          },
        ],
      }),
    )

    expect(screen.getByText('Pass when the decision leads.')).toBeTruthy()
    expect(screen.getByText('100%')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Fail'))
    fireEvent.change(screen.getByPlaceholderText(/What happened/), {
      target: { value: 'Buried the decision' },
    })
    fireEvent.submit(screen.getByRole('form', { name: 'Log a run' }))

    expect(handlers.onLogRun).toHaveBeenCalledWith({
      model: 'claude-opus-5-5',
      verdict: 'fail',
      note: 'Buried the decision',
    })
  })

  it('asks for a second press before deleting', () => {
    renderReader(createPrompt(), { isConfirmingDelete: true })

    expect(screen.getByRole('button', { name: 'Press again to delete' })).toBeTruthy()
  })
})
