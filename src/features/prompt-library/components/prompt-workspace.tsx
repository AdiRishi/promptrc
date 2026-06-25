'use client'

import { useState } from 'react'

import { PromptCommandBar } from '@/features/prompt-library/components/prompt-command-bar'
import { PromptComposer } from '@/features/prompt-library/components/prompt-composer'
import { PromptEmptyState } from '@/features/prompt-library/components/prompt-empty-state'
import { PromptViewer } from '@/features/prompt-library/components/prompt-viewer'
import {
  type ComposerState,
  type PromptDraft,
  type PromptRecord,
} from '@/features/prompt-library/types'
import { SITE_APP_HEADING } from '@/lib/site-config'

type PromptWorkspaceProps = {
  activePrompt: PromptRecord | null
  canSharePrompts: boolean
  categories: string[]
  composer: ComposerState
  emptyReason: 'no-prompts' | 'no-query-matches' | null
  filteredCount: number
  hasActivePromptShare: boolean
  totalCount: number
  query: string
  confirmDeleteId: string | null
  searchInputRef: React.RefObject<HTMLInputElement | null>
  titleInputRef: React.RefObject<HTMLInputElement | null>
  onQueryChange: (value: string) => void
  onCopyPrompt: () => void | Promise<void>
  onStartEdit: () => void
  onDuplicatePrompt: () => void
  onSharePrompt: () => void | Promise<void>
  onRevokePromptShare: () => void | Promise<void>
  onDeletePrompt: () => void
  onStartNew: () => void
  onCancelComposer: () => void
  onSaveComposer: () => void
  onDraftChange: <TFieldName extends keyof PromptDraft>(
    field: TFieldName,
    value: PromptDraft[TFieldName],
  ) => void
}

export function PromptWorkspace({
  activePrompt,
  canSharePrompts,
  categories,
  composer,
  emptyReason,
  filteredCount,
  hasActivePromptShare,
  totalCount,
  query,
  confirmDeleteId,
  searchInputRef,
  titleInputRef,
  onQueryChange,
  onCopyPrompt,
  onStartEdit,
  onDuplicatePrompt,
  onSharePrompt,
  onRevokePromptShare,
  onDeletePrompt,
  onStartNew,
  onCancelComposer,
  onSaveComposer,
  onDraftChange,
}: PromptWorkspaceProps) {
  const [searchFocused, setSearchFocused] = useState(false)

  return (
    <main
      aria-labelledby="prompt-library-heading"
      className="order-1 min-w-0 px-4 py-6 md:order-2 md:px-6 xl:px-7"
    >
      <h1 className="sr-only" id="prompt-library-heading">
        {SITE_APP_HEADING}
      </h1>

      <PromptCommandBar
        filteredCount={filteredCount}
        query={query}
        searchFocused={searchFocused}
        searchInputRef={searchInputRef}
        totalCount={totalCount}
        onFocusChange={setSearchFocused}
        onQueryChange={onQueryChange}
      />

      {composer.mode === 'view' && activePrompt ? (
        <PromptViewer
          confirmDeleteId={confirmDeleteId}
          canSharePrompts={canSharePrompts}
          hasActivePromptShare={hasActivePromptShare}
          prompt={activePrompt}
          onCopyPrompt={onCopyPrompt}
          onDeletePrompt={onDeletePrompt}
          onDuplicatePrompt={onDuplicatePrompt}
          onRevokePromptShare={onRevokePromptShare}
          onSharePrompt={onSharePrompt}
          onStartEdit={onStartEdit}
        />
      ) : null}

      {composer.mode === 'view' && !activePrompt && emptyReason ? (
        <PromptEmptyState emptyReason={emptyReason} query={query} onStartNew={onStartNew} />
      ) : null}

      {composer.mode !== 'view' ? (
        <PromptComposer
          categories={categories}
          composer={composer}
          titleInputRef={titleInputRef}
          onCancelComposer={onCancelComposer}
          onDraftChange={onDraftChange}
          onSaveComposer={onSaveComposer}
        />
      ) : null}
    </main>
  )
}
