import { beforeEach, describe, expect, it } from 'vitest'

import { createPromptLibraryStore } from '@/features/prompt-library/store/prompt-library-store'

const createStorageMock = () => {
  const values = new Map<string, string>()

  return {
    clear: () => {
      values.clear()
    },
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => {
      values.delete(key)
    },
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

describe('prompt library store', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createStorageMock(),
    })
  })

  it('creates a new prompt from the composer draft', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()

    actions.startNew()
    actions.updateDraft('title', 'My New Prompt')
    actions.updateDraft('category', 'Research')
    actions.updateDraft('tagsInput', '#mapping #review')
    actions.updateDraft('body', 'Map the codebase in 15 minutes.')

    const result = actions.saveComposer()
    const state = store.getState()

    expect(result.status).toBe('created')
    expect(state.prompts[0]?.title).toBe('My New Prompt')
    expect(state.prompts[0]?.tags).toEqual(['mapping', 'review'])
    expect(state.selectedPromptId).toBe(state.prompts[0]?.id ?? null)
    expect(state.composer.mode).toBe('view')
  })

  it('updates an existing prompt through edit mode', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()

    actions.startNew()
    actions.updateDraft('title', 'Original Prompt')
    actions.updateDraft('body', 'Original body')
    actions.saveComposer()

    const promptToEdit = store.getState().prompts[0]

    actions.startEdit(promptToEdit.id)
    actions.updateDraft('title', 'Updated Prompt')

    const result = actions.saveComposer()

    expect(result.status).toBe('updated')
    expect(store.getState().prompts[0]?.title).toBe('Updated Prompt')
  })

  it('duplicates and deletes prompts while keeping selection valid', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()

    actions.startNew()
    actions.updateDraft('title', 'Source Prompt')
    actions.updateDraft('body', 'Source body')
    actions.saveComposer()

    const sourcePrompt = store.getState().prompts[0]

    const duplicate = actions.duplicatePrompt(sourcePrompt.id)

    expect(duplicate?.title).toBe(`${sourcePrompt.title} (copy)`)
    expect(store.getState().selectedPromptId).toBe(duplicate?.id ?? null)

    const deletedPrompt = actions.deletePrompt(duplicate?.id ?? '', sourcePrompt.id)

    expect(deletedPrompt?.id).toBe(duplicate?.id)
    expect(store.getState().selectedPromptId).toBe(sourcePrompt.id)
  })

  it('starts with an empty library', () => {
    const store = createPromptLibraryStore()

    expect(store.getState().prompts).toEqual([])
    expect(store.getState().selectedPromptId).toBeNull()
  })
})
