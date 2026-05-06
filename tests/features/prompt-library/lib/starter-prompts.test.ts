import { describe, expect, it } from 'vitest'

import {
  STARTER_PROMPT_TITLES,
  createStarterPrompts,
  getStartHerePrompt,
} from '@/features/prompt-library/lib/starter-prompts'

describe('starter prompts', () => {
  it('creates six ordinary prompts with Start Here as the default selection', () => {
    const starterPrompts = createStarterPrompts()

    expect(starterPrompts).toHaveLength(6)
    expect(starterPrompts.map((prompt) => prompt.title)).toEqual([
      'Start Here',
      'Bug Hunt',
      'PRD Shaper',
      'Executive Summary',
      'Decision Partner',
      'Difficult Reply',
    ])
    expect(starterPrompts.map((prompt) => prompt.title)).toEqual(STARTER_PROMPT_TITLES)
    expect(getStartHerePrompt(starterPrompts)?.title).toBe('Start Here')
    expect(new Set(starterPrompts.map((prompt) => prompt.id)).size).toBe(starterPrompts.length)
    expect(starterPrompts.map((prompt) => prompt.category)).toEqual([
      'Onboarding',
      'Engineering',
      'Product',
      'Writing',
      'Thinking',
      'Communication',
    ])
    expect(starterPrompts.every((prompt) => prompt.tags.length > 0)).toBe(true)
    expect(starterPrompts.every((prompt) => prompt.uses === 0)).toBe(true)
  })
})
