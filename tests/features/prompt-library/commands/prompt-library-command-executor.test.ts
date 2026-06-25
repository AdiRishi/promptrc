import { describe, expect, it, vi } from 'vitest'

import { createPromptLibraryCommandExecutor } from '@/features/prompt-library/commands/prompt-library-command-executor'
import { createPromptLibraryStore } from '@/features/prompt-library/store/prompt-library-store'
import { type PromptLibraryClient } from '@/features/prompt-library/sync/prompt-library-client'
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
  canSharePrompts: false,
  mode: 'local',
  acceptFirstSignInCopy: () => Promise.resolve(),
  createPromptShare: () =>
    Promise.resolve({
      status: 'failed',
      message: 'Sign in to share prompts',
      error: new Error('Sign in to share prompts'),
    }),
  deletePrompt: () => Promise.resolve({ status: 'synced', value: undefined }),
  declineFirstSignInCopy: () => Promise.resolve(),
  getPromptShare: () => Promise.resolve({ status: 'synced', value: null }),
  recordPromptUse: () => Promise.resolve({ status: 'synced', value: null }),
  reportError: (error) => (error instanceof Error ? error.message : 'sync failed'),
  revokePromptShare: () =>
    Promise.resolve({
      status: 'synced',
      value: {
        promptId: 'prompt-alpha',
        revoked: false,
      },
    }),
  savePrompt: (prompt) => Promise.resolve({ status: 'synced', value: prompt }),
  sync: () => Promise.resolve(),
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
    const recordPromptUse = vi.fn(() =>
      Promise.resolve({
        status: 'synced' as const,
        value: { ...prompt, uses: 1 },
      }),
    )

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

  it('creates, copies, and revokes public share links for the active Prompt', async () => {
    const prompt = createPrompt()
    const store = createPromptLibraryStore()
    const clipboard = { writeText: vi.fn(() => Promise.resolve()) }
    const notify = vi.fn()
    const createPromptShare = vi.fn(() =>
      Promise.resolve({
        status: 'synced' as const,
        value: {
          id: 'share-alpha',
          promptId: prompt.id,
          createdAt: '2026-04-24T00:01:00.000Z',
          revokedAt: null,
        },
      }),
    )
    const revokePromptShare = vi.fn(() =>
      Promise.resolve({
        status: 'synced' as const,
        value: {
          promptId: prompt.id,
          revoked: true,
        },
      }),
    )

    store.getState().actions.replacePrompts([prompt], { isFresh: false })
    store.getState().actions.selectPrompt(prompt.id)

    const commands = createPromptLibraryCommandExecutor({
      clipboard,
      getShareUrl: (shareId) => `https://promptrc.app/share/${shareId}`,
      library: createLibrary({
        canSharePrompts: true,
        mode: 'remote',
        createPromptShare,
        revokePromptShare,
      }),
      notify,
      store,
    })

    await expect(commands.shareActivePrompt()).resolves.toMatchObject({
      id: 'share-alpha',
      promptId: prompt.id,
    })
    await expect(commands.revokeActivePromptShare()).resolves.toEqual({
      promptId: prompt.id,
      revoked: true,
    })

    expect(createPromptShare).toHaveBeenCalledWith(prompt.id)
    expect(clipboard.writeText).toHaveBeenCalledWith('https://promptrc.app/share/share-alpha')
    expect(notify).toHaveBeenCalledWith('share link copied -> Alpha')
    expect(revokePromptShare).toHaveBeenCalledWith(prompt.id)
    expect(notify).toHaveBeenCalledWith('share link revoked -> Alpha')
  })

  it('saves a new Prompt through the Prompt Library client', async () => {
    const store = createPromptLibraryStore()
    const notify = vi.fn()
    const savePrompt = vi.fn((savedPrompt: PromptRecord) =>
      Promise.resolve({ status: 'synced' as const, value: savedPrompt }),
    )

    store.getState().actions.startNew()
    store.getState().actions.updateDraft('title', 'Owned Prompt')
    store.getState().actions.updateDraft('body', 'Keep this close.')

    const commands = createPromptLibraryCommandExecutor({
      clipboard: { writeText: () => Promise.resolve() },
      library: createLibrary({ savePrompt }),
      notify,
      store,
    })

    commands.saveComposer()
    await flushPromises()

    expect(savePrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Owned Prompt',
        body: 'Keep this close.',
      }),
    )
    expect(store.getState().isFresh).toBe(false)
    expect(notify).toHaveBeenCalledWith('wrote owned_prompt.md')
  })

  it('guards editing commands and focuses invalid composer input', () => {
    const prompts = [
      createPrompt({ id: 'prompt-alpha', title: 'Alpha' }),
      createPrompt({ id: 'prompt-beta', title: 'Beta' }),
    ]
    const store = createPromptLibraryStore()
    const notify = vi.fn()
    const focusTitleInput = vi.fn()

    store.getState().actions.replacePrompts(prompts, { isFresh: false })
    store.getState().actions.selectPrompt('prompt-alpha')

    const commands = createPromptLibraryCommandExecutor({
      clipboard: { writeText: () => Promise.resolve() },
      focusTitleInput,
      library: createLibrary(),
      notify,
      store,
    })

    store.getState().actions.startEdit('prompt-alpha')
    commands.selectPrompt('prompt-beta')
    expect(store.getState().selectedPromptId).toBe('prompt-alpha')
    expect(notify).toHaveBeenCalledWith('press esc to finish editing first')

    store.getState().actions.startNew()
    commands.saveComposer()
    expect(focusTitleInput).toHaveBeenCalledOnce()
    expect(notify).toHaveBeenCalledWith('title and body required')
  })

  it('edits and duplicates the active Prompt through the Prompt Library client', async () => {
    const prompt = createPrompt()
    const store = createPromptLibraryStore()
    const notify = vi.fn()
    const savePrompt = vi.fn((savedPrompt: PromptRecord) =>
      Promise.resolve({ status: 'synced' as const, value: savedPrompt }),
    )

    store.getState().actions.replacePrompts([prompt], { isFresh: false })
    store.getState().actions.selectPrompt(prompt.id)

    const commands = createPromptLibraryCommandExecutor({
      clipboard: { writeText: () => Promise.resolve() },
      library: createLibrary({ savePrompt }),
      notify,
      store,
    })

    commands.startEditActivePrompt()
    store.getState().actions.updateDraft('title', 'Updated Alpha')
    commands.saveComposer()
    await flushPromises()

    expect(savePrompt).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated Alpha' }))
    expect(notify).toHaveBeenCalledWith('saved updated_alpha.md')

    commands.duplicatePrompt()
    await flushPromises()

    expect(savePrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Updated Alpha (copy)',
        uses: 0,
      }),
    )
    expect(notify).toHaveBeenCalledWith('duplicated -> Updated Alpha (copy)')
  })

  it('deletes the active Prompt and keeps selection valid', async () => {
    const prompts = [
      createPrompt({ id: 'prompt-alpha', title: 'Alpha' }),
      createPrompt({ id: 'prompt-beta', title: 'Beta' }),
      createPrompt({ id: 'prompt-gamma', title: 'Gamma' }),
    ]
    const store = createPromptLibraryStore()
    const notify = vi.fn()
    const deletePrompt = vi.fn(() =>
      Promise.resolve({ status: 'synced' as const, value: undefined }),
    )

    store.getState().actions.replacePrompts(prompts, { isFresh: false })
    store.getState().actions.selectPrompt('prompt-beta')

    const commands = createPromptLibraryCommandExecutor({
      clipboard: { writeText: () => Promise.resolve() },
      library: createLibrary({ deletePrompt }),
      notify,
      store,
    })

    commands.deletePrompt()
    commands.deletePrompt()
    await flushPromises()

    expect(deletePrompt).toHaveBeenCalledWith('prompt-beta')
    expect(store.getState().selectedPromptId).toBe('prompt-gamma')
    expect(store.getState().prompts.map((prompt) => prompt.id)).toEqual([
      'prompt-alpha',
      'prompt-gamma',
    ])
  })

  it('reports clipboard and remote delete failures without hiding local state', async () => {
    const prompt = createPrompt()
    const store = createPromptLibraryStore()
    const notify = vi.fn()
    const deletePrompt = vi.fn(() =>
      Promise.resolve({
        status: 'failed' as const,
        message: 'D1 unavailable',
        error: new Error('D1 unavailable'),
      }),
    )

    store.getState().actions.replacePrompts([prompt], { isFresh: false })
    store.getState().actions.selectPrompt(prompt.id)

    const commands = createPromptLibraryCommandExecutor({
      clipboard: { writeText: vi.fn(() => Promise.reject(new Error('blocked'))) },
      library: createLibrary({ deletePrompt }),
      notify,
      store,
    })

    await commands.copyActivePrompt()
    expect(notify).toHaveBeenCalledWith('clipboard access is unavailable')
    expect(store.getState().prompts[0]?.uses).toBe(0)

    commands.deletePrompt()
    commands.deletePrompt()
    await flushPromises()

    expect(store.getState().prompts).toEqual([])
    expect(notify).toHaveBeenCalledWith('sync failed - D1 unavailable')
  })

  it('keeps optimistic Prompt changes visible when remote sync fails', async () => {
    const store = createPromptLibraryStore()
    const notify = vi.fn()
    const savePrompt = vi.fn(() =>
      Promise.resolve({
        status: 'failed' as const,
        message: 'D1 unavailable',
        error: new Error('D1 unavailable'),
      }),
    )

    store.getState().actions.startNew()
    store.getState().actions.updateDraft('title', 'Owned Prompt')
    store.getState().actions.updateDraft('body', 'Keep this close.')

    const commands = createPromptLibraryCommandExecutor({
      clipboard: { writeText: () => Promise.resolve() },
      library: createLibrary({ savePrompt }),
      notify,
      store,
    })

    commands.saveComposer()
    await flushPromises()

    expect(savePrompt).toHaveBeenCalledOnce()
    expect(store.getState().prompts[0]?.title).toBe('Owned Prompt')
    expect(notify).toHaveBeenCalledWith('sync failed - D1 unavailable')
  })
})
