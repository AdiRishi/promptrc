import { useAuth } from '@clerk/tanstack-react-start'
import {
  Clipboard,
  CopyPlus,
  Keyboard,
  Link2,
  LogIn,
  Pencil,
  Pin,
  Plus,
  SquarePen,
  Trash2,
} from 'lucide-react'
import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { runPromptLibraryCommand } from '@/features/prompt-library/commands/prompt-library-command-router'
import {
  type PromptLibraryCommandId,
  type PromptLibraryCommandState,
  canRunPromptLibraryCommand,
  getPromptLibraryCommand,
} from '@/features/prompt-library/commands/prompt-library-command-surface'
import {
  type PaletteAction,
  CommandPalette,
} from '@/features/prompt-library/components/command-palette'
import { FirstSignInCopyDialog } from '@/features/prompt-library/components/first-sign-in-copy-dialog'
import { KeyboardSheet } from '@/features/prompt-library/components/keyboard-sheet'
import { LibrarySidebar } from '@/features/prompt-library/components/library-sidebar'
import {
  type PromptImagePasteRequest,
  PromptEditor,
} from '@/features/prompt-library/components/prompt-editor'
import {
  PromptLibraryProvider,
  usePromptLibraryClient,
  usePromptLibraryMeta,
  usePromptLibraryStore,
} from '@/features/prompt-library/components/prompt-library-provider'
import { PromptList } from '@/features/prompt-library/components/prompt-list'
import { PromptReader, ReaderPlaceholder } from '@/features/prompt-library/components/prompt-reader'
import { QuickCaptureDialog } from '@/features/prompt-library/components/quick-capture-dialog'
import { usePromptLibraryCommands } from '@/features/prompt-library/hooks/use-prompt-library-commands'
import { usePromptLibraryHotkeys } from '@/features/prompt-library/hooks/use-prompt-library-hotkeys'
import { usePromptVariableValues } from '@/features/prompt-library/hooks/use-prompt-variable-values'
import {
  MAX_PROMPT_IMAGE_BYTES,
  createPendingPromptImageMarkdown,
  createPromptImageMarkdown,
  isSupportedPromptImageContentType,
  sanitizePromptImageFileName,
} from '@/features/prompt-library/model/prompt-images'
import { DEFAULT_PROMPT_KIND } from '@/features/prompt-library/model/prompt-kinds'
import {
  getCatalogNumbers,
  matchesPromptFilter,
  selectPromptLibraryVisibleState,
} from '@/features/prompt-library/selectors/prompt-library-selectors'
import {
  type PromptImage,
  type PromptLibraryFilter,
  type PromptShareRecord,
} from '@/features/prompt-library/types'
import { setThemePreference } from '@/lib/theme'
import { cn } from '@/lib/utils'

export function PromptLibraryApp() {
  return (
    <PromptLibraryProvider>
      <PromptLibraryScreen />
    </PromptLibraryProvider>
  )
}

/** On narrow screens only one column shows at a time. */
type MobilePane = 'list' | 'reader'

function PromptLibraryScreen() {
  const prompts = usePromptLibraryStore((state) => state.prompts)
  const filter = usePromptLibraryStore((state) => state.filter)
  const sort = usePromptLibraryStore((state) => state.sort)
  const query = usePromptLibraryStore((state) => state.query)
  const selectedPromptId = usePromptLibraryStore((state) => state.selectedPromptId)
  const composer = usePromptLibraryStore((state) => state.composer)
  const confirmDeleteId = usePromptLibraryStore((state) => state.confirmDeleteId)
  const hasHydrated = usePromptLibraryStore((state) => state.hasHydrated)
  const isFirstSignInCopyOpen = usePromptLibraryStore(
    (state) => state.firstSignInCopy.status !== 'idle',
  )
  const syncMode = usePromptLibraryStore((state) => state.syncMode)
  const syncStatus = usePromptLibraryStore((state) => state.syncStatus)
  const actions = usePromptLibraryStore((state) => state.actions)
  const library = usePromptLibraryClient()
  const { isSignedIn } = useAuth()
  const { searchInputRef, titleInputRef } = usePromptLibraryMeta()

  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [isCaptureOpen, setIsCaptureOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [mobilePane, setMobilePane] = useState<MobilePane>('list')
  const [activePromptShare, setActivePromptShare] = useState<PromptShareRecord | null>(null)
  const shareLookupVersionRef = useRef(0)

  const deferredQuery = useDeferredValue(query)
  const visibleState = selectPromptLibraryVisibleState({
    prompts,
    query: deferredQuery,
    selectedPromptId,
    filter,
    sort,
  })
  const catalogNumbers = getCatalogNumbers(prompts)
  const activePrompt = visibleState.activePrompt
  const activePromptId = activePrompt?.id ?? null
  const blanks = usePromptVariableValues(activePromptId)
  const knownModels = Array.from(
    new Set(prompts.flatMap((prompt) => prompt.runs.map((run) => run.model))),
  )

  const commands = usePromptLibraryCommands()

  const commandState: PromptLibraryCommandState = {
    canSharePrompts: library.canSharePrompts,
    composerMode: composer.mode,
    hasActivePrompt: Boolean(activePrompt),
  }

  const selectPrompt = (promptId: string) => {
    commands.selectPrompt(promptId)
    setMobilePane('reader')
  }

  const changeFilter = (nextFilter: PromptLibraryFilter) => {
    actions.setFilter(nextFilter)
    actions.clearQuery()
    setIsSidebarOpen(false)
    setMobilePane('list')
  }

  const copyActivePrompt = (request: { stepIndex?: number } = {}) =>
    commands.copyActivePrompt({ ...request, values: blanks.values })

  const sharePrompt = async () => {
    const share = await commands.shareActivePrompt()

    if (share && share.promptId === activePromptId) {
      shareLookupVersionRef.current += 1
      setActivePromptShare(share)
    }
  }

  const revokePromptShare = async () => {
    const result = await commands.revokeActivePromptShare()

    if (result && result.promptId === activePromptId) {
      shareLookupVersionRef.current += 1
      setActivePromptShare(null)
    }
  }

  const deleteDiscardedPromptImages = (images: PromptImage[]) => {
    const imageIds = Array.from(new Set(images.map((image) => image.id)))

    if (imageIds.length === 0) {
      return
    }

    void Promise.all(imageIds.map((imageId) => library.deletePromptImage(imageId))).then(
      (results) => {
        const failedResult = results.find((result) => result.status === 'failed')

        if (failedResult) {
          toast(`Couldn’t clean up an image — ${failedResult.message}`)
        }
      },
    )
  }

  const cancelComposer = () => {
    const discardedImages =
      composer.mode === 'new'
        ? composer.draft.images
        : composer.mode === 'edit'
          ? composer.draft.images.filter(
              (image) => !activePrompt?.images.some((saved) => saved.id === image.id),
            )
          : []

    actions.cancelComposer()
    deleteDiscardedPromptImages(discardedImages)
  }

  const startNew = () => {
    actions.startNew()
    setMobilePane('reader')
  }

  const startEdit = () => {
    commands.startEditActivePrompt()
    setMobilePane('reader')
  }

  const openCapture = () => {
    if (composer.mode !== 'view') {
      toast('Finish editing first — save or press Esc')
      return
    }

    setIsSidebarOpen(false)
    setIsCaptureOpen(true)
  }

  const capture = (input: Parameters<typeof commands.capturePrompt>[0]) => {
    const prompt = commands.capturePrompt(input)

    if (!prompt) {
      return false
    }

    // Make sure the new entry is visible in the list it lands in.
    if (filter.type !== 'all' && !matchesPromptFilter(prompt, filter)) {
      actions.setFilter({ type: 'all' })
    }

    actions.clearQuery()
    setMobilePane('reader')

    return true
  }

  const pasteImages = (request: PromptImagePasteRequest) => {
    if (!library.canUploadPromptImages) {
      toast('Sign in to attach images')
      return
    }

    const pendingUploads = request.files.flatMap((file) => {
      const contentType = file.type.toLowerCase()

      if (!isSupportedPromptImageContentType(contentType)) {
        toast(`That image type isn’t supported (${file.type || 'unknown'})`)
        return []
      }

      if (file.size > MAX_PROMPT_IMAGE_BYTES) {
        toast(`${sanitizePromptImageFileName(file.name)} is larger than 5 MB`)
        return []
      }

      const pendingId = crypto.randomUUID()
      const fileName = sanitizePromptImageFileName(file.name)

      return [
        { file, fileName, pendingMarkdown: createPendingPromptImageMarkdown(fileName, pendingId) },
      ]
    })

    if (pendingUploads.length === 0) {
      return
    }

    const pendingMarkdown = pendingUploads.map((upload) => upload.pendingMarkdown).join('\n\n')

    actions.updateDraft(
      'body',
      insertDraftBodyText(
        composer.draft.body,
        pendingMarkdown,
        request.selectionStart,
        request.selectionEnd,
      ),
    )
    toast(
      pendingUploads.length === 1
        ? `Uploading ${pendingUploads[0]?.fileName ?? 'image'}…`
        : `Uploading ${pendingUploads.length} images…`,
    )

    for (const pendingUpload of pendingUploads) {
      void uploadPastedImage(pendingUpload.file)
        .then((upload) => library.uploadPromptImage(upload))
        .then((result) => {
          if (result.status === 'failed') {
            actions.replaceDraftBodyText(pendingUpload.pendingMarkdown, '')
            toast(`Image upload failed — ${result.message}`)
            return
          }

          actions.addDraftImage(result.value)
          actions.replaceDraftBodyText(
            pendingUpload.pendingMarkdown,
            createPromptImageMarkdown(result.value),
          )
          toast(`Attached ${result.value.fileName}`)
        })
        .catch((error: unknown) => {
          actions.replaceDraftBodyText(pendingUpload.pendingMarkdown, '')
          toast(`Image upload failed — ${error instanceof Error ? error.message : 'try again'}`)
        })
    }
  }

  const runCommand = (commandId: PromptLibraryCommandId) => {
    runPromptLibraryCommand(commandId, {
      commandState,
      capture: openCapture,
      togglePin: commands.togglePinActivePrompt,
      copyActivePrompt: () => copyActivePrompt(),
      deletePrompt: commands.deletePrompt,
      duplicatePrompt: commands.duplicatePrompt,
      focusSearch: () => {
        setMobilePane('list')
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      },
      selectNextPrompt: () => actions.selectPrompt(visibleState.getNextPromptId()),
      selectPreviousPrompt: () => actions.selectPrompt(visibleState.getPreviousPromptId()),
      shareActivePrompt: sharePrompt,
      startEditActivePrompt: startEdit,
      startNewPrompt: startNew,
    })
  }

  // Keep the store's selection pointing at something that exists.
  useEffect(() => {
    if (!hasHydrated) {
      return
    }

    if (selectedPromptId && prompts.some((prompt) => prompt.id === selectedPromptId)) {
      return
    }

    actions.selectPrompt(prompts[0]?.id ?? null)
  }, [actions, hasHydrated, prompts, selectedPromptId])

  useEffect(() => {
    if (composer.mode === 'view') {
      return
    }

    const frame = window.requestAnimationFrame(() => titleInputRef.current?.focus())

    return () => window.cancelAnimationFrame(frame)
  }, [composer.mode, titleInputRef])

  useEffect(() => {
    if (!confirmDeleteId) {
      return
    }

    const timeout = window.setTimeout(() => actions.clearDeleteConfirmation(), 3000)

    return () => window.clearTimeout(timeout)
  }, [actions, confirmDeleteId])

  // Follow keyboard selection in the list: keep it in view, and move focus along.
  useEffect(() => {
    if (!activePromptId) {
      return
    }

    const item = document.querySelector<HTMLElement>(
      `[data-prompt-id="${CSS.escape(activePromptId)}"]`,
    )

    item?.scrollIntoView({ block: 'nearest' })

    if (document.activeElement?.closest('[data-prompt-list]') && document.activeElement !== item) {
      item?.focus({ preventScroll: true })
    }
  }, [activePromptId])

  useEffect(() => {
    let ignore = false
    const lookupVersion = shareLookupVersionRef.current + 1
    shareLookupVersionRef.current = lookupVersion

    if (!library.canSharePrompts || !activePromptId) {
      return
    }

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

  usePromptLibraryHotkeys({
    commandState,
    composerMode: composer.mode,
    isOverlayOpen: isPaletteOpen || isCaptureOpen || isHelpOpen || isFirstSignInCopyOpen,
    isHelpOpen,
    onCancelComposer: cancelComposer,
    onRunCommand: runCommand,
    onSaveComposer: commands.saveComposer,
    onToggleHelp: () => setIsHelpOpen((open) => !open),
    onTogglePalette: () => {
      setIsCaptureOpen(false)
      setIsHelpOpen(false)
      setIsPaletteOpen((open) => !open)
    },
  })

  const paletteActions: PaletteAction[] = [
    ...(
      [
        ['capture', <Plus aria-hidden="true" key="i" />],
        ['new-prompt', <SquarePen aria-hidden="true" key="i" />],
        ['copy-prompt-body', <Clipboard aria-hidden="true" key="i" />],
        ['edit-prompt', <Pencil aria-hidden="true" key="i" />],
        ['toggle-pin', <Pin aria-hidden="true" key="i" />],
        ['duplicate-prompt', <CopyPlus aria-hidden="true" key="i" />],
        ['share-prompt', <Link2 aria-hidden="true" key="i" />],
        ['delete-prompt', <Trash2 aria-hidden="true" key="i" />],
      ] as const
    ).map(([commandId, icon]) => {
      const command = getPromptLibraryCommand(commandId)

      return {
        id: commandId,
        label: command.label,
        keys: command.keys,
        icon,
        disabled: !canRunPromptLibraryCommand(commandId, commandState),
        run: () => runCommand(commandId),
      }
    }),
    {
      id: 'keys',
      label: 'Keyboard shortcuts',
      keys: ['?'],
      icon: <Keyboard aria-hidden="true" />,
      run: () => setIsHelpOpen(true),
    },
    ...(isSignedIn
      ? []
      : [
          {
            id: 'sign-in',
            label: 'Sign in to sync across devices',
            icon: <LogIn aria-hidden="true" />,
            run: () => window.location.assign('/sign-in'),
          },
        ]),
  ]

  const isLoading = !hasHydrated
  const showsEditor = composer.mode !== 'view'

  return (
    <div className="relative z-10 flex h-dvh overflow-hidden text-ink">
      <h1 className="sr-only">promptrc — your commonplace book for working with AI</h1>

      {/* Sidebar: a fixed column on large screens, a drawer below that. */}
      <button
        aria-label="Close library navigation"
        className={cn(
          'fixed inset-0 z-40 bg-[color-mix(in_oklab,var(--ink)_30%,transparent)] backdrop-blur-[2px] transition-opacity lg:hidden',
          isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setIsSidebarOpen(false)}
        tabIndex={-1}
        type="button"
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[272px] border-r border-rule bg-paper transition-transform duration-300 ease-out-quint lg:static lg:z-auto lg:w-[248px] lg:shrink-0 lg:translate-x-0 lg:bg-transparent',
          isSidebarOpen ? 'translate-x-0 shadow-float' : '-translate-x-full',
        )}
      >
        <LibrarySidebar
          facets={visibleState.facets}
          filter={filter}
          onCapture={openCapture}
          onFilterChange={changeFilter}
          onOpenHelp={() => setIsHelpOpen(true)}
          onOpenPalette={() => {
            setIsSidebarOpen(false)
            setIsPaletteOpen(true)
          }}
          syncMode={syncMode}
          syncStatus={syncStatus}
        />
      </aside>

      <div
        className={cn(
          'w-full min-w-0 border-rule md:w-[340px] md:shrink-0 md:border-r xl:w-[380px]',
          mobilePane === 'reader' && 'hidden md:block',
        )}
      >
        <PromptList
          activePromptId={activePromptId}
          catalogNumbers={catalogNumbers}
          emptyReason={visibleState.emptyReason}
          filter={filter}
          isLoading={isLoading}
          onCapture={openCapture}
          onClearFilter={() => changeFilter({ type: 'all' })}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onQueryChange={actions.setQuery}
          onSelect={selectPrompt}
          onSortChange={actions.setSort}
          prompts={visibleState.filteredPrompts}
          query={query}
          searchInputRef={searchInputRef}
          sort={sort}
          totalCount={prompts.length}
        />
      </div>

      <main
        aria-label="Entry"
        className={cn(
          'relative min-w-0 flex-1 bg-paper-raised/40 dark:bg-paper-raised/25',
          mobilePane === 'list' && 'hidden md:block',
        )}
      >
        {showsEditor ? (
          <PromptEditor
            catalogNumber={activePromptId ? catalogNumbers.get(activePromptId) : undefined}
            categories={visibleState.categories}
            composer={composer}
            // Fresh editor state for every editing session.
            key={composer.mode === 'new' ? 'new' : `edit-${selectedPromptId ?? ''}`}
            onCancel={() => {
              cancelComposer()
              if (composer.mode === 'new') {
                setMobilePane('list')
              }
            }}
            onDraftChange={actions.updateDraft}
            onPasteImages={pasteImages}
            onSave={commands.saveComposer}
            titleInputRef={titleInputRef}
          />
        ) : activePrompt ? (
          <PromptReader
            canSharePrompts={library.canSharePrompts}
            catalogNumber={catalogNumbers.get(activePrompt.id)}
            hasActivePromptShare={activePromptShare?.promptId === activePromptId}
            isConfirmingDelete={confirmDeleteId === activePrompt.id}
            knownModels={knownModels}
            onBack={() => setMobilePane('list')}
            onCopy={copyActivePrompt}
            onDelete={commands.deletePrompt}
            onDuplicate={commands.duplicatePrompt}
            onEdit={startEdit}
            onLogRun={commands.logRunForActivePrompt}
            onRemoveRun={commands.removeRunFromActivePrompt}
            onResetVariables={blanks.reset}
            onRevokeShare={revokePromptShare}
            onSelectCategory={(category) => changeFilter({ type: 'category', category })}
            onSelectTag={(tag) => changeFilter({ type: 'tag', tag })}
            onShare={sharePrompt}
            onTogglePin={commands.togglePinActivePrompt}
            onVariableChange={blanks.setValue}
            prompt={activePrompt}
            variableValues={blanks.values}
          />
        ) : isLoading ? null : (
          <ReaderPlaceholder onCapture={openCapture} />
        )}
      </main>

      <QuickCaptureDialog
        defaultCategory={filter.type === 'category' ? filter.category : ''}
        defaultKind={filter.type === 'kind' ? filter.kind : DEFAULT_PROMPT_KIND}
        defaultTags={filter.type === 'tag' ? `#${filter.tag}` : ''}
        onCapture={capture}
        onOpenChange={setIsCaptureOpen}
        open={isCaptureOpen}
      />
      <CommandPalette
        actions={paletteActions}
        catalogNumbers={catalogNumbers}
        facets={visibleState.facets}
        onFilter={changeFilter}
        onOpenChange={setIsPaletteOpen}
        onSelectPrompt={(promptId) => {
          if (composer.mode !== 'view') {
            toast('Finish editing first — save or press Esc')
            return
          }

          if (!visibleState.orderedPromptIds.includes(promptId)) {
            actions.setFilter({ type: 'all' })
            actions.clearQuery()
          }

          selectPrompt(promptId)
        }}
        onTheme={setThemePreference}
        open={isPaletteOpen}
        prompts={prompts}
      />
      <KeyboardSheet onOpenChange={setIsHelpOpen} open={isHelpOpen} />
      <FirstSignInCopyDialog />
    </div>
  )
}

function insertDraftBodyText(
  body: string,
  text: string,
  selectionStart: number,
  selectionEnd: number,
) {
  const beforeSelection = body.slice(0, selectionStart)
  const afterSelection = body.slice(selectionEnd)
  const leadingBreak = beforeSelection && !beforeSelection.endsWith('\n') ? '\n\n' : ''
  const trailingBreak = afterSelection && !afterSelection.startsWith('\n') ? '\n\n' : ''

  return `${beforeSelection}${leadingBreak}${text}${trailingBreak}${afterSelection}`
}

async function uploadPastedImage(file: File) {
  const dataBase64 = await fileToBase64(file)

  return {
    fileName: sanitizePromptImageFileName(file.name),
    contentType: file.type.toLowerCase(),
    dataBase64,
  }
}

async function fileToBase64(file: File) {
  const buffer = new Uint8Array(await file.arrayBuffer())
  let binary = ''

  for (let index = 0; index < buffer.length; index += 0x8000) {
    binary += String.fromCharCode(...buffer.subarray(index, index + 0x8000))
  }

  return btoa(binary)
}
