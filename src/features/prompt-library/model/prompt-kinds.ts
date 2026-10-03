import { type PromptKind } from '@/features/prompt-library/types'

export const DEFAULT_PROMPT_KIND: PromptKind = 'prompt'

export const PROMPT_KINDS = [
  'prompt',
  'fragment',
  'sequence',
  'benchmark',
] as const satisfies readonly PromptKind[]

type PromptKindDefinition = {
  label: string
  plural: string
  /** One line shown when choosing a kind. */
  description: string
  /** What the body field is called while writing this kind. */
  bodyLabel: string
  bodyPlaceholder: string
  /** What the notes field is called for this kind. */
  notesLabel: string
  notesPlaceholder: string
}

export const PROMPT_KIND_DEFINITIONS: Record<PromptKind, PromptKindDefinition> = {
  prompt: {
    label: 'Prompt',
    plural: 'Prompts',
    description: 'A reusable instruction. Use {{variables}} for the parts that change.',
    bodyLabel: 'Prompt',
    bodyPlaceholder: 'Act as a careful reviewer. Read {{document}} and…',
    notesLabel: 'Why it works',
    notesPlaceholder: 'Where it came from, what it is good at, what to watch for.',
  },
  fragment: {
    label: 'Fragment',
    plural: 'Fragments',
    description: 'A turn of phrase that landed exactly right.',
    bodyLabel: 'Fragment',
    bodyPlaceholder: 'Preserve uncertainty as open questions instead of inventing false precision.',
    notesLabel: 'Context',
    notesPlaceholder: 'What it fixed, and where it belongs in a larger prompt.',
  },
  sequence: {
    label: 'Sequence',
    plural: 'Sequences',
    description: 'An ordered chain of instructions that reliably gets you there.',
    bodyLabel: 'Steps',
    bodyPlaceholder: 'First, restate the problem in your own words…',
    notesLabel: 'Why this order',
    notesPlaceholder: 'What each step sets up for the next.',
  },
  benchmark: {
    label: 'Benchmark',
    plural: 'Benchmarks',
    description: 'A reproducible test. Record what good looks like, then log runs.',
    bodyLabel: 'Test prompt',
    bodyPlaceholder: 'Exactly what you send to the model, every time.',
    notesLabel: 'Expected result',
    notesPlaceholder: 'The rubric: what a pass, a mixed result, and a fail look like.',
  },
}

export const isPromptKind = (value: unknown): value is PromptKind => {
  return typeof value === 'string' && (PROMPT_KINDS as readonly string[]).includes(value)
}

export const getPromptKindDefinition = (kind: PromptKind) => PROMPT_KIND_DEFINITIONS[kind]
