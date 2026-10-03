/**
 * What a saved item *is*. Every kind is still a Prompt — the kind only changes how
 * the Prompt Body is presented, copied, and evaluated.
 *
 * - `prompt`: a reusable instruction (may contain `{{variables}}`)
 * - `fragment`: a piece of wording worth keeping
 * - `sequence`: an ordered chain of steps, sent one after another
 * - `benchmark`: a reproducible test with an expected result and a run log
 */
export type PromptKind = 'prompt' | 'fragment' | 'sequence' | 'benchmark'

export type PromptRunVerdict = 'pass' | 'mixed' | 'fail'

/** One recorded attempt of a benchmark Prompt against a model. */
export type PromptRun = {
  id: string
  model: string
  verdict: PromptRunVerdict
  note: string
  ranAt: string
}

export type PromptRecord = {
  id: string
  kind: PromptKind
  title: string
  body: string
  notes: string
  category: string
  tags: string[]
  images: PromptImage[]
  runs: PromptRun[]
  pinned: boolean
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
  kind: PromptKind
  title: string
  body: string
  notes: string
  category: string
  tags: string[]
  images: PromptImage[]
}

export type PromptDraft = {
  kind: PromptKind
  title: string
  category: string
  body: string
  notes: string
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

/**
 * Which slice of the Prompt Library the list is showing. The parts stack: a
 * Project is where you are (stored on the Prompt as `category`), and kind,
 * pinned and tag narrow what you see there. `null` / `false` means "any".
 */
export type PromptLibraryFilter = {
  project: string | null
  kind: PromptKind | null
  pinned: boolean
  tag: string | null
}

export type PromptLibrarySort = 'created' | 'used' | 'title'

export type PromptLibraryPersistedSnapshot = {
  prompts: PromptRecord[]
  filter?: PromptLibraryFilter
  sort?: PromptLibrarySort
  query: string
  selectedPromptId: string | null
  composer: ComposerState
  isFresh: boolean
}

export type PromptLibraryRemoteSnapshot = {
  prompts: PromptRecord[]
  isFresh: boolean
}
