import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PromptViewer } from '@/features/prompt-library/components/prompt-viewer'
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

type RenderPromptViewerOptions = {
  canSharePrompts?: boolean
  hasActivePromptShare?: boolean
}

const renderPromptViewer = ({
  canSharePrompts = true,
  hasActivePromptShare = false,
}: RenderPromptViewerOptions = {}) =>
  render(
    <PromptViewer
      canSharePrompts={canSharePrompts}
      confirmDeleteId={null}
      hasActivePromptShare={hasActivePromptShare}
      prompt={prompt}
      onCopyPrompt={vi.fn()}
      onDeletePrompt={vi.fn()}
      onDuplicatePrompt={vi.fn()}
      onRevokePromptShare={vi.fn()}
      onSharePrompt={vi.fn()}
      onStartEdit={vi.fn()}
    />,
  )

afterEach(() => {
  cleanup()
})

describe('PromptViewer', () => {
  it('only shows the revoke share link action when the active prompt has a share', () => {
    const { rerender } = renderPromptViewer()

    expect(screen.getByRole('button', { name: /share link/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /revoke link/i })).toBeNull()

    rerender(
      <PromptViewer
        canSharePrompts
        confirmDeleteId={null}
        hasActivePromptShare
        prompt={prompt}
        onCopyPrompt={vi.fn()}
        onDeletePrompt={vi.fn()}
        onDuplicatePrompt={vi.fn()}
        onRevokePromptShare={vi.fn()}
        onSharePrompt={vi.fn()}
        onStartEdit={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /revoke link/i })).toBeTruthy()
  })

  it('does not show share actions when prompt sharing is unavailable', () => {
    renderPromptViewer({ canSharePrompts: false, hasActivePromptShare: true })

    expect(screen.queryByRole('button', { name: /share link/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /revoke link/i })).toBeNull()
  })
})
