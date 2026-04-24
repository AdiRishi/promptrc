export type PromptRecord = {
  id: string
  title: string
  body: string
  category: string
  tags: string[]
  createdAt: string
  updatedAt: string
  uses: number
}

export type PromptSaveInput = {
  title: string
  body: string
  category: string
  tags: string[]
}

export type PromptDraft = {
  title: string
  category: string
  body: string
  tagsInput: string
}

export type ComposerMode = 'view' | 'new' | 'edit'

export type ComposerState = {
  mode: ComposerMode
  draft: PromptDraft
}

export type PromptSyncMode = 'local' | 'remote'

export type PromptSyncStatus = 'idle' | 'loading' | 'ready' | 'error'

export type PromptLibraryPersistedSnapshot = {
  prompts: PromptRecord[]
  query: string
  selectedPromptId: string | null
  composer: ComposerState
}
