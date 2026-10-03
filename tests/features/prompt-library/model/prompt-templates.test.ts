import { describe, expect, it } from 'vitest'

import {
  extractPromptVariables,
  fillPromptVariables,
  hasPromptVariables,
  segmentPromptTemplate,
} from '@/features/prompt-library/model/prompt-templates'

describe('prompt templates', () => {
  describe('extractPromptVariables', () => {
    it('lists each variable once, in order of first appearance', () => {
      expect(
        extractPromptVariables('Review {{file}} for {{focus | correctness}}, then {{file}} again.'),
      ).toEqual([
        { name: 'file', fallback: null },
        { name: 'focus', fallback: 'correctness' },
      ])
    })

    it('picks up a fallback declared on a later occurrence of the same variable', () => {
      expect(extractPromptVariables('{{tone}} … {{tone | friendly}} … {{tone | terse}}')).toEqual([
        { name: 'tone', fallback: 'friendly' },
      ])
    })

    it('tolerates whitespace inside the braces and trims the fallback', () => {
      expect(extractPromptVariables('{{   audience   |   senior engineers   }}')).toEqual([
        { name: 'audience', fallback: 'senior engineers' },
      ])
    })

    it('accepts dotted and dashed names but ignores things that are not variable slots', () => {
      expect(
        extractPromptVariables(
          [
            '{{user.name}} {{repo-slug}} {{snake_case}}',
            '{{}} {{ }} {{1st}} {{two words}} {single} {{{triple}}}',
          ].join('\n'),
        ).map((variable) => variable.name),
      ).toEqual(['user.name', 'repo-slug', 'snake_case', 'triple'])
    })

    it('treats an empty fallback as no fallback', () => {
      expect(extractPromptVariables('{{topic | }}')).toEqual([{ name: 'topic', fallback: null }])
    })

    it('returns nothing for plain text', () => {
      expect(extractPromptVariables('No slots here.')).toEqual([])
      expect(extractPromptVariables('')).toEqual([])
    })
  })

  describe('hasPromptVariables', () => {
    it('detects variable slots', () => {
      expect(hasPromptVariables('Summarize {{doc}}')).toBe(true)
      expect(hasPromptVariables('Summarize the doc')).toBe(false)
      expect(hasPromptVariables('Use {{ 9lives }} braces')).toBe(false)
    })

    it('gives the same answer on repeated calls (no leaked global regex state)', () => {
      const body = 'Summarize {{doc}}'

      expect([
        hasPromptVariables(body),
        hasPromptVariables(body),
        hasPromptVariables(body),
      ]).toEqual([true, true, true])
      extractPromptVariables(body)
      fillPromptVariables(body, {})
      expect(hasPromptVariables(body)).toBe(true)
    })
  })

  describe('fillPromptVariables', () => {
    it('fills every occurrence with the trimmed value', () => {
      expect(fillPromptVariables('{{name}} meets {{ name }}.', { name: '  Ada  ' })).toBe(
        'Ada meets Ada.',
      )
    })

    it('uses the fallback when the value is missing or blank', () => {
      const body = 'Review for {{focus | correctness}}.'

      expect(fillPromptVariables(body, {})).toBe('Review for correctness.')
      expect(fillPromptVariables(body, { focus: '   ' })).toBe('Review for correctness.')
      expect(fillPromptVariables(body, { focus: 'performance' })).toBe('Review for performance.')
    })

    it('leaves unfilled slots without a fallback verbatim so nothing silently disappears', () => {
      expect(fillPromptVariables('Read {{ file }} and {{other}}.', { other: 'x' })).toBe(
        'Read {{ file }} and x.',
      )
    })

    it('inserts values literally, even when they look like replacement patterns', () => {
      expect(fillPromptVariables('Value: {{v}}', { v: "$& $1 $$ $` $'" })).toBe(
        "Value: $& $1 $$ $` $'",
      )
    })

    it('does not re-expand variables that appear inside filled values', () => {
      expect(fillPromptVariables('{{a}}', { a: '{{b}}', b: 'nope' })).toBe('{{b}}')
    })

    it('ignores values for names that are not in the body', () => {
      expect(fillPromptVariables('Plain text', { unused: 'x' })).toBe('Plain text')
    })
  })

  describe('segmentPromptTemplate', () => {
    it('splits text into literal runs and variable slots that rejoin to the original', () => {
      const text = 'Review {{file}} for {{focus | correctness}}.'
      const segments = segmentPromptTemplate(text)

      expect(segments).toEqual([
        { type: 'text', text: 'Review ' },
        { type: 'variable', name: 'file', fallback: null, raw: '{{file}}' },
        { type: 'text', text: ' for ' },
        {
          type: 'variable',
          name: 'focus',
          fallback: 'correctness',
          raw: '{{focus | correctness}}',
        },
        { type: 'text', text: '.' },
      ])
      expect(
        segments.map((segment) => (segment.type === 'text' ? segment.text : segment.raw)).join(''),
      ).toBe(text)
    })

    it('handles adjacent variables and variables at the edges', () => {
      expect(segmentPromptTemplate('{{a}}{{b}}')).toEqual([
        { type: 'variable', name: 'a', fallback: null, raw: '{{a}}' },
        { type: 'variable', name: 'b', fallback: null, raw: '{{b}}' },
      ])
    })

    it('returns one text segment without variables, and nothing for empty text', () => {
      expect(segmentPromptTemplate('Just text {{ 1nvalid }}')).toEqual([
        { type: 'text', text: 'Just text {{ 1nvalid }}' },
      ])
      expect(segmentPromptTemplate('')).toEqual([])
    })

    // BUG: segmentPromptTemplate uses `match[2] ?? null`, so `{{topic | }}` yields
    // fallback '' while extractPromptVariables (and fillPromptVariables) treat the
    // empty fallback as absent (null). The two views of the same slot disagree.
    it('agrees with extractPromptVariables that an empty fallback is no fallback', () => {
      const [segment] = segmentPromptTemplate('{{topic | }}')

      expect(segment).toEqual({
        type: 'variable',
        name: 'topic',
        fallback: null,
        raw: '{{topic | }}',
      })
    })
  })
})
