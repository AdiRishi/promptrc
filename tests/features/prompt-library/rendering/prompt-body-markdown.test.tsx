import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PromptBodyMarkdown } from '@/features/prompt-library/rendering/prompt-body-markdown'

afterEach(() => {
  cleanup()
  window.getSelection()?.removeAllRanges()
})

describe('PromptBodyMarkdown', () => {
  it('renders CommonMark and GFM markdown elements with React components', () => {
    render(
      <PromptBodyMarkdown
        body={`# Deploy checklist

Paragraph with **bold**, *emphasis*, ~~stale~~, \`inline\`, and [docs](https://example.com).

> Keep the rollout boring.

- [x] Build passes
- [ ] Watch metrics

| Key | Value |
| --- | ---: |
| build | 42 |

\`\`\`ts
const ok = true
\`\`\``}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Deploy checklist' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'docs' }).getAttribute('href')).toBe(
      'https://example.com',
    )
    expect(screen.getByText('bold').closest('strong')).toBeTruthy()
    expect(screen.getByText('emphasis').closest('em')).toBeTruthy()
    expect(screen.getByText('stale').closest('del')).toBeTruthy()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(screen.getByRole('table')).toBeTruthy()
    expect(screen.getByText(/const ok = true/)).toBeTruthy()
  })

  it('renders Codex reference markdown links as inline references', () => {
    render(
      <PromptBodyMarkdown
        body={
          'Use [$to-prd](/Users/arishi/personal/app/.agents/skills/to-prd/SKILL.md), [@github](plugin://github@openai-curated), [GitHub](app://github), [prompt-workspace.tsx:269](/Users/arishi/personal/promptrc/src/features/prompt-library/components/prompt-workspace.tsx:269), and [prompt-library](/Users/arishi/personal/promptrc/src/features/prompt-library). Read [docs](https://example.com).'
        }
      />,
    )

    expect(document.querySelector('[aria-label="skill: To Prd"]')).toBeTruthy()
    expect(document.querySelector('[aria-label="plugin: GitHub"]')).toBeTruthy()
    expect(document.querySelector('[aria-label="app: GitHub"]')).toBeTruthy()
    expect(document.querySelector('[aria-label="file: prompt-workspace.tsx"]')).toBeTruthy()
    expect(document.querySelector('[aria-label="directory: prompt-library"]')).toBeTruthy()
    expect(screen.getByText('prompt-workspace.tsx (line 269)')).toBeTruthy()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'docs' }).getAttribute('href')).toBe(
      'https://example.com',
    )
  })

  it('renders fallback reference cases without degrading normal links', () => {
    render(
      <PromptBodyMarkdown
        body={
          'Open [@browser-use](plugin://browser-use@openai-bundled), [@computer-use](app://computer-use), [settings.json:12:4](file:///Users/arishi/personal/promptrc/.vscode/settings.json:12:4), and [src/](/Users/arishi/personal/promptrc/src/).'
        }
      />,
    )

    expect(document.querySelector('[aria-label="plugin: Browser"]')).toBeTruthy()
    expect(document.querySelector('[aria-label="app: Computer"]')).toBeTruthy()
    expect(document.querySelector('[aria-label="file: settings.json"]')).toBeTruthy()
    expect(document.querySelector('[aria-label="directory: src"]')).toBeTruthy()
    expect(screen.getByText('settings.json (line 12, column 4)')).toBeTruthy()
  })

  it('keeps Windows drive-letter reference hrefs renderable', () => {
    render(
      <PromptBodyMarkdown
        body={
          'Use [$to-prd](C:/Users/arishi/.agents/skills/to-prd/SKILL.md) and [prompt-body-markdown.tsx:42](C:/Users/arishi/promptrc/src/features/prompt-library/rendering/prompt-body-markdown.tsx:42).'
        }
      />,
    )

    expect(screen.queryByRole('link')).toBeNull()
    expect(document.querySelector('[aria-label="file: prompt-body-markdown.tsx"]')).toBeTruthy()
    expect(screen.getByText('prompt-body-markdown.tsx (line 42)')).toBeTruthy()
  })

  it('copies the source markdown when rendered Prompt Body text is copied natively', () => {
    const body =
      'Paragraph with **bold**, [docs](https://example.com), and `inline`.\n\n- [x] Build passes'

    render(<PromptBodyMarkdown body={body} />)

    const markdown = document.querySelector('.prompt-markdown')

    expect(markdown).toBeTruthy()
    selectNodeContents(markdown!)

    const clipboardData = copySelectedMarkdown()

    expect(clipboardData.setData).toHaveBeenCalledWith('text/plain', body)
    expect(clipboardData.setData).toHaveBeenCalledOnce()
  })

  it('copies markdown for the selected rendered inline content', () => {
    render(
      <PromptBodyMarkdown
        body={'Paragraph with **bold**, [docs](https://example.com), and `inline`.'}
      />,
    )

    selectNodeContents(screen.getByText('bold'))

    expect(copySelectedMarkdown().setData).toHaveBeenCalledWith('text/plain', '**bold**')

    selectNodeContents(screen.getByText('docs'))

    expect(copySelectedMarkdown().setData).toHaveBeenCalledWith(
      'text/plain',
      '[docs](https://example.com)',
    )
  })

  it('copies only a partial plain-text selection', () => {
    render(<PromptBodyMarkdown body={'Paragraph with **bold**.'} />)

    const textSpan = document.querySelector('[data-markdown-source-text]')
    const textNode = textSpan?.firstChild

    expect(textNode).toBeTruthy()
    selectText(textNode!, 0, 'Paragraph'.length)

    expect(copySelectedMarkdown().setData).toHaveBeenCalledWith('text/plain', 'Paragraph')
  })

  it('does not include a list marker when only list item text is selected', () => {
    render(<PromptBodyMarkdown body={'1. this\n2. is\n3. awesome'} />)

    selectNodeContents(screen.getByText('this'))

    expect(copySelectedMarkdown().setData).toHaveBeenCalledWith('text/plain', 'this')
  })
})

function selectNodeContents(node: Node) {
  const selection = window.getSelection()
  const range = document.createRange()

  selection?.removeAllRanges()
  range.selectNodeContents(node)
  selection?.addRange(range)
}

function selectText(node: Node, startOffset: number, endOffset: number) {
  const selection = window.getSelection()
  const range = document.createRange()

  selection?.removeAllRanges()
  range.setStart(node, startOffset)
  range.setEnd(node, endOffset)
  selection?.addRange(range)
}

function copySelectedMarkdown() {
  const clipboardData = {
    setData: vi.fn(),
  }
  const event = new Event('copy', { bubbles: true, cancelable: true })

  Object.defineProperty(event, 'clipboardData', {
    value: clipboardData,
  })

  document.dispatchEvent(event)

  return clipboardData
}
