'use client'

import { Show, UserButton } from '@clerk/tanstack-react-start'
import { Cloud, HardDrive, LogIn } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useEffectEvent, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { PromptHelpOverlay } from '@/features/prompt-library/components/prompt-help-overlay'
import {
  PromptLibraryProvider,
  usePromptLibraryMeta,
  usePromptLibraryStorageContext,
  usePromptLibraryStore,
} from '@/features/prompt-library/components/prompt-library-provider'
import {
  type PromptShortcutDefinition,
  PromptShortcutsPanel,
} from '@/features/prompt-library/components/prompt-shortcuts-panel'
import { PromptTreePanel } from '@/features/prompt-library/components/prompt-tree-panel'
import { PromptWorkspace } from '@/features/prompt-library/components/prompt-workspace'
import {
  filenameOf,
  getPromptCategories,
  groupPromptsByCategory,
  matchesPromptQuery,
} from '@/features/prompt-library/lib/prompt-library-utils'
import { type PromptRecord } from '@/features/prompt-library/types'

export function PromptLibraryApp() {
  return (
    <PromptLibraryProvider>
      <PromptLibraryScreen />
    </PromptLibraryProvider>
  )
}

function PromptLibraryScreen() {
  const prompts = usePromptLibraryStore((state) => state.prompts)
  const query = usePromptLibraryStore((state) => state.query)
  const selectedPromptId = usePromptLibraryStore((state) => state.selectedPromptId)
  const composer = usePromptLibraryStore((state) => state.composer)
  const confirmDeleteId = usePromptLibraryStore((state) => state.confirmDeleteId)
  const hasHydrated = usePromptLibraryStore((state) => state.hasHydrated)
  const syncMode = usePromptLibraryStore((state) => state.syncMode)
  const syncStatus = usePromptLibraryStore((state) => state.syncStatus)
  const actions = usePromptLibraryStore((state) => state.actions)
  const { searchInputRef, titleInputRef } = usePromptLibraryMeta()
  const storage = usePromptLibraryStorageContext()
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const toggleHelp = useCallback(() => setIsHelpOpen((open) => !open), [])
  const closeHelp = useCallback(() => setIsHelpOpen(false), [])

  const deferredQuery = useDeferredValue(query)
  const filteredPrompts = useMemo(
    () => prompts.filter((prompt) => matchesPromptQuery(prompt, deferredQuery)),
    [deferredQuery, prompts],
  )
  const groupedPrompts = useMemo(() => groupPromptsByCategory(filteredPrompts), [filteredPrompts])
  const categoryKeys = useMemo(() => Object.keys(groupedPrompts), [groupedPrompts])
  const categories = useMemo(() => getPromptCategories(prompts), [prompts])
  const activePrompt = useMemo(
    () => prompts.find((prompt) => prompt.id === selectedPromptId) ?? null,
    [prompts, selectedPromptId],
  )
  const flatPromptIds = useMemo(() => filteredPrompts.map((prompt) => prompt.id), [filteredPrompts])

  useEffect(() => {
    if (!hasHydrated) {
      return
    }

    const nextSelectedPromptId = prompts[0]?.id ?? null

    if (selectedPromptId && prompts.some((prompt) => prompt.id === selectedPromptId)) {
      return
    }

    actions.selectPrompt(nextSelectedPromptId)
  }, [actions, hasHydrated, prompts, selectedPromptId])

  useEffect(() => {
    if (composer.mode === 'view') {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      titleInputRef.current?.focus()
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [composer.mode, titleInputRef])

  useEffect(() => {
    if (!confirmDeleteId) {
      return
    }

    const timeout = window.setTimeout(() => {
      actions.clearDeleteConfirmation()
    }, 3000)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [actions, confirmDeleteId])

  const selectPrompt = useCallback(
    (promptId: string) => {
      if (composer.mode !== 'view') {
        toast('press esc to finish editing first')
        return
      }

      actions.selectPrompt(promptId)
    },
    [actions, composer.mode],
  )

  const markSyncError = useCallback(
    (error: unknown) => {
      const message = storage.reportError(error)
      toast(`sync failed - ${message}`)
    },
    [storage],
  )

  const persistPrompt = useCallback(
    async (prompt: PromptRecord) => {
      try {
        await storage.savePrompt(prompt)
      } catch (error) {
        markSyncError(error)
      }
    },
    [markSyncError, storage],
  )

  const copyActivePrompt = useCallback(async () => {
    if (!activePrompt) {
      return
    }

    try {
      await navigator.clipboard.writeText(activePrompt.body)
    } catch {
      toast('clipboard access is unavailable')
      return
    }

    actions.incrementUses(activePrompt.id)
    void storage.incrementUses(activePrompt.id).catch(markSyncError)
    toast(`copied → ${activePrompt.title}`)
  }, [actions, activePrompt, markSyncError, storage])

  const saveComposer = useCallback(() => {
    const result = actions.saveComposer()

    if (result.status === 'invalid') {
      toast('title and body required')
      titleInputRef.current?.focus()
      return
    }

    if (result.status === 'created') {
      void persistPrompt(result.prompt)
      toast(`wrote ${filenameOf(result.prompt.title)}.md`)
      return
    }

    if (result.status === 'updated') {
      void persistPrompt(result.prompt)
      toast(`saved ${filenameOf(result.prompt.title)}.md`)
    }
  }, [actions, persistPrompt, titleInputRef])

  const duplicatePrompt = useCallback(() => {
    if (!activePrompt) {
      return
    }

    const duplicatedPrompt = actions.duplicatePrompt(activePrompt.id)

    if (duplicatedPrompt) {
      void persistPrompt(duplicatedPrompt)
      toast(`duplicated → ${duplicatedPrompt.title}`)
    }
  }, [actions, activePrompt, persistPrompt])

  const deletePrompt = useCallback(() => {
    if (!activePrompt) {
      return
    }

    if (confirmDeleteId !== activePrompt.id) {
      actions.requestDeletePrompt(activePrompt.id)
      toast('press delete again to confirm')
      return
    }

    const orderedPromptIds = flatPromptIds.includes(activePrompt.id)
      ? flatPromptIds
      : prompts.map((prompt) => prompt.id)
    const currentPromptIndex = orderedPromptIds.indexOf(activePrompt.id)
    const nextSelectedPromptId =
      orderedPromptIds[currentPromptIndex + 1] ?? orderedPromptIds[currentPromptIndex - 1] ?? null
    const removedPrompt = actions.deletePrompt(activePrompt.id, nextSelectedPromptId)

    if (removedPrompt) {
      void storage.deletePrompt(removedPrompt.id).catch(markSyncError)
      toast(`removed → ${removedPrompt.title}`)
    }
  }, [actions, activePrompt, confirmDeleteId, flatPromptIds, markSyncError, prompts, storage])

  const shortcuts = useMemo<PromptShortcutDefinition[]>(
    () => [
      {
        keys: ['n'],
        label: 'new prompt',
        action: actions.startNew,
      },
      {
        keys: ['/'],
        label: 'focus search',
        action: () => {
          searchInputRef.current?.focus()
          searchInputRef.current?.select()
        },
      },
      {
        keys: ['j', 'k'],
        label: 'next . prev',
        action: () => {
          if (!flatPromptIds.length) {
            return
          }

          const currentIndex = selectedPromptId ? flatPromptIds.indexOf(selectedPromptId) : -1
          const nextPromptId =
            flatPromptIds[Math.min(currentIndex + 1, flatPromptIds.length - 1)] ?? flatPromptIds[0]

          actions.selectPrompt(nextPromptId ?? null)
        },
      },
      {
        keys: ['e'],
        label: 'edit selected',
        action: () => {
          if (!activePrompt) {
            return
          }

          actions.startEdit(activePrompt.id)
        },
      },
      {
        keys: ['d'],
        label: 'duplicate',
        action: duplicatePrompt,
      },
      {
        keys: ['Cmd', 'C'],
        label: 'copy body',
        action: () => {
          void copyActivePrompt()
        },
      },
      {
        keys: ['x'],
        label: 'delete',
        action: deletePrompt,
      },
    ],
    [
      actions,
      activePrompt,
      copyActivePrompt,
      deletePrompt,
      duplicatePrompt,
      flatPromptIds,
      searchInputRef,
      selectedPromptId,
    ],
  )

  usePromptLibraryHotkeys({
    activePrompt,
    composerMode: composer.mode,
    filteredPromptIds: flatPromptIds,
    isHelpOpen,
    onCancelComposer: actions.cancelComposer,
    onCopyActivePrompt: copyActivePrompt,
    onDeletePrompt: deletePrompt,
    onDuplicatePrompt: duplicatePrompt,
    onSaveComposer: saveComposer,
    onSelectPrompt: actions.selectPrompt,
    onStartEdit: () => {
      if (!activePrompt) {
        return
      }

      actions.startEdit(activePrompt.id)
    },
    onStartNew: actions.startNew,
    onToggleHelp: toggleHelp,
    searchInputRef,
    selectedPromptId,
  })

  return (
    <div className="terminal-app min-h-screen overflow-hidden bg-background text-foreground">
      <PromptTopBar promptCount={prompts.length} syncMode={syncMode} syncStatus={syncStatus} />

      <div className="relative z-10 grid min-h-[calc(100vh-42px)] grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_280px]">
        <PromptTreePanel
          categoryKeys={categoryKeys}
          filteredCount={flatPromptIds.length}
          groupedPrompts={groupedPrompts}
          isComposerOpen={composer.mode !== 'view'}
          onClearQuery={actions.clearQuery}
          onSelectPrompt={selectPrompt}
          query={query}
          selectedPromptId={selectedPromptId}
          totalCount={prompts.length}
        />

        <PromptWorkspace
          activePrompt={activePrompt}
          categories={categories}
          composer={composer}
          confirmDeleteId={confirmDeleteId}
          filteredCount={flatPromptIds.length}
          onCancelComposer={actions.cancelComposer}
          onCopyPrompt={copyActivePrompt}
          onDeletePrompt={deletePrompt}
          onDraftChange={actions.updateDraft}
          onDuplicatePrompt={duplicatePrompt}
          onQueryChange={actions.setQuery}
          onSaveComposer={saveComposer}
          onStartEdit={() => {
            if (!activePrompt) {
              return
            }

            actions.startEdit(activePrompt.id)
          }}
          onStartNew={actions.startNew}
          query={query}
          searchInputRef={searchInputRef}
          titleInputRef={titleInputRef}
          totalCount={prompts.length}
        />

        <PromptShortcutsPanel shortcuts={shortcuts} />
      </div>

      <PromptHelpOverlay isOpen={isHelpOpen} onClose={closeHelp} />
    </div>
  )
}

type PromptTopBarProps = {
  promptCount: number
  syncMode: 'local' | 'remote'
  syncStatus: 'idle' | 'loading' | 'ready' | 'error'
}

function PromptTopBar({ promptCount, syncMode, syncStatus }: PromptTopBarProps) {
  const SyncIcon = syncMode === 'remote' ? Cloud : HardDrive
  const syncText =
    syncMode === 'remote'
      ? syncStatus === 'loading'
        ? 'syncing'
        : syncStatus === 'error'
          ? 'sync error'
          : 'cloud'
      : 'local'

  return (
    <div className="relative z-10 flex min-h-[42px] items-center gap-[10px] border-b border-border bg-muted px-4 py-[8px]">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="size-2.5 rounded-full bg-[rgb(255,95,87)]" />
        <span className="size-2.5 rounded-full bg-[rgb(255,189,46)]" />
        <span className="size-2.5 rounded-full bg-[rgb(40,200,64)]" />
      </div>

      <div className="ml-[14px] min-w-0 text-[12px] tracking-[0.05em] text-muted-foreground">
        <span className="font-medium text-foreground">~/.promptrc</span>{' '}
        <span className="text-primary">·</span> zsh
      </div>

      <div className="ml-auto hidden items-center gap-3 text-[11px] tracking-[0.04em] text-muted-foreground sm:flex">
        <span>
          {promptCount} {promptCount === 1 ? 'entry' : 'entries'}
        </span>
        <span className="flex items-center gap-1.5">
          <SyncIcon aria-hidden="true" className="size-3 text-accent-foreground" />
          <span className={syncStatus === 'error' ? 'text-destructive' : undefined}>
            {syncText}
          </span>
        </span>
      </div>

      <div className="flex min-w-[34px] items-center justify-end">
        <Show when="signed-out">
          <a
            className="inline-flex h-7 items-center gap-1.5 rounded-[2px] border border-border bg-card px-2.5 text-[11px] text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            href="/sign-in"
          >
            <LogIn aria-hidden="true" className="size-3" />
            <span>login</span>
          </a>
        </Show>
        <Show when="signed-in">
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: 'size-7 rounded-[2px]',
                userButtonTrigger:
                  'rounded-[2px] border border-border focus-visible:ring-2 focus-visible:ring-ring',
              },
            }}
          />
        </Show>
      </div>
    </div>
  )
}

type PromptLibraryHotkeysOptions = {
  activePrompt: PromptRecord | null
  composerMode: 'view' | 'new' | 'edit'
  filteredPromptIds: string[]
  isHelpOpen: boolean
  selectedPromptId: string | null
  searchInputRef: React.RefObject<HTMLInputElement | null>
  onStartNew: () => void
  onStartEdit: () => void
  onSaveComposer: () => void
  onCancelComposer: () => void
  onDuplicatePrompt: () => void
  onDeletePrompt: () => void
  onCopyActivePrompt: () => void | Promise<void>
  onSelectPrompt: (promptId: string | null) => void
  onToggleHelp: () => void
}

function usePromptLibraryHotkeys({
  activePrompt,
  composerMode,
  filteredPromptIds,
  isHelpOpen,
  selectedPromptId,
  searchInputRef,
  onStartNew,
  onStartEdit,
  onSaveComposer,
  onCancelComposer,
  onDuplicatePrompt,
  onDeletePrompt,
  onCopyActivePrompt,
  onSelectPrompt,
  onToggleHelp,
}: PromptLibraryHotkeysOptions) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (isHelpOpen) {
      if (event.key === 'Escape' || event.key === '?') {
        event.preventDefault()
        onToggleHelp()
      }

      return
    }

    const target = event.target as HTMLElement | null
    const isTyping =
      !!target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

    if (event.key === 'Escape') {
      if (composerMode !== 'view') {
        event.preventDefault()
        onCancelComposer()
        return
      }

      if (isTyping) {
        target.blur()
      }

      return
    }

    if (composerMode !== 'view' && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      onSaveComposer()
      return
    }

    if (isTyping) {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'c' &&
        !window.getSelection()?.toString()
      ) {
        if (!activePrompt) {
          return
        }

        event.preventDefault()
        void onCopyActivePrompt()
      }

      return
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
      const selectedText = window.getSelection()?.toString()

      if (selectedText || !activePrompt) {
        return
      }

      event.preventDefault()
      void onCopyActivePrompt()
      return
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return
    }

    switch (event.key) {
      case 'n':
        event.preventDefault()
        onStartNew()
        break
      case '/':
        event.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        break
      case 'j': {
        if (!filteredPromptIds.length) {
          return
        }

        event.preventDefault()

        const currentIndex = selectedPromptId ? filteredPromptIds.indexOf(selectedPromptId) : -1
        const nextPromptId =
          filteredPromptIds[Math.min(currentIndex + 1, filteredPromptIds.length - 1)] ??
          filteredPromptIds[0]

        onSelectPrompt(nextPromptId ?? null)
        break
      }
      case 'k': {
        if (!filteredPromptIds.length) {
          return
        }

        event.preventDefault()

        const currentIndex = selectedPromptId ? filteredPromptIds.indexOf(selectedPromptId) : 0
        const previousPromptId =
          filteredPromptIds[Math.max(currentIndex - 1, 0)] ?? filteredPromptIds[0]

        onSelectPrompt(previousPromptId ?? null)
        break
      }
      case 'e':
        if (!activePrompt) {
          return
        }

        event.preventDefault()
        onStartEdit()
        break
      case 'd':
        if (!activePrompt) {
          return
        }

        event.preventDefault()
        onDuplicatePrompt()
        break
      case 'x':
        if (!activePrompt) {
          return
        }

        event.preventDefault()
        onDeletePrompt()
        break
      case '?':
        event.preventDefault()
        onToggleHelp()
        break
      default:
        break
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onKeyDown])
}
