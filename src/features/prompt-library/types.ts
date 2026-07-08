export type PromptRecord = {
  id: string
  title: string
  body: string
  category: string
  tags: string[]
  images: PromptImage[]
  createdAt: string
  updatedAt: string
  uses: number
}

export type PromptImage = {
  id: string
  fileName: string
  contentType: string
  size: number
  createdAt: string
}

export type PromptImageUploadInput = {
  fileName: string
  contentType: string
  dataBase64: string
}

export type PromptShareRecord = {
  id: string
  promptId: string
  createdAt: string
  revokedAt: string | null
}

export type PromptShareRevokeResult = {
  promptId: string
  revoked: boolean
}

export type PublicPromptShare = {
  shareId: string
  createdAt: string
  prompt: PromptRecord
}

export type PromptSaveInput = {
  title: string
  body: string
  category: string
  tags: string[]
  images: PromptImage[]
}

export type PromptDraft = {
  title: string
  category: string
  body: string
  images: PromptImage[]
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
  isFresh: boolean
}

export type PromptLibraryRemoteSnapshot = {
  prompts: PromptRecord[]
  isFresh: boolean
}
