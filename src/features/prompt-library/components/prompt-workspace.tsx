'use client'

import { startTransition, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Textarea } from '@/components/ui/textarea'
import { filenameOf, relativeTime } from '@/features/prompt-library/lib/prompt-library-utils'
import {
  type ComposerState,
  type PromptDraft,
  type PromptRecord,
} from '@/features/prompt-library/types'

type PromptWorkspaceProps = {
  activePrompt: PromptRecord | null
  categories: string[]
  composer: ComposerState
  filteredCount: number
  totalCount: number
  query: string
  confirmDeleteId: string | null
  searchInputRef: React.RefObject<HTMLInputElement | null>
  titleInputRef: React.RefObject<HTMLInputElement | null>
  onQueryChange: (value: string) => void
  onCopyPrompt: () => void | Promise<void>
  onStartEdit: () => void
  onDuplicatePrompt: () => void
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
  categories,
  composer,
  filteredCount,
  totalCount,
  query,
  confirmDeleteId,
  searchInputRef,
  titleInputRef,
  onQueryChange,
  onCopyPrompt,
  onStartEdit,
  onDuplicatePrompt,
  onDeletePrompt,
  onStartNew,
  onCancelComposer,
  onSaveComposer,
  onDraftChange,
}: PromptWorkspaceProps) {
  const [searchFocused, setSearchFocused] = useState(false)

  return (
    <main className="order-1 min-w-0 px-4 py-6 md:order-2 md:px-6 xl:px-7">
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
          prompt={activePrompt}
          onCopyPrompt={onCopyPrompt}
          onDeletePrompt={onDeletePrompt}
          onDuplicatePrompt={onDuplicatePrompt}
          onStartEdit={onStartEdit}
        />
      ) : null}

      {composer.mode === 'view' && !activePrompt && totalCount === 0 ? (
        <PromptEmptyState onStartNew={onStartNew} />
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

type PromptCommandBarProps = {
  filteredCount: number
  totalCount: number
  query: string
  searchFocused: boolean
  searchInputRef: React.RefObject<HTMLInputElement | null>
  onFocusChange: (focused: boolean) => void
  onQueryChange: (value: string) => void
}

function PromptCommandBar({
  filteredCount,
  totalCount,
  query,
  searchFocused,
  searchInputRef,
  onFocusChange,
  onQueryChange,
}: PromptCommandBarProps) {
  return (
    <>
      <div
        className="relative mb-5 flex items-center gap-2 border border-border bg-card px-4 py-3"
        data-focused={searchFocused ? 'true' : 'false'}
      >
        <span className="font-semibold text-accent-foreground">~/.promptrc</span>
        <span className="text-primary">$ grep -r</span>

        <div className="relative min-w-0 flex-1">
          <input
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-0 focus-visible:ring-ring/50"
            onBlur={() => onFocusChange(false)}
            onChange={(event) => {
              const nextValue = event.target.value

              startTransition(() => {
                onQueryChange(nextValue)
              })
            }}
            onFocus={() => onFocusChange(true)}
            placeholder="search title, body, or #tag - press / to focus"
            ref={searchInputRef}
            value={query}
          />

          {searchFocused ? (
            <span className="pointer-events-none absolute inset-0 flex items-center overflow-hidden text-[14px] whitespace-pre text-foreground">
              <span className="truncate">{query}</span>
              <span className="ml-[1px] h-4 w-[9px] animate-[terminal-blink_1s_steps(1)_infinite] bg-primary" />
            </span>
          ) : null}
        </div>

        <Kbd>/</Kbd>
      </div>

      <div className="mb-4 text-[12px] text-muted-foreground">
        <span className="text-accent-foreground">[ok]</span> matched{' '}
        <span className="text-primary">{filteredCount}</span> of{' '}
        <span className="text-primary">{totalCount}</span>
        <span className="opacity-85">
          {' '}
          - press <Kbd className="mx-1 align-middle">n</Kbd> to create -{' '}
          <Kbd className="mx-1 align-middle">?</Kbd> for keys
        </span>
      </div>
    </>
  )
}

type PromptViewerProps = {
  prompt: PromptRecord
  confirmDeleteId: string | null
  onCopyPrompt: () => void | Promise<void>
  onStartEdit: () => void
  onDuplicatePrompt: () => void
  onDeletePrompt: () => void
}

function PromptViewer({
  prompt,
  confirmDeleteId,
  onCopyPrompt,
  onStartEdit,
  onDuplicatePrompt,
  onDeletePrompt,
}: PromptViewerProps) {
  return (
    <Card className="gap-0">
      <CardHeader className="grid-cols-[1fr_auto] border-b border-border bg-card/95 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
          <span>
            <span className="text-primary">●</span> prompt
          </span>
          <span className="text-secondary-foreground">@{prompt.category.toLowerCase()}</span>
          {prompt.uses > 0 ? (
            <span className="text-accent-foreground">
              +{prompt.uses} {prompt.uses === 1 ? 'use' : 'uses'}
            </span>
          ) : null}
        </div>

        <span
          className="truncate text-[11px] text-muted-foreground"
          title={new Date(prompt.updatedAt).toLocaleString()}
        >
          updated {relativeTime(prompt.updatedAt)}
        </span>
      </CardHeader>

      <CardContent className="px-8 py-7">
        <CardTitle className="mb-3 text-[clamp(1.8rem,4vw,2.25rem)] leading-none font-semibold tracking-[-0.02em] before:mr-2 before:text-accent-foreground before:content-['>']">
          {prompt.title}
        </CardTitle>

        <div className="mb-6 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
          <span>
            category:{' '}
            <span className="text-accent-foreground">{prompt.category.toLowerCase()}</span>
          </span>

          {prompt.tags.length > 0 ? (
            <span>
              tags:{' '}
              {prompt.tags.map((tag) => (
                <span className="text-secondary-foreground" key={tag}>
                  #{tag}{' '}
                </span>
              ))}
            </span>
          ) : null}

          <span>
            created:{' '}
            <span className="text-primary">
              {new Date(prompt.createdAt).toISOString().slice(0, 10)}
            </span>
          </span>
        </div>

        <div className="relative border-l-2 border-l-primary bg-background px-5 py-5 text-[14px] leading-[1.75] whitespace-pre-wrap">
          <span className="absolute -top-2 left-3 bg-card px-2 text-[10px] tracking-[0.2em] text-accent-foreground">
            // PROMPT
          </span>
          {prompt.body}
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 px-8 pb-7">
        <Button onClick={onCopyPrompt} size="sm" type="button">
          Cmd+C - Copy prompt
        </Button>
        <Button onClick={onStartEdit} size="sm" type="button" variant="outline">
          e - Edit
        </Button>
        <Button onClick={onDuplicatePrompt} size="sm" type="button" variant="outline">
          d - Duplicate
        </Button>
        <Button
          className="md:ml-auto"
          onClick={onDeletePrompt}
          size="sm"
          type="button"
          variant={confirmDeleteId === prompt.id ? 'destructive' : 'outline'}
        >
          {confirmDeleteId === prompt.id ? 'press again to confirm' : 'Delete'}
        </Button>
      </CardFooter>
    </Card>
  )
}

type PromptComposerProps = {
  composer: ComposerState
  categories: string[]
  titleInputRef: React.RefObject<HTMLInputElement | null>
  onCancelComposer: () => void
  onSaveComposer: () => void
  onDraftChange: <TFieldName extends keyof PromptDraft>(
    field: TFieldName,
    value: PromptDraft[TFieldName],
  ) => void
}

function PromptComposer({
  composer,
  categories,
  titleInputRef,
  onCancelComposer,
  onSaveComposer,
  onDraftChange,
}: PromptComposerProps) {
  const fileName =
    composer.mode === 'new'
      ? 'new.prompt.md'
      : `${filenameOf(composer.draft.title || 'untitled')}.md`

  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-dashed border-border py-4">
        <CardTitle className="text-primary before:mr-2 before:text-accent-foreground before:content-['>']">
          {fileName}
        </CardTitle>
        <div className="text-[11px] text-muted-foreground">
          esc - cancel - <Kbd className="mx-1 align-middle">Cmd</Kbd>
          <Kbd className="align-middle">Enter</Kbd> save
        </div>
      </CardHeader>

      <CardContent className="px-6 py-6">
        <FieldSet>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="prompt-title">title</FieldLabel>
              <Input
                id="prompt-title"
                onChange={(event) => onDraftChange('title', event.target.value)}
                placeholder="The Translator"
                ref={titleInputRef}
                value={composer.draft.title}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="prompt-category">category</FieldLabel>
              <Input
                id="prompt-category"
                list="prompt-categories"
                onChange={(event) => onDraftChange('category', event.target.value)}
                placeholder="Writing"
                value={composer.draft.category}
              />
              <datalist id="prompt-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              <FieldDescription>choose an existing one or type a new name</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="prompt-tags">tags</FieldLabel>
              <Input
                id="prompt-tags"
                onChange={(event) => onDraftChange('tagsInput', event.target.value)}
                placeholder="#writing #translation #stakeholder"
                value={composer.draft.tagsInput}
              />
              <FieldDescription>comma or space separated - # optional</FieldDescription>
            </Field>

            <Field>
              <FieldTitle>body</FieldTitle>
              <Textarea
                id="prompt-body"
                onChange={(event) => onDraftChange('body', event.target.value)}
                placeholder="Translate this technical writeup for a non-engineer stakeholder..."
                value={composer.draft.body}
              />
            </Field>
          </FieldGroup>
        </FieldSet>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 px-6 pb-6">
        <Button onClick={onSaveComposer} size="sm" type="button">
          Cmd+Enter - {composer.mode === 'new' ? 'write file' : 'save'}
        </Button>
        <Button onClick={onCancelComposer} size="sm" type="button" variant="outline">
          esc - cancel
        </Button>
      </CardFooter>
    </Card>
  )
}

function PromptEmptyState({ onStartNew }: { onStartNew: () => void }) {
  return (
    <Empty className="items-start justify-start border border-dashed border-border bg-card/55 px-8 py-9 text-left">
      <EmptyHeader className="items-start gap-2">
        <EmptyTitle className="text-[12px] tracking-[0.15em] text-accent-foreground uppercase">
          // library is empty
        </EmptyTitle>
        <EmptyDescription className="max-w-none text-[13px] text-muted-foreground">
          Press <Kbd className="mx-1 align-middle">n</Kbd> to create your first prompt.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="items-start">
        <Button onClick={onStartNew} size="sm" type="button">
          n - New prompt
        </Button>
      </EmptyContent>
    </Empty>
  )
}
