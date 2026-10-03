import { useAuth } from '@clerk/tanstack-react-start'
import { useDeferredValue, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { KeyCombo } from '@/components/ui/kbd'
import { runPromptLibraryCommand } from '@/features/prompt-library/commands/prompt-library-command-router'
import {
  type PromptLibraryCommandId,
  type PromptLibraryCommandState,
  canRunPromptLibraryCommand,
  getPromptLibraryCommand,
} from '@/features/prompt-library/commands/prompt-library-command-surface'
import {
  type ExAction,
  type PromptViewMode,
  parseExCommand,
} from '@/features/prompt-library/commands/prompt-library-ex-commands'
import { CommandLine } from '@/features/prompt-library/components/command-line'
import { type FinderAction, Finder } from '@/features/prompt-library/components/finder'
import { FirstSignInCopyDialog } from '@/features/prompt-library/components/first-sign-in-copy-dialog'
import { LibraryPane, Wordmark } from '@/features/prompt-library/components/library-pane'
import { Manual } from '@/features/prompt-library/components/manual'
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
import { type ScreenMode, StatusLine } from '@/features/prompt-library/components/status-line'
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
  findNearProject,
  findProject,
  suggestProjects,
} from '@/features/prompt-library/model/prompt-projects'
import { splitSequenceSteps } from '@/features/prompt-library/model/prompt-sequences'
import { extractFillablePromptVariables } from '@/features/prompt-library/model/prompt-templates'
import {
  EMPTY_PROMPT_LIBRARY_FILTER,
  getCatalogNumbers,
  getFilterShowingPrompt,
  isPromptLibraryFilterEmpty,
  isSamePromptLibraryFilter,
  selectPromptLibraryVisibleState,
} from '@/features/prompt-library/selectors/prompt-library-selectors'
import {
  type PromptImage,
  type PromptLibraryFilter,
  type PromptShareRecord,
} from '@/features/prompt-library/types'
import { echo } from '@/lib/echo'
import { setColorSchemePreference } from '@/lib/theme'
import { cn } from '@/lib/utils'

export function PromptLibraryApp() {
  return (
    <PromptLibraryProvider>
      <PromptLibraryScreen />
    </PromptLibraryProvider>
  )
}

/** 1 library · 2 list · 3 entry. Narrow screens show one pane at a time. */
type PaneId = 1 | 2 | 3

const PANE_LABELS: Record<PaneId, string> = { 1: 'library', 2: 'list', 3: 'entry' }

const FINDER_COMMAND_IDS = [
  'capture',
  'new-prompt',
  'copy-prompt-body',
  'edit-prompt',
  'toggle-pin',
  'toggle-view',
  'duplicate-prompt',
  'share-prompt',
  'delete-prompt',
] as const satisfies readonly PromptLibraryCommandId[]

/** Matches a typed tag to its facet key, ignoring case. */
const findFacetKey = (facets: ReadonlyArray<{ key: string; label: string }>, wanted: string) => {
  const lower = wanted.toLowerCase().replace(/\/$/, '')

  return (
    facets.find((facet) => facet.key.toLowerCase() === lower || facet.label.toLowerCase() === lower)
      ?.key ?? null
  )
}

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
  const [finder, setFinder] = useState<{ open: boolean; query: string }>({ open: false, query: '' })
  const [isCaptureOpen, setIsCaptureOpen] = useState(false)
  const [isCommandLineOpen, setIsCommandLineOpen] = useState(false)
  const [activePane, setActivePane] = useState<PaneId>(2)
  const [viewMode, setViewMode] = useState<PromptViewMode>('rendered')
  const [activePromptShare, setActivePromptShare] = useState<PromptShareRecord | null>(null)
  const shareLookupVersionRef = useRef(0)
  const commandLineReturnFocusRef = useRef<HTMLElement | null>(null)

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
  const blankVariables = activePrompt ? extractFillablePromptVariables(activePrompt.body) : []
  const knownModels = Array.from(
    new Set(prompts.flatMap((prompt) => prompt.runs.map((run) => run.model))),
  )

  const commands = usePromptLibraryCommands()

  const commandState: PromptLibraryCommandState = {
    canSharePrompts: library.canSharePrompts,
    composerMode: composer.mode,
    hasActivePrompt: Boolean(activePrompt),
  }

  const isEditing = composer.mode !== 'view'
  const mode: ScreenMode = isCommandLineOpen
    ? 'COMMAND'
    : finder.open
      ? 'FIND'
      : isCaptureOpen
        ? 'CAPTURE'
        : isHelpOpen
          ? 'HELP'
          : isEditing
            ? 'INSERT'
            : 'NORMAL'

  /** Show a pane (on narrow screens) and move keyboard focus into it. */
  const focusPane = (pane: PaneId) => {
    setActivePane(pane)

    window.requestAnimationFrame(() => {
      const root = document.querySelector<HTMLElement>(`[data-pane="${pane}"]`)
      const active = document.activeElement

      // Something else took the keyboard in the meantime (the command line, a field).
      if (
        (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) &&
        !root?.contains(active)
      ) {
        return
      }

      const target =
        (pane === 2 && activePromptId
          ? root?.querySelector<HTMLElement>(`[data-prompt-id="${CSS.escape(activePromptId)}"]`)
          : null) ??
        (pane === 3 && isEditing ? titleInputRef.current : null) ??
        root?.querySelector<HTMLElement>('[data-pane-focus]')

      target?.focus({ preventScroll: pane !== 2 })
    })
  }

  const selectPrompt = (promptId: string) => {
    commands.selectPrompt(promptId)
    setActivePane(3)
  }

  /** Changes some parts of the filter; the rest stay. Moving Project clears the grep. */
  const changeFilter = (patch: Partial<PromptLibraryFilter>) => {
    actions.setFilter({ ...filter, ...patch })

    if ('project' in patch && !isSamePromptLibraryFilter({ ...filter, ...patch }, filter)) {
      actions.clearQuery()
    }

    setActivePane(2)
  }

  const resetFilter = () => {
    actions.setFilter(EMPTY_PROMPT_LIBRARY_FILTER)
    actions.clearQuery()
    setActivePane(2)
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
          echo(`Couldn’t clean up an image — ${failedResult.message}`)
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

  const startNew = (kind?: Parameters<typeof actions.startNew>[0]) => {
    if (isEditing) {
      echo('E37: No write since last change (save with :w or discard with :q!)')
      return
    }

    actions.startNew(kind)
    setActivePane(3)
  }

  const startEdit = () => {
    commands.startEditActivePrompt()
    setActivePane(3)
  }

  const openCapture = () => {
    if (isEditing) {
      echo('Finish editing first — :w to save or :q! to discard')
      return
    }

    setIsCaptureOpen(true)
  }

  const openFinder = (initialQuery = '') => {
    setIsCaptureOpen(false)
    setIsHelpOpen(false)
    setIsCommandLineOpen(false)
    setFinder({ open: true, query: initialQuery })
  }

  const openCommandLine = () => {
    commandLineReturnFocusRef.current =
      document.activeElement instanceof HTMLElement && document.activeElement !== document.body
        ? document.activeElement
        : null
    setIsCommandLineOpen(true)
  }

  const closeCommandLine = () => {
    setIsCommandLineOpen(false)

    const returnFocus = commandLineReturnFocusRef.current
    commandLineReturnFocusRef.current = null

    if (returnFocus?.isConnected) {
      returnFocus.focus({ preventScroll: true })
    }
  }

  const capture = (input: Parameters<typeof commands.capturePrompt>[0]) => {
    const prompt = commands.capturePrompt(input)

    if (!prompt) {
      return false
    }

    // Make sure the new entry is visible in the list it lands in.
    actions.setFilter(getFilterShowingPrompt(prompt, filter))

    actions.clearQuery()
    setActivePane(3)

    return true
  }

  const pasteImages = (request: PromptImagePasteRequest) => {
    if (!library.canUploadPromptImages) {
      echo('Sign in to attach images')
      return
    }

    const pendingUploads = request.files.flatMap((file) => {
      const contentType = file.type.toLowerCase()

      if (!isSupportedPromptImageContentType(contentType)) {
        echo(`That image type isn’t supported (${file.type || 'unknown'})`)
        return []
      }

      if (file.size > MAX_PROMPT_IMAGE_BYTES) {
        echo(`${sanitizePromptImageFileName(file.name)} is too large (5 MB max)`)
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
    echo(
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
            echo(`Image upload failed — ${result.message}`)
            return
          }

          actions.addDraftImage(result.value)
          actions.replaceDraftBodyText(
            pendingUpload.pendingMarkdown,
            createPromptImageMarkdown(result.value),
          )
          echo(`Attached ${result.value.fileName}`, 'ok')
        })
        .catch((error: unknown) => {
          actions.replaceDraftBodyText(pendingUpload.pendingMarkdown, '')
          echo(`Image upload failed — ${error instanceof Error ? error.message : 'try again'}`)
        })
    }
  }

  const toggleViewMode = () => setViewMode((current) => (current === 'raw' ? 'rendered' : 'raw'))

  const runCommand = (commandId: PromptLibraryCommandId) => {
    runPromptLibraryCommand(commandId, {
      commandState,
      capture: openCapture,
      togglePin: commands.togglePinActivePrompt,
      toggleView: toggleViewMode,
      copyActivePrompt: () => copyActivePrompt(),
      deletePrompt: commands.deletePrompt,
      duplicatePrompt: commands.duplicatePrompt,
      focusSearch: () => {
        setActivePane(2)
        window.requestAnimationFrame(() => {
          searchInputRef.current?.focus()
          searchInputRef.current?.select()
        })
      },
      selectNextPrompt: () => actions.selectPrompt(visibleState.getNextPromptId()),
      selectPreviousPrompt: () => actions.selectPrompt(visibleState.getPreviousPromptId()),
      shareActivePrompt: sharePrompt,
      startEditActivePrompt: startEdit,
      startNewPrompt: () => startNew(),
    })
  }

  /** Runs a command only when it applies right now; otherwise says why, vim-style. */
  const runIfAvailable = (commandId: PromptLibraryCommandId) => {
    if (canRunPromptLibraryCommand(commandId, commandState)) {
      runCommand(commandId)
      return
    }

    const command = getPromptLibraryCommand(commandId)

    if (command.disabledWhileComposing && isEditing) {
      echo('E37: No write since last change (save with :w or discard with :q!)')
    } else if (command.requiresCloud && !library.canSharePrompts) {
      echo('Sharing needs an account — :login to sync')
    } else {
      echo('E32: No entry selected')
    }
  }

  const runExAction = (action: ExAction) => {
    switch (action.type) {
      case 'capture':
        openCapture()
        return
      case 'new':
        startNew(action.kind)
        return
      case 'edit':
        runIfAvailable('edit-prompt')
        return
      case 'write':
        if (!isEditing) {
          echo(activePrompt ? `"${activePrompt.title}" already written` : 'E32: No file name')
          return
        }

        commands.saveComposer()
        return
      case 'quit':
        if (isEditing) {
          cancelComposer()
          echo(composer.mode === 'new' ? 'Discarded the new entry' : 'Discarded changes')
          return
        }

        if (!isPromptLibraryFilterEmpty(filter) || query) {
          resetFilter()
          return
        }

        echo('There is no quitting promptrc. Close the tab if you must.')
        return
      case 'pin':
        if (action.pinned === false && activePrompt && !activePrompt.pinned) {
          echo(`“${activePrompt.title}” isn’t pinned`)
          return
        }

        runIfAvailable('toggle-pin')
        return
      case 'duplicate':
        runIfAvailable('duplicate-prompt')
        return
      case 'share':
        runIfAvailable('share-prompt')
        return
      case 'unshare':
        if (!activePrompt) {
          echo('E32: No entry selected')
        } else if (activePromptShare?.promptId !== activePromptId) {
          echo(`“${activePrompt.title}” isn’t shared`)
        } else {
          void revokePromptShare()
        }
        return
      case 'delete':
        if (!canRunPromptLibraryCommand('delete-prompt', commandState)) {
          runIfAvailable('delete-prompt')
          return
        }

        commands.deletePrompt()

        // `:rm!` skips the second press.
        if (action.force) {
          commands.deletePrompt()
        }
        return
      case 'copy': {
        if (!activePrompt) {
          echo('E32: No entry selected')
          return
        }

        if (action.step === undefined) {
          void copyActivePrompt()
          return
        }

        const steps = activePrompt.kind === 'sequence' ? splitSequenceSteps(activePrompt.body) : []

        if (action.step > steps.length) {
          echo(
            steps.length === 0
              ? `E474: “${activePrompt.title}” has no steps`
              : `E474: Only ${steps.length} steps`,
          )
          return
        }

        void copyActivePrompt({ stepIndex: action.step - 1 })
        return
      }
      case 'find':
        openFinder(action.query)
        return
      case 'filter': {
        const patch = { ...action.patch }

        if (patch.project) {
          // An exact match, or the only Project the letters could mean ("rendr" → render-md).
          const matches = suggestProjects(patch.project, visibleState.facets.projects, 2)
          const project =
            findProject(patch.project, visibleState.facets.projects) ??
            (matches.length === 1 ? matches[0] : null)

          if (!project) {
            const near = findNearProject(patch.project, visibleState.facets.projects)

            echo(
              `E344: Can’t find project “${patch.project}”${near ? ` — did you mean ${near.label}?` : ''}`,
              'error',
            )
            return
          }

          patch.project = project.label
        }

        if (patch.tag) {
          const key = findFacetKey(visibleState.facets.tags, patch.tag)

          if (!key) {
            echo(`E486: Pattern not found: #${patch.tag}`)
            return
          }

          patch.tag = key
        }

        changeFilter(patch)
        return
      }
      case 'search':
        actions.setQuery(action.query)
        setActivePane(2)
        return
      case 'sort':
        actions.setSort(action.sort)
        return
      case 'colorscheme':
        setColorSchemePreference(action.scheme)
        echo(`colorscheme ${action.scheme}`, 'ok')
        return
      case 'view':
        setViewMode(action.mode)
        return
      case 'log-run':
        if (!activePrompt) {
          echo('E32: No entry selected')
        } else if (activePrompt.kind !== 'benchmark') {
          echo('Runs are logged on benchmarks — :new benchmark')
        } else {
          commands.logRunForActivePrompt({
            model: action.model,
            verdict: action.verdict,
            note: action.note,
          })
        }
        return
      case 'help':
        setIsHelpOpen(true)
        return
      case 'login':
        if (isSignedIn) {
          echo('Already signed in — syncing to the cloud', 'ok')
        } else {
          window.location.assign('/sign-in')
        }
        return
    }
  }

  const submitCommandLine = (input: string) => {
    const result = parseExCommand(input)

    if (!result.ok) {
      echo(result.error, 'error')
      return
    }

    runExAction(result.action)
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

  // The focused pane is the active one: it lights up in the tab bar.
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const pane = (event.target as Element | null)?.closest?.('[data-pane]')
      const id = Number(pane?.getAttribute('data-pane'))

      if (id === 1 || id === 2 || id === 3) {
        setActivePane(id)
      }
    }

    document.addEventListener('focusin', onFocusIn)

    return () => document.removeEventListener('focusin', onFocusIn)
  }, [])

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
    isOverlayOpen:
      finder.open || isCaptureOpen || isHelpOpen || isCommandLineOpen || isFirstSignInCopyOpen,
    isHelpOpen,
    onCancelComposer: cancelComposer,
    onRunCommand: runCommand,
    onSaveComposer: commands.saveComposer,
    onToggleHelp: () => setIsHelpOpen((open) => !open),
    onTogglePalette: () => {
      if (finder.open) {
        setFinder({ open: false, query: '' })
      } else {
        openFinder()
      }
    },
    onOpenCommandLine: openCommandLine,
    onFocusPane: focusPane,
  })

  const finderActions: FinderAction[] = [
    ...FINDER_COMMAND_IDS.map((commandId) => {
      const command = getPromptLibraryCommand(commandId)

      return {
        id: commandId,
        label: command.label.toLowerCase(),
        keys: command.keys,
        disabled: !canRunPromptLibraryCommand(commandId, commandState),
        run: () => runCommand(commandId),
      }
    }),
    {
      id: 'command-line',
      label: 'command line',
      keys: [':'],
      detail: 'type any :command — :help lists them',
      run: openCommandLine,
    },
    {
      id: 'manual',
      label: 'manual',
      keys: ['?'],
      detail: 'man promptrc',
      run: () => setIsHelpOpen(true),
    },
    ...(isSignedIn
      ? []
      : [
          {
            id: 'login',
            label: 'login — sync across devices',
            detail: 'entries in this browser come with you',
            run: () => window.location.assign('/sign-in'),
          },
        ]),
  ]

  const isLoading = !hasHydrated
  const position = activePromptId ? visibleState.orderedPromptIds.indexOf(activePromptId) + 1 : 0

  return (
    <div className="relative z-10 flex h-dvh flex-col overflow-hidden px-1.5 pt-1 sm:px-2.5">
      <h1 className="sr-only">promptrc — a place for the prompts that worked</h1>

      <TabLine activePane={activePane} onFocusPane={focusPane} onOpenFinder={() => openFinder()} />

      <div className="relative grid min-h-0 flex-1 gap-x-2 pt-3 pb-1.5 md:grid-cols-[minmax(290px,350px)_minmax(0,1fr)] lg:grid-cols-[minmax(200px,236px)_minmax(290px,360px)_minmax(0,1fr)] xl:grid-cols-[250px_390px_minmax(0,1fr)]">
        {/* Library: a column on wide screens, a drawer on medium ones, a tab on phones. */}
        <button
          aria-label="Close library"
          className={cn(
            'fixed inset-0 z-30 hidden bg-black/50 lg:hidden',
            activePane === 1 && 'md:block',
          )}
          onClick={() => setActivePane(2)}
          tabIndex={-1}
          type="button"
        />
        <div
          className={cn(
            'min-h-0 min-w-0 lg:flex',
            activePane === 1
              ? 'flex md:fixed md:inset-y-10 md:left-3 md:z-40 md:w-[270px] md:animate-pop md:shadow-[0_20px_60px_rgb(0_0_0/0.5)] lg:static lg:z-auto lg:w-auto lg:animate-none lg:shadow-none'
              : 'hidden',
          )}
        >
          <LibraryPane
            className="flex-1"
            facets={visibleState.facets}
            filter={filter}
            onCapture={openCapture}
            onFilterChange={changeFilter}
            onOpenCommandLine={openCommandLine}
            onOpenFinder={() => openFinder()}
            onOpenHelp={() => setIsHelpOpen(true)}
            syncMode={syncMode}
            syncStatus={syncStatus}
          />
        </div>

        <div className={cn('min-h-0 min-w-0 md:flex', activePane === 2 ? 'flex' : 'hidden')}>
          <PromptList
            activePromptId={activePromptId}
            catalogNumbers={catalogNumbers}
            className="flex-1"
            emptyReason={visibleState.emptyReason}
            filter={filter}
            isLoading={isLoading}
            onCapture={openCapture}
            counts={visibleState.facets.here}
            onClearFilter={() =>
              filter.kind || filter.pinned || filter.tag
                ? changeFilter({ kind: null, pinned: false, tag: null })
                : changeFilter({ project: null })
            }
            onFilterChange={changeFilter}
            onOpenLibrary={() => focusPane(1)}
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
            'min-h-0 min-w-0 md:flex md:flex-col',
            activePane === 3 ? 'flex flex-col' : 'hidden',
          )}
        >
          {isEditing ? (
            <PromptEditor
              projects={visibleState.facets.projects}
              composer={composer}
              // Fresh editor state for every editing session.
              key={composer.mode === 'new' ? 'new' : `edit-${selectedPromptId ?? ''}`}
              onCancel={() => {
                cancelComposer()
                if (composer.mode === 'new') {
                  setActivePane(2)
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
              onBack={() => focusPane(2)}
              onCopy={copyActivePrompt}
              onDelete={commands.deletePrompt}
              onDuplicate={commands.duplicatePrompt}
              onEdit={startEdit}
              onLogRun={commands.logRunForActivePrompt}
              onRemoveRun={commands.removeRunFromActivePrompt}
              onResetVariables={blanks.reset}
              onRevokeShare={revokePromptShare}
              onSelectCategory={(category) => changeFilter({ project: category, tag: null })}
              onSelectTag={(tag) => changeFilter({ tag })}
              onShare={sharePrompt}
              onTogglePin={commands.togglePinActivePrompt}
              onVariableChange={blanks.setValue}
              onViewModeChange={setViewMode}
              prompt={activePrompt}
              variableValues={blanks.values}
              viewMode={viewMode}
            />
          ) : isLoading ? null : (
            <ReaderPlaceholder onCapture={openCapture} />
          )}
        </main>
      </div>

      <StatusLine
        blanks={{
          filled: blankVariables.filter((variable) => blanks.values[variable.name]?.trim()).length,
          total: blankVariables.length,
        }}
        filter={filter}
        isDirty={isEditing}
        mode={mode}
        position={position}
        prompt={composer.mode === 'new' ? null : activePrompt}
        query={query}
        syncMode={syncMode}
        syncStatus={syncStatus}
        total={visibleState.orderedPromptIds.length}
      />
      <CommandLine
        projects={visibleState.facets.projects.map((project) => project.label)}
        onClose={closeCommandLine}
        onOpen={openCommandLine}
        onSubmit={submitCommandLine}
        open={isCommandLineOpen}
        tags={visibleState.facets.tags.map((tag) => tag.label)}
      />

      <QuickCaptureDialog
        defaultCategory={filter.project ?? ''}
        defaultKind={filter.kind ?? DEFAULT_PROMPT_KIND}
        defaultTags={filter.tag ? `#${filter.tag}` : ''}
        projects={visibleState.facets.projects}
        onCapture={capture}
        onOpenChange={setIsCaptureOpen}
        open={isCaptureOpen}
      />
      <Finder
        actions={finderActions}
        catalogNumbers={catalogNumbers}
        facets={visibleState.facets}
        initialQuery={finder.query}
        onColorScheme={(scheme) => {
          setColorSchemePreference(scheme)
          echo(`colorscheme ${scheme}`, 'ok')
        }}
        onFilter={changeFilter}
        onOpenChange={(open) =>
          setFinder((current) => ({ open, query: open ? current.query : '' }))
        }
        onSelectPrompt={(promptId) => {
          if (isEditing) {
            echo('Finish editing first — :w to save or :q! to discard')
            return
          }

          if (!visibleState.orderedPromptIds.includes(promptId)) {
            actions.setFilter(EMPTY_PROMPT_LIBRARY_FILTER)
            actions.clearQuery()
          }

          selectPrompt(promptId)
        }}
        open={finder.open}
        prompts={prompts}
      />
      <Manual onOpenChange={setIsHelpOpen} open={isHelpOpen} />
      <FirstSignInCopyDialog />
    </div>
  )
}

const subscribeToMinute = (callback: () => void) => {
  const interval = window.setInterval(callback, 15_000)

  return () => window.clearInterval(interval)
}

const readClock = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

/** A tmux-style window list: the brand, the panes as windows, and a clock. */
function TabLine({
  activePane,
  onFocusPane,
  onOpenFinder,
}: {
  activePane: PaneId
  onFocusPane: (pane: PaneId) => void
  onOpenFinder: () => void
}) {
  const clock = useSyncExternalStore(subscribeToMinute, readClock, () => '')

  return (
    <nav aria-label="Panes" className="flex h-6 shrink-0 items-center gap-[2ch] text-[12px]">
      <Wordmark className="text-[13px]" />
      <ol className="flex items-center gap-[1ch]">
        {([1, 2, 3] as const).map((pane) => {
          const active = activePane === pane

          return (
            <li key={pane}>
              <button
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'rounded-sm px-[0.75ch] transition-colors',
                  active ? 'bg-bg-sel text-fg' : 'text-fg-faint hover:text-fg',
                )}
                onClick={() => onFocusPane(pane)}
                type="button"
              >
                <span className={active ? 'text-accent' : undefined}>{pane}</span>:
                {PANE_LABELS[pane]}
                {active ? <span className="text-accent">*</span> : null}
              </button>
            </li>
          )
        })}
      </ol>
      <button
        className="ml-auto hidden items-center gap-[1ch] text-fg-faint hover:text-fg sm:flex"
        onClick={onOpenFinder}
        type="button"
      >
        <span className="text-accent">❯</span> find <KeyCombo keys={['Mod', 'K']} />
      </button>
      <span className="text-fg-faint tabular-nums max-sm:ml-auto">{clock}</span>
    </nav>
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
