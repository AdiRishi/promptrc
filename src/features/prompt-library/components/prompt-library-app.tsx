'use client'

import { Show, UserButton } from '@clerk/tanstack-react-start'
import { Cloud, HardDrive, LogIn } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useEffectEvent, useMemo, useState } from 'react'
import { FaGithub } from 'react-icons/fa'

import {
  getPromptLibraryKeyboardCommandId,
  runPromptLibraryCommand,
} from '@/features/prompt-library/commands/prompt-library-command-router'
import {
  PROMPT_LIBRARY_SHORTCUT_COMMAND_IDS,
  type PromptLibraryCommandId,
  type PromptLibraryCommandState,
  canRunPromptLibraryCommand,
  getPromptLibraryCommand,
} from '@/features/prompt-library/commands/prompt-library-command-surface'
import { FirstSignInCopyDialog } from '@/features/prompt-library/components/first-sign-in-copy-dialog'
import { PromptHelpOverlay } from '@/features/prompt-library/components/prompt-help-overlay'
import {
  PromptLibraryProvider,
  usePromptLibraryMeta,
  usePromptLibraryStore,
} from '@/features/prompt-library/components/prompt-library-provider'
import {
  type PromptShortcutDefinition,
  PromptShortcutsPanel,
} from '@/features/prompt-library/components/prompt-shortcuts-panel'
import { PromptTreePanel } from '@/features/prompt-library/components/prompt-tree-panel'
import { PromptWorkspace } from '@/features/prompt-library/components/prompt-workspace'
import { usePromptLibraryCommands } from '@/features/prompt-library/hooks/use-prompt-library-commands'
import {
  type PromptLibraryVisibleState,
  selectPromptLibraryVisibleState,
} from '@/features/prompt-library/selectors/prompt-library-selectors'
import { type PromptSyncMode, type PromptSyncStatus } from '@/features/prompt-library/types'
import { SITE_GITHUB_URL } from '@/lib/site-config'

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
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const toggleHelp = useCallback(() => setIsHelpOpen((open) => !open), [])
  const closeHelp = useCallback(() => setIsHelpOpen(false), [])

  const deferredQuery = useDeferredValue(query)
  const visibleState = useMemo(
    () =>
      selectPromptLibraryVisibleState({
        prompts,
        query: deferredQuery,
        selectedPromptId,
      }),
    [deferredQuery, prompts, selectedPromptId],
  )

  const {
    copyActivePrompt,
    deletePrompt,
    duplicatePrompt,
    saveComposer,
    selectPrompt,
    startEditActivePrompt,
  } = usePromptLibraryCommands()

  const commandState = useMemo<PromptLibraryCommandState>(
    () => ({
      composerMode: composer.mode,
      hasActivePrompt: Boolean(visibleState.activePrompt),
    }),
    [composer.mode, visibleState.activePrompt],
  )

  const runCommand = useCallback(
    (commandId: PromptLibraryCommandId) => {
      runPromptLibraryCommand(commandId, {
        commandState,
        copyActivePrompt,
        deletePrompt,
        duplicatePrompt,
        focusSearch: () => {
          searchInputRef.current?.focus()
          searchInputRef.current?.select()
        },
        selectNextPrompt: () => actions.selectPrompt(visibleState.getNextPromptId()),
        selectPreviousPrompt: () => actions.selectPrompt(visibleState.getPreviousPromptId()),
        startEditActivePrompt,
        startNewPrompt: actions.startNew,
      })
    },
    [
      actions,
      commandState,
      copyActivePrompt,
      deletePrompt,
      duplicatePrompt,
      visibleState,
      searchInputRef,
      startEditActivePrompt,
    ],
  )

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

  const shortcuts = useMemo<PromptShortcutDefinition[]>(
    () =>
      PROMPT_LIBRARY_SHORTCUT_COMMAND_IDS.map((commandId) => {
        const command = getPromptLibraryCommand(commandId)

        return {
          action: () => runCommand(commandId),
          disabled: !canRunPromptLibraryCommand(commandId, commandState),
          keys: command.keys,
          label: command.label,
        }
      }),
    [commandState, runCommand],
  )

  usePromptLibraryHotkeys({
    commandState,
    composerMode: composer.mode,
    isHelpOpen,
    onCancelComposer: actions.cancelComposer,
    onRunCommand: runCommand,
    onSaveComposer: saveComposer,
    onToggleHelp: toggleHelp,
    visibleState,
  })

  return (
    <div className="terminal-app min-h-screen overflow-hidden bg-background text-foreground">
      <PromptTopBar promptCount={prompts.length} syncMode={syncMode} syncStatus={syncStatus} />

      <div className="relative z-10 grid min-h-[calc(100vh-42px)] grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_280px]">
        <PromptTreePanel
          categoryKeys={visibleState.categoryKeys}
          filteredCount={visibleState.orderedPromptIds.length}
          groupedPrompts={visibleState.groupedPrompts}
          isComposerOpen={composer.mode !== 'view'}
          onClearQuery={actions.clearQuery}
          onSelectPrompt={selectPrompt}
          query={query}
          selectedPromptId={visibleState.visiblePromptId}
          totalCount={prompts.length}
        />

        <PromptWorkspace
          activePrompt={visibleState.activePrompt}
          categories={visibleState.categories}
          composer={composer}
          confirmDeleteId={confirmDeleteId}
          emptyReason={visibleState.emptyReason}
          filteredCount={visibleState.orderedPromptIds.length}
          onCancelComposer={actions.cancelComposer}
          onCopyPrompt={copyActivePrompt}
          onDeletePrompt={deletePrompt}
          onDraftChange={actions.updateDraft}
          onDuplicatePrompt={duplicatePrompt}
          onQueryChange={actions.setQuery}
          onSaveComposer={saveComposer}
          onStartEdit={startEditActivePrompt}
          onStartNew={actions.startNew}
          query={query}
          searchInputRef={searchInputRef}
          titleInputRef={titleInputRef}
          totalCount={prompts.length}
        />

        <PromptShortcutsPanel shortcuts={shortcuts} />
      </div>

      <FirstSignInCopyDialog />
      <PromptHelpOverlay isOpen={isHelpOpen} onClose={closeHelp} />
    </div>
  )
}

type PromptTopBarProps = {
  promptCount: number
  syncMode: PromptSyncMode
  syncStatus: PromptSyncStatus
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
        <a
          aria-label="View promptrc on GitHub"
          className="inline-flex size-6 items-center justify-center rounded-[2px] border border-border bg-card/70 text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          href={SITE_GITHUB_URL}
          rel="noreferrer"
          target="_blank"
        >
          <FaGithub aria-hidden="true" className="size-3.5" />
        </a>
        <span>
          {promptCount} {promptCount === 1 ? 'Prompt' : 'Prompts'}
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
  commandState: PromptLibraryCommandState
  composerMode: 'view' | 'new' | 'edit'
  isHelpOpen: boolean
  visibleState: PromptLibraryVisibleState
  onSaveComposer: () => void
  onCancelComposer: () => void
  onRunCommand: (commandId: PromptLibraryCommandId) => void
  onToggleHelp: () => void
}

function usePromptLibraryHotkeys({
  commandState,
  composerMode,
  isHelpOpen,
  visibleState,
  onSaveComposer,
  onCancelComposer,
  onRunCommand,
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
      const commandId = getPromptLibraryKeyboardCommandId({
        key: event.key.toLowerCase(),
        isCopyShortcut:
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === 'c' &&
          composerMode === 'view' &&
          !window.getSelection()?.toString(),
      })

      if (commandId && canRunPromptLibraryCommand(commandId, commandState)) {
        event.preventDefault()
        onRunCommand(commandId)
      }

      return
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
      const selectedText = window.getSelection()?.toString()

      if (selectedText || !visibleState.activePrompt) {
        return
      }

      event.preventDefault()
      const commandId = getPromptLibraryKeyboardCommandId({
        key: event.key.toLowerCase(),
        isCopyShortcut: true,
      })

      if (commandId && canRunPromptLibraryCommand(commandId, commandState)) {
        onRunCommand(commandId)
      }

      return
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return
    }

    if (event.key === '?') {
      event.preventDefault()
      onToggleHelp()
      return
    }

    const commandId = getPromptLibraryKeyboardCommandId({
      key: event.key.toLowerCase(),
      isCopyShortcut: false,
    })

    if (commandId && canRunPromptLibraryCommand(commandId, commandState)) {
      event.preventDefault()
      onRunCommand(commandId)
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onKeyDown])
}
