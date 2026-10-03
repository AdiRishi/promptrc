import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProjectPicker } from '@/features/prompt-library/components/project-picker'
import { type PromptProject } from '@/features/prompt-library/model/prompt-projects'

const projects: PromptProject[] = [
  { key: 'clientx', label: 'Client X', count: 2 },
  { key: 'promptrc', label: 'promptrc', count: 5 },
  { key: 'rendermd', label: 'render-md', count: 8 },
]

function Harness({ initial = '', onKeyDown }: { initial?: string; onKeyDown?: () => void }) {
  const [value, setValue] = useState(initial)

  return (
    <>
      <label htmlFor="project">project</label>
      <ProjectPicker
        id="project"
        onChange={setValue}
        onKeyDown={onKeyDown}
        projects={projects}
        value={value}
      />
      <output data-testid="value">{value}</output>
    </>
  )
}

const input = () => screen.getByLabelText('project') as HTMLInputElement
const value = () => screen.getByTestId('value').textContent

afterEach(() => {
  cleanup()
})

describe('ProjectPicker', () => {
  it('suggests existing projects and picks one with the keyboard', () => {
    render(<Harness />)

    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: 'pro' } })

    expect(screen.getByRole('button', { name: /promptrc/ })).toBeTruthy()

    fireEvent.keyDown(input(), { key: 'Enter' })

    expect(value()).toBe('promptrc')
  })

  it('snaps a different spelling of an existing project when leaving the field', () => {
    render(<Harness />)

    fireEvent.change(input(), { target: { value: 'Render MD' } })

    expect(screen.getByText('→ render-md')).toBeTruthy()

    fireEvent.blur(input())

    expect(value()).toBe('render-md')
  })

  it('asks "did you mean" for a typo, and Enter takes the existing project', () => {
    render(<Harness />)

    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: 'promtprc' } })

    expect(screen.getByText(/did you mean/)).toBeTruthy()

    fireEvent.keyDown(input(), { key: 'Enter' })

    expect(value()).toBe('promptrc')
  })

  it('makes a new project an explicit choice and keeps it as typed', () => {
    render(<Harness />)

    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: 'Moonshot' } })

    expect(screen.getByText('+ new project')).toBeTruthy()

    fireEvent.keyDown(input(), { key: 'Enter' })
    fireEvent.blur(input())

    expect(value()).toBe('Moonshot')
  })

  it('passes ⌘⏎ through so the form can save', () => {
    const onKeyDown = vi.fn()
    render(<Harness initial="promptrc" onKeyDown={onKeyDown} />)

    fireEvent.focus(input())
    fireEvent.keyDown(input(), { key: 'Enter', metaKey: true })

    expect(onKeyDown).toHaveBeenCalledOnce()
    expect(value()).toBe('promptrc')
  })
})
