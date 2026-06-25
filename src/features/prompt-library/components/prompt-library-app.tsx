'use client'

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'

import { runPromptLibraryCommand } from '@/features/prompt-library/commands/prompt-library-command-router'
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
  usePromptLibraryClient,
  usePromptLibraryMeta,
  usePromptLibraryStore,
} from '@/features/prompt-library/components/prompt-library-provider'
import {
  type PromptShortcutDefinition,
  PromptShortcutsPanel,
} from '@/features/prompt-library/components/prompt-shortcuts-panel'
import { PromptTopBar } from '@/features/prompt-library/components/prompt-top-bar'
import { PromptTreePanel } from '@/features/prompt-library/components/prompt-tree-panel'
import { PromptWorkspace } from '@/features/prompt-library/components/prompt-workspace'
import { usePromptLibraryCommands } from '@/features/prompt-library/hooks/use-prompt-library-commands'
import { usePromptLibraryHotkeys } from '@/features/prompt-library/hooks/use-prompt-library-hotkeys'
import { selectPromptLibraryVisibleState } from '@/features/prompt-library/selectors/prompt-library-selectors'
import { type PromptShareRecord } from '@/features/prompt-library/types'

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
  const library = usePromptLibraryClient()
  const { searchInputRef, titleInputRef } = usePromptLibraryMeta()
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [activePromptShare, setActivePromptShare] = useState<PromptShareRecord | null>(null)
  const activePromptIdRef = useRef<string | null>(null)
  const shareLookupVersionRef = useRef(0)
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
  const activePromptId = visibleState.activePrompt?.id ?? null
  activePromptIdRef.current = activePromptId

  const {
    copyActivePrompt,
    deletePrompt,
    duplicatePrompt,
    revokeActivePromptShare,
    saveComposer,
    selectPrompt,
    shareActivePrompt,
    startEditActivePrompt,
  } = usePromptLibraryCommands()

  const sharePrompt = useCallback(async () => {
    const share = await shareActivePrompt()

    if (share && share.promptId === activePromptIdRef.current) {
      shareLookupVersionRef.current += 1
      setActivePromptShare(share)
    }
  }, [shareActivePrompt])

  const revokePromptShare = useCallback(async () => {
    const result = await revokeActivePromptShare()

    if (result && result.promptId === activePromptIdRef.current) {
      shareLookupVersionRef.current += 1
      setActivePromptShare(null)
    }
  }, [revokeActivePromptShare])

  const commandState = useMemo<PromptLibraryCommandState>(
    () => ({
      canSharePrompts: library.canSharePrompts,
      composerMode: composer.mode,
      hasActivePrompt: Boolean(visibleState.activePrompt),
    }),
    [composer.mode, library.canSharePrompts, visibleState.activePrompt],
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
        shareActivePrompt: sharePrompt,
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
      sharePrompt,
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

  useEffect(() => {
    let ignore = false
    const lookupVersion = shareLookupVersionRef.current + 1
    shareLookupVersionRef.current = lookupVersion

    if (!library.canSharePrompts || !activePromptId) {
      setActivePromptShare(null)
      return
    }

    setActivePromptShare(null)

    void library.getPromptShare(activePromptId).then((result) => {
      if (ignore || shareLookupVersionRef.current !== lookupVersion) {
        return
      }

      setActivePromptShare(result.status === 'synced' ? result.value : null)
    })

    return () => {
      ignore = true
    }
  }, [activePromptId, library])

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
          canSharePrompts={library.canSharePrompts}
          categories={visibleState.categories}
          composer={composer}
          confirmDeleteId={confirmDeleteId}
          emptyReason={visibleState.emptyReason}
          filteredCount={visibleState.orderedPromptIds.length}
          hasActivePromptShare={activePromptShare?.promptId === activePromptId}
          onCancelComposer={actions.cancelComposer}
          onCopyPrompt={copyActivePrompt}
          onDeletePrompt={deletePrompt}
          onDraftChange={actions.updateDraft}
          onDuplicatePrompt={duplicatePrompt}
          onRevokePromptShare={revokePromptShare}
          onQueryChange={actions.setQuery}
          onSaveComposer={saveComposer}
          onSharePrompt={sharePrompt}
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
