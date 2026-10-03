import { describe, expect, it } from 'vitest'

import {
  findNearProject,
  getPromptProjects,
  projectKey,
  resolveProjectName,
  suggestProjects,
} from '@/features/prompt-library/model/prompt-projects'
import { type PromptRecord } from '@/features/prompt-library/types'

const promptIn = (category: string, id = category): PromptRecord => ({
  id,
  kind: 'prompt',
  title: id,
  body: 'Body',
  notes: '',
  category,
  tags: [],
  images: [],
  runs: [],
  pinned: false,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
})

const projects = getPromptProjects([
  promptIn('render-md', 'a'),
  promptIn('render-md', 'b'),
  promptIn('Render MD', 'c'),
  promptIn('promptrc'),
  promptIn('Client X'),
])

describe('prompt projects', () => {
  it('treats case, spaces and punctuation as the same Project', () => {
    expect(projectKey('Render MD')).toBe(projectKey('render_md'))
    expect(projectKey(' render-md/ ')).toBe('rendermd')
    expect(projects.map((project) => [project.label, project.count])).toEqual([
      ['Client X', 1],
      ['promptrc', 1],
      ['render-md', 3],
    ])
  })

  it('resolves a typed name to the existing spelling, or keeps a new one as typed', () => {
    expect(resolveProjectName('RENDER md', projects)).toBe('render-md')
    expect(resolveProjectName('client-x', projects)).toBe('Client X')
    expect(resolveProjectName('  Brand New  ', projects)).toBe('Brand New')
    expect(resolveProjectName('', projects)).toBe('')
  })

  it('suggests exact, prefix, contains, then in-order matches', () => {
    expect(suggestProjects('', projects).map((project) => project.label)).toEqual([
      'Client X',
      'promptrc',
      'render-md',
    ])
    expect(suggestProjects('pro', projects).map((project) => project.label)).toEqual(['promptrc'])
    expect(suggestProjects('md', projects).map((project) => project.label)).toEqual(['render-md'])
    expect(suggestProjects('rmd', projects).map((project) => project.label)).toEqual(['render-md'])
    expect(suggestProjects('zzz', projects)).toEqual([])
  })

  it('offers a near miss for typos, but never for exact or very short input', () => {
    expect(findNearProject('rendr-md', projects)?.label).toBe('render-md')
    expect(findNearProject('promtprc', projects)?.label).toBe('promptrc')
    expect(findNearProject('render-md', projects)).toBeNull()
    expect(findNearProject('rx', projects)).toBeNull()
    expect(findNearProject('totally different', projects)).toBeNull()
  })
})
