import { type ComposerMode } from '@/features/prompt-library/types'

export type PromptLibraryCommandId =
  | 'copy-prompt-body'
  | 'delete-prompt'
  | 'duplicate-prompt'
  | 'edit-prompt'
  | 'focus-search'
  | 'new-prompt'
  | 'next-prompt'
  | 'previous-prompt'

type PromptLibraryCommand = {
  disabledWhileComposing?: boolean
  group: 'edit' | 'navigate'
  keys: string[]
  label: string
  requiresPrompt?: boolean
}

export type PromptLibraryCommandState = {
  composerMode: ComposerMode
  hasActivePrompt: boolean
}

export const PROMPT_LIBRARY_COMMANDS: Record<PromptLibraryCommandId, PromptLibraryCommand> = {
  'copy-prompt-body': {
    disabledWhileComposing: true,
    group: 'edit',
    keys: ['Cmd', 'C'],
    label: 'copy Prompt Body',
    requiresPrompt: true,
  },
  'delete-prompt': {
    disabledWhileComposing: true,
    group: 'edit',
    keys: ['x'],
    label: 'delete',
    requiresPrompt: true,
  },
  'duplicate-prompt': {
    disabledWhileComposing: true,
    group: 'edit',
    keys: ['d'],
    label: 'duplicate',
    requiresPrompt: true,
  },
  'edit-prompt': {
    disabledWhileComposing: true,
    group: 'edit',
    keys: ['e'],
    label: 'edit selected',
    requiresPrompt: true,
  },
  'focus-search': {
    disabledWhileComposing: true,
    group: 'navigate',
    keys: ['/'],
    label: 'focus search',
  },
  'new-prompt': {
    disabledWhileComposing: true,
    group: 'edit',
    keys: ['n'],
    label: 'new Prompt',
  },
  'next-prompt': {
    disabledWhileComposing: true,
    group: 'navigate',
    keys: ['j'],
    label: 'next Prompt',
    requiresPrompt: true,
  },
  'previous-prompt': {
    disabledWhileComposing: true,
    group: 'navigate',
    keys: ['k'],
    label: 'previous Prompt',
    requiresPrompt: true,
  },
}

export const PROMPT_LIBRARY_SHORTCUT_COMMAND_IDS = [
  'new-prompt',
  'focus-search',
  'next-prompt',
  'previous-prompt',
  'edit-prompt',
  'duplicate-prompt',
  'copy-prompt-body',
  'delete-prompt',
] satisfies PromptLibraryCommandId[]

export const PROMPT_LIBRARY_HELP_GROUPS = [
  {
    heading: 'navigate',
    commandIds: ['next-prompt', 'previous-prompt', 'focus-search'],
  },
  {
    heading: 'edit',
    commandIds: [
      'new-prompt',
      'edit-prompt',
      'duplicate-prompt',
      'copy-prompt-body',
      'delete-prompt',
    ],
  },
  {
    heading: 'meta',
    rows: [
      { keys: ['?'], label: 'toggle this help' },
      { keys: ['esc'], label: 'cancel or dismiss' },
    ],
  },
] as const

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

  return true
}

export const getPromptLibraryCommand = (commandId: PromptLibraryCommandId) => {
  return PROMPT_LIBRARY_COMMANDS[commandId]
}
