import { describe, expect, it } from 'vitest'

import {
  STARTER_PROMPT_TITLES,
  createStarterPrompts,
  getStartHerePrompt,
} from '@/features/prompt-library/model/starter-prompts'

describe('starter prompts', () => {
  it('creates six Prompts covering every kind, with Start Here as the default selection', () => {
    const starterPrompts = createStarterPrompts()

    expect(starterPrompts).toHaveLength(6)
    expect(starterPrompts.map((prompt) => prompt.title)).toEqual([
      'Start Here',
      'Bug Hunt',
      'Preserve uncertainty',
      'Plan, critique, build',
      'Executive summary under pressure',
      'Difficult Reply',
    ])
    expect(starterPrompts.map((prompt) => prompt.title)).toEqual(STARTER_PROMPT_TITLES)
    expect(getStartHerePrompt(starterPrompts)?.title).toBe('Start Here')
    expect(new Set(starterPrompts.map((prompt) => prompt.id)).size).toBe(starterPrompts.length)
    expect(starterPrompts.map((prompt) => prompt.category)).toEqual([
      'Onboarding',
      'Engineering',
      'Writing',
      'Engineering',
      'Writing',
      'Communication',
    ])
    expect(new Set(starterPrompts.map((prompt) => prompt.kind))).toEqual(
      new Set(['prompt', 'fragment', 'sequence', 'benchmark']),
    )
    expect(starterPrompts.filter((prompt) => prompt.pinned).map((prompt) => prompt.title)).toEqual([
      'Start Here',
    ])
    expect(starterPrompts.every((prompt) => prompt.runs.length === 0)).toBe(true)
    expect(starterPrompts.every((prompt) => prompt.tags.length > 0)).toBe(true)
    expect(starterPrompts.every((prompt) => prompt.uses === 0)).toBe(true)
  })

  it('gives each starter prompt a deterministic remote sort key', () => {
    const starterPrompts = createStarterPrompts()
    const updatedTimestamps = starterPrompts.map((prompt) => new Date(prompt.updatedAt).getTime())

    expect(new Set(updatedTimestamps).size).toBe(starterPrompts.length)
    expect([...updatedTimestamps].sort((a, b) => b - a)).toEqual(updatedTimestamps)
  })
})
