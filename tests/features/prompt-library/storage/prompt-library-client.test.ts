import { describe, expect, it, vi } from 'vitest'

import { createPromptLibraryClient } from '@/features/prompt-library/storage/prompt-library-client'
import {
  type LocalPromptLibraryStorage,
  type RemotePromptLibraryStorage,
} from '@/features/prompt-library/storage/prompt-library-storage'
import { createPromptLibraryStore } from '@/features/prompt-library/store/prompt-library-store'
import {
  type PromptLibraryPersistedSnapshot,
  type PromptRecord,
} from '@/features/prompt-library/types'

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

describe('prompt library client', () => {
  it('persists the current snapshot for local mutations', async () => {
    const persistedSnapshots: PromptLibraryPersistedSnapshot[] = []
    const store = createPromptLibraryStore()
    const storage: LocalPromptLibraryStorage = {
      mode: 'local',
      hydrate: () =>
        Promise.resolve({
          source: 'local',
          snapshot: null,
        }),
      persistSnapshot: (snapshot) => {
        persistedSnapshots.push(snapshot)
      },
      reportError: () => 'sync failed',
    }
    const client = createPromptLibraryClient(storage, store)

    store.getState().actions.replacePrompt(prompt)

    await client.addPrompt(prompt)

    expect(persistedSnapshots.at(-1)?.prompts).toEqual([prompt])
  })

  it('delegates prompt mutations to remote storage', async () => {
    const store = createPromptLibraryStore()
    const savePrompt = vi.fn((savedPrompt: PromptRecord) => Promise.resolve(savedPrompt))
    const deletePrompt = vi.fn(() => Promise.resolve())
    const incrementUses = vi.fn((promptId: string) =>
      Promise.resolve({
        ...prompt,
        id: promptId,
        uses: prompt.uses + 1,
      }),
    )
    const storage: RemotePromptLibraryStorage = {
      mode: 'remote',
      hydrate: () =>
        Promise.resolve({
          source: 'remote',
          prompts: [],
        }),
      savePrompt,
      deletePrompt,
      incrementUses,
      reportError: () => 'sync failed',
    }
    const client = createPromptLibraryClient(storage, store)

    await expect(client.addPrompt(prompt)).resolves.toEqual(prompt)
    await client.removePrompt(prompt.id)
    await expect(client.recordPromptUse(prompt.id)).resolves.toMatchObject({ uses: 1 })

    expect(savePrompt).toHaveBeenCalledWith(prompt)
    expect(deletePrompt).toHaveBeenCalledWith(prompt.id)
    expect(incrementUses).toHaveBeenCalledWith(prompt.id)
  })
})
