import { describe, expect, it } from 'vitest'

import {
  completeExCommand,
  parseExCommand,
} from '@/features/prompt-library/commands/prompt-library-ex-commands'

const action = (input: string) => {
  const result = parseExCommand(input)

  if (!result.ok) {
    throw new Error(result.error)
  }

  return result.action
}

const error = (input: string) => {
  const result = parseExCommand(input)

  return result.ok ? null : result.error
}

describe('parseExCommand', () => {
  it('maps vim-flavoured editing commands', () => {
    expect(action(':w')).toEqual({ type: 'write', close: false })
    expect(action('wq')).toEqual({ type: 'write', close: true })
    expect(action('x')).toEqual({ type: 'write', close: true })
    expect(action('q')).toEqual({ type: 'quit', force: false })
    expect(action('q!')).toEqual({ type: 'quit', force: true })
    expect(action('e')).toEqual({ type: 'edit' })
    expect(action('rm')).toEqual({ type: 'delete', force: false })
    expect(action('rm!')).toEqual({ type: 'delete', force: true })
  })

  it('creates entries of a chosen kind, accepting plurals', () => {
    expect(action('new')).toEqual({ type: 'new' })
    expect(action('new sequence')).toEqual({ type: 'new', kind: 'sequence' })
    expect(action('n benchmarks')).toEqual({ type: 'new', kind: 'benchmark' })
    expect(error('new essay')).toBe('E475: Invalid kind: essay')
  })

  it('changes parts of the filter, which stack: project, kind, pin, tag', () => {
    const patch = (input: string) => {
      const result = action(input)

      return result.type === 'filter' ? result.patch : result
    }

    expect(patch('sequences')).toEqual({ kind: 'sequence' })
    expect(patch('kind fragment')).toEqual({ kind: 'fragment' })
    expect(patch('kind')).toEqual({ kind: null })
    expect(patch('cd Product Work')).toEqual({ project: 'Product Work', tag: null })
    expect(patch('cd render-md/')).toEqual({ project: 'render-md', tag: null })
    expect(patch('project render-md')).toEqual({ project: 'render-md', tag: null })
    expect(patch('cd ~')).toEqual({ project: null, tag: null })
    expect(patch('cd ..')).toEqual({ project: null, tag: null })
    expect(patch('cd')).toEqual({ project: null, tag: null })
    expect(patch('tag #Review')).toEqual({ tag: 'review' })
    expect(patch('tag')).toEqual({ tag: null })
    expect(patch('pinned')).toEqual({ pinned: true })
    expect(patch('all')).toEqual({ kind: null, pinned: false, tag: null })
    expect(action('grep root cause')).toEqual({ type: 'search', query: 'root cause' })
  })

  it('sorts, switches colorschemes, and changes the view', () => {
    expect(action('sort used')).toEqual({ type: 'sort', sort: 'used' })
    expect(action('sort a-z')).toEqual({ type: 'sort', sort: 'title' })
    expect(error('sort random')).toMatch(/Invalid sort/)
    expect(action('colo phosphor')).toEqual({ type: 'colorscheme', scheme: 'phosphor' })
    expect(action('colorscheme default')).toEqual({ type: 'colorscheme', scheme: 'system' })
    expect(error('colorscheme solarized')).toBe("E185: Cannot find color scheme 'solarized'")
    expect(action('raw')).toEqual({ type: 'view', mode: 'raw' })
    expect(action('glow')).toEqual({ type: 'view', mode: 'rendered' })
  })

  it('copies a whole body or a single step', () => {
    expect(action('y')).toEqual({ type: 'copy' })
    expect(action('yank 2')).toEqual({ type: 'copy', step: 2 })
    expect(action('yank step3')).toEqual({ type: 'copy', step: 3 })
    expect(error('yank zero')).toMatch(/Invalid step/)
  })

  it('logs benchmark runs with multi-word models and notes', () => {
    expect(action('log claude-opus-5-5 pass')).toEqual({
      type: 'log-run',
      model: 'claude-opus-5-5',
      verdict: 'pass',
      note: '',
    })
    expect(action('log local llama 70b MIXED buried the decision')).toEqual({
      type: 'log-run',
      model: 'local llama 70b',
      verdict: 'mixed',
      note: 'buried the decision',
    })
    expect(error('log pass')).toMatch(/Usage: log/)
  })

  it('reports unknown commands the way vim does', () => {
    expect(error('frobnicate')).toBe('E492: Not an editor command: frobnicate')
    expect(error(':')).toBe('E471: Argument required')
    expect(error('42')).toMatch(/E492/)
  })
})

describe('completeExCommand', () => {
  it('completes command names and aliases', () => {
    const labels = completeExCommand('co').map((completion) => completion.value)

    expect(labels).toEqual(['colorscheme ', 'yank '])
    expect(completeExCommand('w')[0]).toMatchObject({ value: 'write', detail: expect.any(String) })
  })

  it('completes arguments from the library and the command definition', () => {
    expect(completeExCommand('colo ph').map((completion) => completion.value)).toEqual([
      'colorscheme phosphor',
    ])
    expect(
      completeExCommand('tag re', { tags: ['review', 'reply', 'tone'] }).map((c) => c.label),
    ).toEqual(['review', 'reply'])
    expect(
      completeExCommand('cd eng', { projects: ['Engineering', 'Writing'] }).map((c) => c.value),
    ).toEqual(['cd Engineering'])
    // Projects match ignoring case and punctuation, prefixes first.
    expect(
      completeExCommand('cd md', { projects: ['render-md', 'Mdx Docs', 'promptrc'] }).map(
        (c) => c.label,
      ),
    ).toEqual(['Mdx Docs', 'render-md'])
    expect(completeExCommand('nope arg')).toEqual([])
  })
})
