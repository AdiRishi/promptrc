import { PROMPT_KINDS, isPromptKind } from '@/features/prompt-library/model/prompt-kinds'
import { projectKey } from '@/features/prompt-library/model/prompt-projects'
import { isPromptRunVerdict } from '@/features/prompt-library/model/prompt-runs'
import {
  type PromptKind,
  type PromptLibraryFilter,
  type PromptLibrarySort,
  type PromptRunVerdict,
} from '@/features/prompt-library/types'
import { COLOR_SCHEMES, type ColorSchemePreference, isColorSchemeId } from '@/lib/theme'

/**
 * The `:` command line. Parsing is pure so it can be tested on its own; the
 * screen decides what each action does.
 */
export type ExAction =
  | { type: 'capture' }
  | { type: 'new'; kind?: PromptKind }
  | { type: 'edit' }
  | { type: 'write'; close: boolean }
  | { type: 'quit'; force: boolean }
  | { type: 'pin'; pinned?: boolean }
  | { type: 'duplicate' }
  | { type: 'share' }
  | { type: 'unshare' }
  | { type: 'delete'; force: boolean }
  | { type: 'copy'; step?: number }
  | { type: 'find'; query: string }
  /** Parts of the filter to change; the rest stay as they are. */
  | { type: 'filter'; patch: Partial<PromptLibraryFilter> }
  | { type: 'search'; query: string }
  | { type: 'sort'; sort: PromptLibrarySort }
  | { type: 'colorscheme'; scheme: ColorSchemePreference }
  | { type: 'view'; mode: PromptViewMode }
  | { type: 'log-run'; model: string; verdict: PromptRunVerdict; note: string }
  | { type: 'help' }
  | { type: 'login' }

export type PromptViewMode = 'rendered' | 'raw'

export type ExParseResult = { ok: true; action: ExAction } | { ok: false; error: string }

type ExCommandDefinition = {
  name: string
  aliases?: readonly string[]
  usage: string
  summary: string
  /** Values to complete for the first argument. */
  complete?: () => readonly string[]
}

const KIND_PLURALS: Record<string, PromptKind> = {
  prompts: 'prompt',
  fragments: 'fragment',
  sequences: 'sequence',
  benchmarks: 'benchmark',
}

const SORTS: Record<string, PromptLibrarySort> = {
  new: 'created',
  newest: 'created',
  created: 'created',
  used: 'used',
  uses: 'used',
  az: 'title',
  'a-z': 'title',
  title: 'title',
  name: 'title',
}

export const EX_COMMANDS: readonly ExCommandDefinition[] = [
  { name: 'capture', aliases: ['c'], usage: 'capture', summary: 'quick-capture something new' },
  {
    name: 'new',
    aliases: ['n', 'enew'],
    usage: 'new [kind]',
    summary: 'open the full editor',
    complete: () => PROMPT_KINDS,
  },
  { name: 'edit', aliases: ['e'], usage: 'edit', summary: 'edit the selected entry' },
  { name: 'write', aliases: ['w'], usage: 'w', summary: 'save the entry being edited' },
  { name: 'wq', aliases: ['x'], usage: 'wq', summary: 'save and close the editor' },
  { name: 'quit', aliases: ['q'], usage: 'q[!]', summary: 'close the editor, or clear the filter' },
  { name: 'pin', usage: 'pin', summary: 'pin or unpin the selected entry' },
  { name: 'unpin', usage: 'unpin', summary: 'unpin the selected entry' },
  { name: 'duplicate', aliases: ['dup'], usage: 'dup', summary: 'duplicate the selected entry' },
  { name: 'share', usage: 'share', summary: 'copy a public share link' },
  { name: 'unshare', usage: 'unshare', summary: 'revoke the share link' },
  {
    name: 'delete',
    aliases: ['rm', 'del'],
    usage: 'rm[!]',
    summary: 'delete the selected entry (! skips the confirm)',
  },
  {
    name: 'yank',
    aliases: ['y', 'copy'],
    usage: 'yank [step]',
    summary: 'copy the body, or one step of a sequence',
  },
  { name: 'find', aliases: ['f', 'fzf'], usage: 'find [words]', summary: 'fuzzy-find anything' },
  {
    name: 'kind',
    usage: 'kind <prompt|fragment|sequence|benchmark>',
    summary: 'show one kind here (no kind: any)',
    complete: () => PROMPT_KINDS,
  },
  { name: 'all', aliases: ['ls'], usage: 'all', summary: 'drop the kind, ★ and tag filters' },
  { name: 'pinned', usage: 'pinned', summary: 'only pinned entries' },
  {
    name: 'cd',
    aliases: ['project', 'category', 'cat'],
    usage: 'cd <project>',
    summary: 'go to a project (cd ~ for everything)',
  },
  { name: 'tag', usage: 'tag <tag>', summary: 'only entries with a tag (no tag: any)' },
  { name: 'grep', aliases: ['search'], usage: 'grep <words>', summary: 'filter the list' },
  {
    name: 'sort',
    usage: 'sort <new|used|az>',
    summary: 'order the list',
    complete: () => ['new', 'used', 'az'],
  },
  {
    name: 'colorscheme',
    aliases: ['colo', 'theme'],
    usage: 'colorscheme <name>',
    summary: 'switch colorscheme',
    complete: () => ['system', ...COLOR_SCHEMES.map((scheme) => scheme.id)],
  },
  { name: 'raw', usage: 'raw', summary: 'show the source with line numbers' },
  { name: 'rendered', aliases: ['glow'], usage: 'rendered', summary: 'show rendered markdown' },
  {
    name: 'log',
    usage: 'log <model> <pass|mixed|fail> [note]',
    summary: 'record a benchmark run',
  },
  { name: 'help', aliases: ['h', 'man'], usage: 'help', summary: 'the manual' },
  { name: 'login', usage: 'login', summary: 'sign in to sync' },
]

const findCommand = (word: string) =>
  EX_COMMANDS.find((command) => command.name === word || command.aliases?.includes(word))

export const parseExCommand = (input: string): ExParseResult => {
  const trimmed = input.trim().replace(/^:+/, '').trim()

  if (!trimmed) {
    return { ok: false, error: 'E471: Argument required' }
  }

  const match = /^(\S+?)(!?)(?:\s+([\s\S]*))?$/.exec(trimmed)
  const word = match?.[1]?.toLowerCase() ?? ''
  const bang = match?.[2] === '!'
  const rest = match?.[3]?.trim() ?? ''
  const [firstArg = '', ...otherArgs] = rest.split(/\s+/).filter(Boolean)
  const arg = firstArg.toLowerCase()

  // Bare numbers are not line jumps here; keep the vim error so it feels familiar.
  if (/^\d+$/.test(word)) {
    return { ok: false, error: 'E492: Not an editor command: line numbers do not apply here' }
  }

  // `:prompts`, `:sequences` … read naturally as filters.
  const pluralKind = KIND_PLURALS[word]

  if (pluralKind) {
    return { ok: true, action: { type: 'filter', patch: { kind: pluralKind } } }
  }

  const command = findCommand(word)

  if (!command) {
    return { ok: false, error: `E492: Not an editor command: ${trimmed}` }
  }

  switch (command.name) {
    case 'capture':
      return { ok: true, action: { type: 'capture' } }
    case 'new': {
      if (!arg) {
        return { ok: true, action: { type: 'new' } }
      }

      const kind = KIND_PLURALS[arg] ?? arg

      return isPromptKind(kind)
        ? { ok: true, action: { type: 'new', kind } }
        : { ok: false, error: `E475: Invalid kind: ${firstArg}` }
    }
    case 'edit':
      return { ok: true, action: { type: 'edit' } }
    case 'write':
      return { ok: true, action: { type: 'write', close: false } }
    case 'wq':
      return { ok: true, action: { type: 'write', close: true } }
    case 'quit':
      return { ok: true, action: { type: 'quit', force: bang } }
    case 'pin':
      return { ok: true, action: { type: 'pin' } }
    case 'unpin':
      return { ok: true, action: { type: 'pin', pinned: false } }
    case 'duplicate':
      return { ok: true, action: { type: 'duplicate' } }
    case 'share':
      return { ok: true, action: { type: 'share' } }
    case 'unshare':
      return { ok: true, action: { type: 'unshare' } }
    case 'delete':
      return { ok: true, action: { type: 'delete', force: bang } }
    case 'yank': {
      if (!arg) {
        return { ok: true, action: { type: 'copy' } }
      }

      const step = Number.parseInt(arg.replace(/^step/, ''), 10)

      return Number.isInteger(step) && step > 0
        ? { ok: true, action: { type: 'copy', step } }
        : { ok: false, error: `E474: Invalid step: ${firstArg}` }
    }
    case 'find':
      return { ok: true, action: { type: 'find', query: rest } }
    case 'kind': {
      if (!arg || arg === 'all' || arg === 'any') {
        return { ok: true, action: { type: 'filter', patch: { kind: null } } }
      }

      const kind = KIND_PLURALS[arg] ?? arg

      return isPromptKind(kind)
        ? { ok: true, action: { type: 'filter', patch: { kind } } }
        : { ok: false, error: `E475: Invalid kind: ${firstArg}` }
    }
    case 'all':
      return {
        ok: true,
        action: { type: 'filter', patch: { kind: null, pinned: false, tag: null } },
      }
    case 'pinned':
      return { ok: true, action: { type: 'filter', patch: { pinned: true } } }
    case 'cd':
      // `:cd`, `:cd ~`, `:cd ..` and `:cd /` all go back to everything.
      return {
        ok: true,
        action: {
          type: 'filter',
          patch: {
            project:
              rest && !['~', '/', '..', '-'].includes(rest) ? rest.replace(/\/+$/, '') : null,
            tag: null,
          },
        },
      }
    case 'tag': {
      const tag = arg.replace(/^#/, '')

      return { ok: true, action: { type: 'filter', patch: { tag: tag || null } } }
    }
    case 'grep':
      return { ok: true, action: { type: 'search', query: rest } }
    case 'sort': {
      const sort = SORTS[arg]

      return sort
        ? { ok: true, action: { type: 'sort', sort } }
        : { ok: false, error: `E475: Invalid sort: ${firstArg || '(none)'} — try new, used or az` }
    }
    case 'colorscheme': {
      if (arg === 'system' || arg === 'default') {
        return { ok: true, action: { type: 'colorscheme', scheme: 'system' } }
      }

      return isColorSchemeId(arg)
        ? { ok: true, action: { type: 'colorscheme', scheme: arg } }
        : { ok: false, error: `E185: Cannot find color scheme '${firstArg}'` }
    }
    case 'raw':
      return { ok: true, action: { type: 'view', mode: 'raw' } }
    case 'rendered':
      return { ok: true, action: { type: 'view', mode: 'rendered' } }
    case 'log': {
      const verdictIndex = [firstArg, ...otherArgs].findIndex((part) =>
        isPromptRunVerdict(part.toLowerCase()),
      )

      if (verdictIndex < 1) {
        return { ok: false, error: 'E471: Usage: log <model> <pass|mixed|fail> [note]' }
      }

      const parts = [firstArg, ...otherArgs]
      const verdict = parts[verdictIndex]?.toLowerCase() as PromptRunVerdict

      return {
        ok: true,
        action: {
          type: 'log-run',
          model: parts.slice(0, verdictIndex).join(' '),
          verdict,
          note: parts.slice(verdictIndex + 1).join(' '),
        },
      }
    }
    case 'help':
      return { ok: true, action: { type: 'help' } }
    case 'login':
      return { ok: true, action: { type: 'login' } }
    default:
      return { ok: false, error: `E492: Not an editor command: ${trimmed}` }
  }
}

export type ExCompletion = {
  /** Full command-line text to use if this completion is accepted. */
  value: string
  label: string
  detail: string
}

type ExCompletionContext = {
  projects?: readonly string[]
  tags?: readonly string[]
}

/** Suggestions for the text typed so far: command names first, then arguments. */
export const completeExCommand = (
  input: string,
  context: ExCompletionContext = {},
): ExCompletion[] => {
  const text = input.replace(/^:+/, '')
  const spaceIndex = text.indexOf(' ')

  if (spaceIndex === -1) {
    const word = text.toLowerCase()

    const byName = EX_COMMANDS.filter((command) => command.name.startsWith(word))
    const byAlias = EX_COMMANDS.filter(
      (command) =>
        !command.name.startsWith(word) && command.aliases?.some((alias) => alias.startsWith(word)),
    )

    return [...byName, ...byAlias].map((command) => ({
      value: command.complete || /<|\[/.test(command.usage) ? `${command.name} ` : command.name,
      label: command.usage,
      detail: command.summary,
    }))
  }

  const word = text.slice(0, spaceIndex).toLowerCase()
  const argument = text.slice(spaceIndex + 1).toLowerCase()
  const command = findCommand(word)

  if (!command) {
    return []
  }

  const values =
    command.name === 'cd'
      ? (context.projects ?? [])
      : command.name === 'tag'
        ? (context.tags ?? [])
        : (command.complete?.() ?? [])

  // Projects match ignoring case and punctuation ("rend" finds "Render MD"),
  // anywhere in the name, with prefix matches first.
  const typed = command.name === 'cd' ? projectKey(argument) : argument.replace(/^#/, '')
  const keyOf = (value: string) => (command.name === 'cd' ? projectKey(value) : value.toLowerCase())
  const matches = values.filter((value) => keyOf(value).startsWith(typed))
  const contains =
    command.name === 'cd' && typed
      ? values.filter((value) => !keyOf(value).startsWith(typed) && keyOf(value).includes(typed))
      : []

  return [...matches, ...contains].slice(0, 12).map((value) => ({
    value: `${command.name} ${value}`,
    label: value,
    detail: command.summary,
  }))
}
