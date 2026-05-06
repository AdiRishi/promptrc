import { describe, expect, it, vi } from 'vitest'

import { createPromptLibraryCommandExecutor } from '@/features/prompt-library/lib/prompt-library-command-executor'
import { type PromptLibraryClient } from '@/features/prompt-library/storage/prompt-library-client'
import { createPromptLibraryStore } from '@/features/prompt-library/store/prompt-library-store'
import { type PromptRecord } from '@/features/prompt-library/types'

const createPrompt = (overrides: Partial<PromptRecord> = {}): PromptRecord => ({
  id: 'prompt-alpha',
  title: 'Alpha',
  body: 'Write a concise test plan.',
  category: 'Engineering',
  tags: ['testing'],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
  ...overrides,
})

const createLibrary = (overrides: Partial<PromptLibraryClient> = {}): PromptLibraryClient => ({
  mode: 'local',
  acceptFirstSignInCopy: () => Promise.resolve(),
  addPrompt: (prompt) => Promise.resolve(prompt),
  declineFirstSignInCopy: () => Promise.resolve(),
  recordPromptUse: () => Promise.resolve(null),
  removePrompt: () => Promise.resolve(),
  reportError: (error) => (error instanceof Error ? error.message : 'sync failed'),
  sync: () => Promise.resolve(),
  updatePrompt: (prompt) => Promise.resolve(prompt),
  ...overrides,
})

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('prompt library command executor', () => {
  it('copies the active Prompt Body and records a Prompt Use', async () => {
    const prompt = createPrompt()
    const store = createPromptLibraryStore()
    const clipboard = { writeText: vi.fn(() => Promise.resolve()) }
    const notify = vi.fn()
    const recordPromptUse = vi.fn(() => Promise.resolve({ ...prompt, uses: 1 }))

    store.getState().actions.replacePrompts([prompt], { isFresh: false })
    store.getState().actions.selectPrompt(prompt.id)

    const commands = createPromptLibraryCommandExecutor({
      clipboard,
      library: createLibrary({ recordPromptUse }),
      notify,
      store,
    })

    await commands.copyActivePrompt()

    expect(clipboard.writeText).toHaveBeenCalledWith(prompt.body)
    expect(recordPromptUse).toHaveBeenCalledWith(prompt.id)
    expect(store.getState().prompts[0]?.uses).toBe(1)
    expect(notify).toHaveBeenCalledWith('copied -> Alpha')
  })

  it('saves a new Prompt through the Prompt Library client', async () => {
    const store = createPromptLibraryStore()
    const notify = vi.fn()
    const addPrompt = vi.fn((prompt: PromptRecord) => Promise.resolve(prompt))

    store.getState().actions.startNew()
    store.getState().actions.updateDraft('title', 'Owned Prompt')
    store.getState().actions.updateDraft('body', 'Keep this close.')

    const commands = createPromptLibraryCommandExecutor({
      clipboard: { writeText: () => Promise.resolve() },
      library: createLibrary({ addPrompt }),
      notify,
      store,
    })

    commands.saveComposer()
    await flushPromises()

    expect(addPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Owned Prompt',
        body: 'Keep this close.',
      }),
    )
    expect(store.getState().isFresh).toBe(false)
    expect(notify).toHaveBeenCalledWith('wrote owned_prompt.md')
  })

  it('deletes the active Prompt and keeps selection valid', async () => {
    const prompts = [
      createPrompt({ id: 'prompt-alpha', title: 'Alpha' }),
      createPrompt({ id: 'prompt-beta', title: 'Beta' }),
      createPrompt({ id: 'prompt-gamma', title: 'Gamma' }),
    ]
    const store = createPromptLibraryStore()
    const notify = vi.fn()
    const removePrompt = vi.fn(() => Promise.resolve())

    store.getState().actions.replacePrompts(prompts, { isFresh: false })
    store.getState().actions.selectPrompt('prompt-beta')

    const commands = createPromptLibraryCommandExecutor({
      clipboard: { writeText: () => Promise.resolve() },
      library: createLibrary({ removePrompt }),
      notify,
      store,
    })

    commands.deletePrompt()
    commands.deletePrompt()
    await flushPromises()

    expect(removePrompt).toHaveBeenCalledWith('prompt-beta')
    expect(store.getState().selectedPromptId).toBe('prompt-gamma')
    expect(store.getState().prompts.map((prompt) => prompt.id)).toEqual([
      'prompt-alpha',
      'prompt-gamma',
    ])
  })
})
