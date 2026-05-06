import { type PromptRecord } from '@/features/prompt-library/types'

export const DEFAULT_PROMPT_CATEGORIES = [
  'Engineering',
  'Writing',
  'Thinking',
  'Teaching',
  'Product',
  'Career',
  'Personal',
  'Communication',
] as const

export const INITIAL_PROMPTS: PromptRecord[] = []
