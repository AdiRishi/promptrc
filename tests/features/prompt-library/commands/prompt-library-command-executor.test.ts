import { describe, expect, it, vi } from 'vitest'

import { createPromptLibraryCommandExecutor } from '@/features/prompt-library/commands/prompt-library-command-executor'
import { createPendingPromptImageMarkdown } from '@/features/prompt-library/model/prompt-images'
import { joinSequenceSteps } from '@/features/prompt-library/model/prompt-sequences'
import { createPromptLibraryStore } from '@/features/prompt-library/store/prompt-library-store'
import { type PromptLibraryClient } from '@/features/prompt-library/sync/prompt-library-client'
import {
  type PromptRecord,
  type PromptRun,
  type PromptShareListingChange,
} from '@/features/prompt-library/types'

const createPrompt = (overrides: Partial<PromptRecord> = {}): PromptRecord => ({
  id: 'prompt-alpha',
  title: 'Alpha',
  body: 'Write a concise test plan.',
  category: 'Engineering',
  tags: ['testing'],
  kind: 'prompt',
  notes: '',
  runs: [],
  pinned: false,
  images: [],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
  ...overrides,
})

const createLibrary = (overrides: Partial<PromptLibraryClient> = {}): PromptLibraryClient => ({
  canSharePrompts: false,
  canUploadPromptImages: false,
  mode: 'local',
  acceptFirstSignInCopy: () => Promise.resolve(),
  createPromptShare: () =>
    Promise.resolve({
      status: 'failed',
      message: 'Sign in to share prompts',
      error: new Error('Sign in to share prompts'),
    }),
  deletePrompt: () => Promise.resolve({ status: 'synced', value: undefined }),
  deletePromptImage: () => Promise.resolve({ status: 'synced', value: undefined }),
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
  setPromptShareListed: () => Promise.resolve({ status: 'synced', value: null }),
  sync: () => Promise.resolve(),
  uploadPromptImage: () =>
    Promise.resolve({
      status: 'failed',
      message: 'Sign in to add images',
      error: new Error('Sign in to add images'),
    }),
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
    expect(notify).toHaveBeenCalledWith('Copied “Alpha”')
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
          listedAt: null,
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
    expect(notify).toHaveBeenCalledWith('Share link copied for “Alpha”')
    expect(revokePromptShare).toHaveBeenCalledWith(prompt.id)
    expect(notify).toHaveBeenCalledWith('Share link revoked for “Alpha”')
  })

  it('publishes the active Prompt through its share link, and unpublishes it', async () => {
    const prompt = createPrompt()
    const store = createPromptLibraryStore()
    const clipboard = { writeText: vi.fn(() => Promise.resolve()) }
    const notify = vi.fn()
    const share = {
      id: 'share-alpha',
      promptId: prompt.id,
      createdAt: '2026-04-24T00:01:00.000Z',
      revokedAt: null,
    }
    const setPromptShareListed = vi.fn((change: PromptShareListingChange) =>
      Promise.resolve({
        status: 'synced' as const,
        value: { ...share, listedAt: change.listed ? '2026-04-24T00:05:00.000Z' : null },
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
        createPromptShare: () =>
          Promise.resolve({ status: 'synced', value: { ...share, listedAt: null } }),
        setPromptShareListed,
      }),
      notify,
      store,
    })

    await expect(commands.publishActivePrompt()).resolves.toMatchObject({
      id: 'share-alpha',
      listedAt: '2026-04-24T00:05:00.000Z',
    })
    // It publishes the share it was just given, not whichever is active later.
    expect(setPromptShareListed).toHaveBeenLastCalledWith({
      promptId: prompt.id,
      listed: true,
      shareId: 'share-alpha',
    })
    expect(clipboard.writeText).toHaveBeenCalledWith('https://promptrc.app/share/share-alpha')
    expect(notify).toHaveBeenCalledWith(
      'Published “Alpha”. It is public and search engines can find it',
    )

    await expect(commands.unpublishActivePrompt()).resolves.toMatchObject({ listedAt: null })
    expect(setPromptShareListed).toHaveBeenLastCalledWith({ promptId: prompt.id, listed: false })
    expect(notify).toHaveBeenCalledWith('Unpublished “Alpha”. Its share link still works')
  })

  it('saves the entry as it reads before publishing, and stops if that save fails', async () => {
    const store = createPromptLibraryStore()
    const notify = vi.fn()
    const serverCopies: PromptRecord[] = []
    let serverAcceptsSaves = false
    const savePrompt = vi.fn((savedPrompt: PromptRecord) => {
      if (!serverAcceptsSaves) {
        return Promise.resolve({
          status: 'failed' as const,
          message: 'offline',
          error: new Error('offline'),
        })
      }

      serverCopies.push(savedPrompt)

      return Promise.resolve({ status: 'synced' as const, value: savedPrompt })
    })
    const createPromptShare = vi.fn((promptId: string) =>
      Promise.resolve({
        status: 'synced' as const,
        value: {
          id: 'share-alpha',
          promptId,
          createdAt: '2026-04-24T00:01:00.000Z',
          revokedAt: null,
          listedAt: null,
        },
      }),
    )
    const setPromptShareListed = vi.fn((change: PromptShareListingChange) => {
      // The server lists what it holds at this moment.
      expect(serverCopies.at(-1)?.body).toBe('The launch date is coming.')

      return Promise.resolve({
        status: 'synced' as const,
        value: {
          id: 'share-alpha',
          promptId: change.promptId,
          createdAt: '2026-04-24T00:01:00.000Z',
          revokedAt: null,
          listedAt: '2026-04-24T00:05:00.000Z',
        },
      })
    })
    const prompt = createPrompt({ body: 'Internal: the launch date is 3 March.' })

    store.getState().actions.replacePrompts([prompt], { isFresh: false })
    store.getState().actions.selectPrompt(prompt.id)

    const commands = createPromptLibraryCommandExecutor({
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
      library: createLibrary({
        canSharePrompts: true,
        mode: 'remote',
        createPromptShare,
        savePrompt,
        setPromptShareListed,
      }),
      notify,
      store,
    })

    // The owner edits the private text out and writes; the editor closes, but
    // the server never receives the edit.
    store.getState().actions.startEdit(prompt.id)
    store.getState().actions.updateDraft('body', 'The launch date is coming.')
    commands.saveComposer()
    await flushPromises()

    await expect(commands.publishActivePrompt()).resolves.toBeNull()
    expect(createPromptShare).not.toHaveBeenCalled()
    expect(setPromptShareListed).not.toHaveBeenCalled()
    expect(notify).toHaveBeenLastCalledWith('Couldn’t sync — offline')

    serverAcceptsSaves = true

    await expect(commands.publishActivePrompt()).resolves.toMatchObject({ id: 'share-alpha' })
    expect(setPromptShareListed).toHaveBeenCalledOnce()
  })

  it('refuses to publish while the entry has unsaved edits', async () => {
    const prompt = createPrompt({ body: 'Internal: the launch date is 3 March.' })
    const store = createPromptLibraryStore()
    const notify = vi.fn()
    const createPromptShare = vi.fn(() =>
      Promise.resolve({
        status: 'synced' as const,
        value: {
          id: 'share-alpha',
          promptId: prompt.id,
          createdAt: '2026-04-24T00:01:00.000Z',
          revokedAt: null,
          listedAt: null,
        },
      }),
    )
    const setPromptShareListed = vi.fn(() =>
      Promise.resolve({ status: 'synced' as const, value: null }),
    )

    store.getState().actions.replacePrompts([prompt], { isFresh: false })
    store.getState().actions.selectPrompt(prompt.id)
    store.getState().actions.startEdit(prompt.id)
    store.getState().actions.updateDraft('body', 'The launch date is coming.')

    const commands = createPromptLibraryCommandExecutor({
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
      library: createLibrary({
        canSharePrompts: true,
        mode: 'remote',
        createPromptShare,
        setPromptShareListed,
      }),
      notify,
      store,
    })

    await expect(commands.publishActivePrompt()).resolves.toBeNull()
    expect(createPromptShare).not.toHaveBeenCalled()
    expect(setPromptShareListed).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith(
      'E37: No write since last change (save with :w or discard with :q!)',
    )
  })

  it('does not publish from a library that cannot share', async () => {
    const prompt = createPrompt()
    const store = createPromptLibraryStore()
    const notify = vi.fn()
    const setPromptShareListed = vi.fn(() =>
      Promise.resolve({ status: 'synced' as const, value: null }),
    )

    store.getState().actions.replacePrompts([prompt], { isFresh: false })
    store.getState().actions.selectPrompt(prompt.id)

    const commands = createPromptLibraryCommandExecutor({
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
      library: createLibrary({ setPromptShareListed }),
      notify,
      store,
    })

    await expect(commands.publishActivePrompt()).resolves.toBeNull()
    expect(setPromptShareListed).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith('Sign in to publish prompts')
  })

  it('saves a new Prompt through the Prompt Library client', async () => {
    const store = createPromptLibraryStore()
    const notify = vi.fn()
    const deletePromptImage = vi.fn(() =>
      Promise.resolve({ status: 'synced' as const, value: undefined }),
    )
    const savePrompt = vi.fn((savedPrompt: PromptRecord) =>
      Promise.resolve({ status: 'synced' as const, value: savedPrompt }),
    )

    store.getState().actions.startNew()
    store.getState().actions.updateDraft('title', 'Owned Prompt')
    store.getState().actions.updateDraft('body', 'Keep this close.')
    store.getState().actions.updateDraft('images', [
      {
        id: 'image-discarded',
        fileName: 'discarded.png',
        contentType: 'image/png',
        size: 128,
        createdAt: '2026-04-24T00:02:00.000Z',
      },
    ])

    const commands = createPromptLibraryCommandExecutor({
      clipboard: { writeText: () => Promise.resolve() },
      library: createLibrary({ deletePromptImage, savePrompt }),
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
    expect(deletePromptImage).toHaveBeenCalledWith('image-discarded')
    expect(store.getState().isFresh).toBe(false)
    expect(notify).toHaveBeenCalledWith('Saved “Owned Prompt”')
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
    expect(notify).toHaveBeenCalledWith('Finish editing first — save or press Esc')

    store.getState().actions.startNew()
    commands.saveComposer()
    expect(focusTitleInput).toHaveBeenCalledOnce()
    expect(notify).toHaveBeenCalledWith('Give it a title and a body first')
  })

  it('blocks composer save while pasted images are still uploading', () => {
    const store = createPromptLibraryStore()
    const notify = vi.fn()
    const savePrompt = vi.fn((savedPrompt: PromptRecord) =>
      Promise.resolve({ status: 'synced' as const, value: savedPrompt }),
    )

    store.getState().actions.startNew()
    store.getState().actions.updateDraft('title', 'Prompt with Image')
    store
      .getState()
      .actions.updateDraft('body', createPendingPromptImageMarkdown('diagram.png', 'pending-one'))

    const commands = createPromptLibraryCommandExecutor({
      clipboard: { writeText: () => Promise.resolve() },
      library: createLibrary({ savePrompt }),
      notify,
      store,
    })

    commands.saveComposer()

    expect(savePrompt).not.toHaveBeenCalled()
    expect(store.getState().composer.mode).toBe('new')
    expect(notify).toHaveBeenCalledWith('Wait for image uploads to finish')
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
    expect(notify).toHaveBeenCalledWith('Updated “Updated Alpha”')

    commands.duplicatePrompt()
    await flushPromises()

    expect(savePrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Updated Alpha (copy)',
        uses: 0,
      }),
    )
    expect(notify).toHaveBeenCalledWith('Duplicated as “Updated Alpha (copy)”')
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
    expect(notify).toHaveBeenCalledWith('Clipboard access is unavailable')
    expect(store.getState().prompts[0]?.uses).toBe(0)

    commands.deletePrompt()
    commands.deletePrompt()
    await flushPromises()

    expect(store.getState().prompts).toEqual([])
    expect(notify).toHaveBeenCalledWith('Couldn’t sync — D1 unavailable')
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
    expect(notify).toHaveBeenCalledWith('Couldn’t sync — D1 unavailable')
  })
})

const setup = (
  prompts: PromptRecord[] = [createPrompt()],
  libraryOverrides: Partial<PromptLibraryClient> = {},
) => {
  const store = createPromptLibraryStore()
  const notify = vi.fn()
  const clipboard = { writeText: vi.fn((_value: string) => Promise.resolve()) }
  const savePrompt = vi.fn((savedPrompt: PromptRecord) =>
    Promise.resolve({ status: 'synced' as const, value: savedPrompt }),
  )

  store.getState().actions.replacePrompts(prompts, { isFresh: false })
  store.getState().actions.selectPrompt(prompts[0]?.id ?? null)

  const commands = createPromptLibraryCommandExecutor({
    clipboard,
    library: createLibrary({ savePrompt, ...libraryOverrides }),
    notify,
    store,
  })

  return { clipboard, commands, notify, savePrompt, store }
}

describe('prompt library command executor: capture, pin, runs, and filled copies', () => {
  it('refuses to capture while a Prompt is being edited, so the draft keeps its target', () => {
    const { commands, notify, savePrompt, store } = setup([createPrompt({ id: 'prompt-alpha' })])

    store.getState().actions.startEdit('prompt-alpha')
    store.getState().actions.updateDraft('title', 'Alpha edited')

    expect(commands.capturePrompt({ kind: 'prompt', body: 'my captured idea' })).toBeNull()
    expect(store.getState().prompts).toHaveLength(1)
    expect(store.getState().selectedPromptId).toBe('prompt-alpha')
    expect(savePrompt).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith('Finish editing first — save or press Esc')
  })

  it('reveals a saved Prompt that the current filter or query would hide', async () => {
    const { commands, store } = setup([createPrompt({ id: 'prompt-alpha', pinned: true })])

    store.getState().actions.setFilter({ project: null, kind: null, pinned: true, tag: null })
    store.getState().actions.setQuery('alpha')
    store.getState().actions.startNew('fragment')
    store.getState().actions.updateDraft('title', 'Fresh fragment')
    store.getState().actions.updateDraft('body', 'Keep it short.')
    commands.saveComposer()
    await flushPromises()

    expect(store.getState().filter).toEqual({
      project: null,
      kind: null,
      pinned: false,
      tag: null,
    })
    expect(store.getState().query).toBe('')
    expect(
      store.getState().prompts.find((prompt) => prompt.id === store.getState().selectedPromptId)
        ?.title,
    ).toBe('Fresh fragment')
  })

  it('captures a body, deriving the title, and commits it through library.savePrompt', async () => {
    const { commands, notify, savePrompt, store } = setup([])

    const captured = commands.capturePrompt({
      kind: 'fragment',
      body: '\n  ## Preserve uncertainty as open questions.\n\nMore detail here.  ',
      category: 'Writing',
      tagsInput: '#tone #Tone',
    })
    await flushPromises()

    expect(captured).toMatchObject({
      kind: 'fragment',
      title: 'Preserve uncertainty as open questions',
      body: '## Preserve uncertainty as open questions.\n\nMore detail here.',
      category: 'Writing',
      tags: ['tone'],
      runs: [],
      pinned: false,
      uses: 0,
    })
    expect(savePrompt).toHaveBeenCalledExactlyOnceWith(captured)
    expect(store.getState().prompts[0]).toEqual(captured)
    expect(store.getState().selectedPromptId).toBe(captured?.id)
    expect(store.getState().isFresh).toBe(false)
    expect(notify).toHaveBeenCalledWith('Captured “Preserve uncertainty as open questions”')
  })

  it('captures into an existing Project when only the spelling differs', async () => {
    const { commands } = setup([createPrompt({ id: 'existing', category: 'render-md' })])

    const captured = commands.capturePrompt({
      kind: 'prompt',
      body: 'Ask for the smallest reproduction.',
      category: 'Render MD',
    })
    await flushPromises()

    expect(captured?.category).toBe('render-md')
  })

  it('prefers an explicit title and falls back to "Untitled" when none can be derived', async () => {
    const { commands, savePrompt } = setup([])

    expect(
      commands.capturePrompt({ kind: 'prompt', body: 'Body text', title: '  Given title  ' })
        ?.title,
    ).toBe('Given title')
    expect(
      commands.capturePrompt({ kind: 'sequence', body: '<!-- step -->\n---', title: '   ' }),
    ).toMatchObject({ title: 'Untitled', kind: 'sequence', category: 'Personal' })
    await flushPromises()

    expect(savePrompt).toHaveBeenCalledTimes(2)
  })

  it('refuses to capture an empty body', () => {
    const { commands, notify, savePrompt, store } = setup([])

    expect(commands.capturePrompt({ kind: 'prompt', body: '  \n ' })).toBeNull()
    expect(savePrompt).not.toHaveBeenCalled()
    expect(store.getState().prompts).toEqual([])
    expect(notify).toHaveBeenCalledWith('Nothing to capture yet')
  })

  it('toggles the pin on the active Prompt and commits each change', async () => {
    const { commands, notify, savePrompt, store } = setup()

    commands.togglePinActivePrompt()
    await flushPromises()

    expect(store.getState().prompts[0]?.pinned).toBe(true)
    expect(savePrompt).toHaveBeenLastCalledWith(expect.objectContaining({ pinned: true }))
    expect(notify).toHaveBeenCalledWith('Pinned “Alpha”')

    commands.togglePinActivePrompt()
    await flushPromises()

    expect(store.getState().prompts[0]?.pinned).toBe(false)
    expect(savePrompt).toHaveBeenLastCalledWith(expect.objectContaining({ pinned: false }))
    expect(savePrompt).toHaveBeenCalledTimes(2)
    expect(notify).toHaveBeenCalledWith('Unpinned “Alpha”')
  })

  it('does nothing when there is no active Prompt', async () => {
    const { commands, notify, savePrompt, clipboard } = setup([])

    commands.togglePinActivePrompt()
    commands.removeRunFromActivePrompt('run-1')
    await commands.copyActivePrompt({ values: { x: 'y' } })

    expect(commands.logRunForActivePrompt({ model: 'model-a', verdict: 'pass' })).toBe(false)
    expect(savePrompt).not.toHaveBeenCalled()
    expect(clipboard.writeText).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })

  it('logs a run against the active Prompt and commits it', async () => {
    const { commands, notify, savePrompt, store } = setup([createPrompt({ kind: 'benchmark' })])

    expect(
      commands.logRunForActivePrompt({ model: '  model-a ', verdict: 'mixed', note: ' close ' }),
    ).toBe(true)
    await flushPromises()

    const runs = store.getState().prompts[0]?.runs ?? []

    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ model: 'model-a', verdict: 'mixed', note: 'close' })
    expect(savePrompt).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ runs }))
    expect(notify).toHaveBeenCalledWith('Logged a mixed on model-a')
  })

  it('refuses to log a run without a model name', async () => {
    const { commands, notify, savePrompt, store } = setup([createPrompt({ kind: 'benchmark' })])

    expect(commands.logRunForActivePrompt({ model: '   ', verdict: 'pass' })).toBe(false)
    await flushPromises()

    expect(notify).toHaveBeenCalledWith('Name the model you ran it against')
    expect(store.getState().prompts[0]?.runs).toEqual([])
    expect(savePrompt).not.toHaveBeenCalled()
  })

  it('removes a run from the active Prompt and commits it', async () => {
    const run: PromptRun = {
      id: 'run-1',
      model: 'model-a',
      verdict: 'fail',
      note: '',
      ranAt: '2026-05-01T00:00:00.000Z',
    }
    const { commands, notify, savePrompt, store } = setup([
      createPrompt({ kind: 'benchmark', runs: [run] }),
    ])

    commands.removeRunFromActivePrompt('run-1')
    await flushPromises()

    expect(store.getState().prompts[0]?.runs).toEqual([])
    expect(savePrompt).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ runs: [] }))
    expect(notify).toHaveBeenCalledWith('Run removed')
  })

  it('keeps the optimistic pin and notifies when the commit fails', async () => {
    const { commands, notify, store } = setup([createPrompt()], {
      savePrompt: () =>
        Promise.resolve({
          status: 'failed' as const,
          message: 'D1 unavailable',
          error: new Error('D1 unavailable'),
        }),
    })

    commands.togglePinActivePrompt()
    await flushPromises()

    expect(store.getState().prompts[0]?.pinned).toBe(true)
    expect(notify).toHaveBeenCalledWith('Couldn’t sync — D1 unavailable')
  })

  it('copies the active Prompt with variables filled in', async () => {
    const { clipboard, commands, notify } = setup([
      createPrompt({ body: 'Review {{file}} for {{focus | correctness}}.' }),
    ])

    await commands.copyActivePrompt({ values: { file: 'api.ts' } })

    expect(clipboard.writeText).toHaveBeenCalledExactlyOnceWith('Review api.ts for correctness.')
    expect(notify).toHaveBeenCalledWith('Copied “Alpha”')
  })

  it('copies one filled sequence step and says which step was copied', async () => {
    const { clipboard, commands, notify, store } = setup([
      createPrompt({
        kind: 'sequence',
        title: 'Plan, build',
        body: joinSequenceSteps(['Restate {{problem}}.', 'Build a fix for {{problem}}.']),
      }),
    ])

    await commands.copyActivePrompt({ values: { problem: 'the cache bug' }, stepIndex: 1 })

    expect(clipboard.writeText).toHaveBeenCalledExactlyOnceWith('Build a fix for the cache bug.')
    expect(notify).toHaveBeenCalledWith('Copied step 2 of “Plan, build”')
    expect(store.getState().prompts[0]?.uses).toBe(1)
  })

  it('copies a whole sequence as numbered steps', async () => {
    const { clipboard, commands } = setup([
      createPrompt({ kind: 'sequence', body: joinSequenceSteps(['One', 'Two']) }),
    ])

    await commands.copyActivePrompt()

    expect(clipboard.writeText).toHaveBeenCalledExactlyOnceWith('Step 1\nOne\n\nStep 2\nTwo')
  })
})
