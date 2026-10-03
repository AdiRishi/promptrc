import { describe, expect, it } from 'vitest'

import {
  SEQUENCE_STEP_MARKER,
  formatSequenceForCopy,
  joinSequenceSteps,
  splitSequenceSteps,
  stripSequenceMarkers,
} from '@/features/prompt-library/model/prompt-sequences'

describe('prompt sequences', () => {
  describe('splitSequenceSteps', () => {
    it('splits a body on marker lines and trims each step', () => {
      expect(
        splitSequenceSteps(
          `  Restate the problem.\n\n${SEQUENCE_STEP_MARKER}\n\nList three approaches.\n${SEQUENCE_STEP_MARKER}\nPick one.  `,
        ),
      ).toEqual(['Restate the problem.', 'List three approaches.', 'Pick one.'])
    })

    it('accepts loosely written markers on their own line', () => {
      expect(
        splitSequenceSteps(
          'One\n   <!--step-->\t\nTwo\n<!--   step   -->\nThree\r\n<!-- step -->\r\nFour',
        ),
      ).toEqual(['One', 'Two', 'Three', 'Four'])
    })

    it('does not split on a marker that shares its line with other text', () => {
      expect(splitSequenceSteps('Keep <!-- step --> inline\nstill one step')).toEqual([
        'Keep <!-- step --> inline\nstill one step',
      ])
    })

    it('drops empty steps from leading, trailing, and doubled markers', () => {
      expect(
        splitSequenceSteps(
          `${SEQUENCE_STEP_MARKER}\nOne\n${SEQUENCE_STEP_MARKER}\n\n${SEQUENCE_STEP_MARKER}\nTwo\n${SEQUENCE_STEP_MARKER}`,
        ),
      ).toEqual(['One', 'Two'])
    })

    it('treats a body without markers as a single step, and an empty body as none', () => {
      expect(splitSequenceSteps('Just one instruction.')).toEqual(['Just one instruction.'])
      expect(splitSequenceSteps('   \n  ')).toEqual([])
    })

    it('keeps multi-line markdown inside a step intact', () => {
      const step = '## Plan\n\n- first\n- second\n\n```ts\nconst x = 1\n```'

      expect(splitSequenceSteps(`${step}\n\n${SEQUENCE_STEP_MARKER}\n\nNext`)).toEqual([
        step,
        'Next',
      ])
    })
  })

  describe('joinSequenceSteps', () => {
    it('round-trips through splitSequenceSteps', () => {
      const steps = ['Restate the problem.', 'List approaches:\n- a\n- b', 'Pick one.']
      const body = joinSequenceSteps(steps)

      expect(body).toBe(
        `Restate the problem.\n\n${SEQUENCE_STEP_MARKER}\n\nList approaches:\n- a\n- b\n\n${SEQUENCE_STEP_MARKER}\n\nPick one.`,
      )
      expect(splitSequenceSteps(body)).toEqual(steps)
    })

    it('keeps empty steps in the joined body so editors can hold a blank slot', () => {
      const body = joinSequenceSteps(['  One  ', '', 'Three'])

      expect(body.split(SEQUENCE_STEP_MARKER)).toHaveLength(3)
      expect(splitSequenceSteps(body)).toEqual(['One', 'Three'])
    })

    it('joins nothing into an empty body', () => {
      expect(joinSequenceSteps([])).toBe('')
    })
  })

  describe('formatSequenceForCopy', () => {
    it('numbers steps when there are several', () => {
      expect(formatSequenceForCopy(['Restate.', 'Plan.'])).toBe('Step 1\nRestate.\n\nStep 2\nPlan.')
    })

    it('copies a single step without numbering, and nothing for no steps', () => {
      expect(formatSequenceForCopy(['Only step'])).toBe('Only step')
      expect(formatSequenceForCopy([])).toBe('')
    })
  })

  describe('stripSequenceMarkers', () => {
    it('removes marker lines and keeps steps separated by a blank line', () => {
      expect(stripSequenceMarkers(joinSequenceSteps(['One', 'Two']))).toBe('One\n\nTwo')
      expect(stripSequenceMarkers('No markers')).toBe('No markers')
    })
  })
})
