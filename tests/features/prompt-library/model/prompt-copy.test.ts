import { describe, expect, it } from 'vitest'

import { getPromptCopyText } from '@/features/prompt-library/model/prompt-copy'
import { joinSequenceSteps } from '@/features/prompt-library/model/prompt-sequences'

describe('getPromptCopyText', () => {
  it('copies a plain Prompt Body unchanged', () => {
    expect(getPromptCopyText({ kind: 'prompt', body: 'Write a concise test plan.' })).toBe(
      'Write a concise test plan.',
    )
  })

  it('fills variables for non-sequence kinds, falling back or keeping unfilled slots', () => {
    const body = 'Review {{file}} for {{focus | correctness}} in {{lang}}.'

    for (const kind of ['prompt', 'fragment', 'benchmark'] as const) {
      expect(getPromptCopyText({ kind, body }, { values: { file: 'api.ts' } })).toBe(
        'Review api.ts for correctness in {{lang}}.',
      )
    }
  })

  it('copies step markers verbatim when the kind is not a sequence', () => {
    const body = joinSequenceSteps(['One', 'Two'])

    expect(getPromptCopyText({ kind: 'prompt', body })).toBe(body)
    expect(getPromptCopyText({ kind: 'prompt', body }, { stepIndex: 1 })).toBe(body)
  })

  it('copies a whole sequence as numbered steps with variables filled in each', () => {
    const body = joinSequenceSteps([
      'Restate {{problem}}.',
      'Plan for {{problem}} in {{lang | TS}}.',
    ])

    expect(getPromptCopyText({ kind: 'sequence', body }, { values: { problem: 'caching' } })).toBe(
      'Step 1\nRestate caching.\n\nStep 2\nPlan for caching in TS.',
    )
  })

  it('copies one sequence step (0-based) when a step index is given', () => {
    const body = joinSequenceSteps(['Restate {{problem}}.', 'Plan it.', 'Build it.'])

    expect(
      getPromptCopyText(
        { kind: 'sequence', body },
        { values: { problem: 'caching' }, stepIndex: 0 },
      ),
    ).toBe('Restate caching.')
    expect(getPromptCopyText({ kind: 'sequence', body }, { stepIndex: 2 })).toBe('Build it.')
  })

  it('copies nothing for a step index outside the sequence', () => {
    const body = joinSequenceSteps(['One', 'Two'])

    expect(getPromptCopyText({ kind: 'sequence', body }, { stepIndex: 2 })).toBe('')
    expect(getPromptCopyText({ kind: 'sequence', body }, { stepIndex: -1 })).toBe('')
  })

  it('copies a single-step sequence without a "Step 1" heading', () => {
    expect(getPromptCopyText({ kind: 'sequence', body: 'Only step for {{x | you}}' })).toBe(
      'Only step for you',
    )
  })
})
