import { type ComposerMode } from '@/features/prompt-library/types'

export type PromptLibraryCommandId =
  | 'capture'
  | 'copy-prompt-body'
  | 'delete-prompt'
  | 'duplicate-prompt'
  | 'edit-prompt'
  | 'focus-search'
  | 'new-prompt'
  | 'next-prompt'
  | 'previous-prompt'
  | 'share-prompt'
  | 'toggle-pin'
  | 'toggle-view'

type PromptLibraryCommand = {
  disabledWhileComposing?: boolean
  group: 'capture' | 'edit' | 'navigate'
  keys: string[]
  label: string
  requiresCloud?: boolean
  requiresPrompt?: boolean
}

export type PromptLibraryCommandState = {
  canSharePrompts: boolean
  composerMode: ComposerMode
  hasActivePrompt: boolean
}

export const PROMPT_LIBRARY_COMMANDS: Record<PromptLibraryCommandId, PromptLibraryCommand> = {
  capture: {
    disabledWhileComposing: true,
    group: 'capture',
    keys: ['c'],
    label: 'Quick capture',
  },
  'new-prompt': {
    disabledWhileComposing: true,
    group: 'capture',
    keys: ['n'],
    label: 'New, in the full editor',
  },
  'copy-prompt-body': {
    disabledWhileComposing: true,
    group: 'edit',
    keys: ['y'],
    label: 'Yank (copy) Prompt Body',
    requiresPrompt: true,
  },
  'edit-prompt': {
    disabledWhileComposing: true,
    group: 'edit',
    keys: ['e'],
    label: 'Edit',
    requiresPrompt: true,
  },
  'toggle-pin': {
    disabledWhileComposing: true,
    group: 'edit',
    keys: ['p'],
    label: 'Pin or unpin',
    requiresPrompt: true,
  },
  'duplicate-prompt': {
    disabledWhileComposing: true,
    group: 'edit',
    keys: ['d'],
    label: 'Duplicate',
    requiresPrompt: true,
  },
  'share-prompt': {
    disabledWhileComposing: true,
    group: 'edit',
    keys: ['s'],
    label: 'Copy share link',
    requiresCloud: true,
    requiresPrompt: true,
  },
  'delete-prompt': {
    disabledWhileComposing: true,
    group: 'edit',
    keys: ['x'],
    label: 'Delete (press twice)',
    requiresPrompt: true,
  },
  'toggle-view': {
    disabledWhileComposing: true,
    group: 'navigate',
    keys: ['r'],
    label: 'Raw source / rendered',
    requiresPrompt: true,
  },
  'focus-search': {
    disabledWhileComposing: true,
    group: 'navigate',
    keys: ['/'],
    label: 'Filter the list',
  },
  'next-prompt': {
    disabledWhileComposing: true,
    group: 'navigate',
    keys: ['j'],
    label: 'Next',
    requiresPrompt: true,
  },
  'previous-prompt': {
    disabledWhileComposing: true,
    group: 'navigate',
    keys: ['k'],
    label: 'Previous',
    requiresPrompt: true,
  },
}

/** Commands surfaced as buttons and in the command palette, in display order. */
export const PROMPT_LIBRARY_SHORTCUT_COMMAND_IDS = [
  'capture',
  'new-prompt',
  'copy-prompt-body',
  'edit-prompt',
  'toggle-pin',
  'duplicate-prompt',
  'share-prompt',
  'delete-prompt',
  'focus-search',
  'next-prompt',
  'previous-prompt',
  'toggle-view',
] satisfies PromptLibraryCommandId[]

export const PROMPT_LIBRARY_HELP_GROUPS = [
  {
    heading: 'Capture',
    commandIds: ['capture', 'new-prompt'],
  },
  {
    heading: 'Navigate',
    commandIds: ['next-prompt', 'previous-prompt', 'focus-search', 'toggle-view'],
    rows: [
      { keys: ['Mod', 'K'], label: 'Find anything' },
      { keys: [':'], label: 'Command line' },
      { keys: ['1', '2', '3'], label: 'Focus a pane' },
    ],
  },
  {
    heading: 'Act on the selection',
    commandIds: [
      'copy-prompt-body',
      'edit-prompt',
      'toggle-pin',
      'duplicate-prompt',
      'share-prompt',
      'delete-prompt',
    ],
    rows: [{ keys: ['Mod', 'C'], label: 'Copy, with nothing selected' }],
  },
  {
    heading: 'While editing',
    commandIds: [],
    rows: [
      { keys: ['Mod', 'Enter'], label: 'Save' },
      { keys: ['Esc'], label: 'Cancel' },
    ],
  },
  {
    heading: 'Anywhere',
    commandIds: [],
    rows: [
      { keys: ['?'], label: 'Show this sheet' },
      { keys: ['Esc'], label: 'Dismiss' },
    ],
  },
] as const satisfies ReadonlyArray<{
  heading: string
  commandIds: readonly PromptLibraryCommandId[]
  rows?: ReadonlyArray<{ keys: readonly string[]; label: string }>
}>

export const canRunPromptLibraryCommand = (
  commandId: PromptLibraryCommandId,
  state: PromptLibraryCommandState,
) => {
  const command = PROMPT_LIBRARY_COMMANDS[commandId]

  if (command.disabledWhileComposing && state.composerMode !== 'view') {
    return false
  }

  if (command.requiresPrompt && !state.hasActivePrompt) {
    return false
  }

  if (command.requiresCloud && !state.canSharePrompts) {
    return false
  }

  return true
}

export const getPromptLibraryCommand = (commandId: PromptLibraryCommandId) => {
  return PROMPT_LIBRARY_COMMANDS[commandId]
}
