import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PromptBodyRenderer } from '@/features/prompt-library/components/prompt-body-renderer'

describe('PromptBodyRenderer', () => {
  it('renders CommonMark and GFM markdown elements with React components', () => {
    render(
      <PromptBodyRenderer
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
    expect(screen.getByText('bold').tagName).toBe('STRONG')
    expect(screen.getByText('emphasis').tagName).toBe('EM')
    expect(screen.getByText('stale').tagName).toBe('DEL')
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    expect(screen.getByRole('table')).toBeTruthy()
    expect(screen.getByText(/const ok = true/)).toBeTruthy()
  })

  it('renders Codex mention markdown links as inline references', () => {
    render(
      <PromptBodyRenderer
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
    expect(screen.getByRole('link', { name: 'docs' }).getAttribute('href')).toBe(
      'https://example.com',
    )
  })

  it('renders fallback reference cases without degrading normal links', () => {
    render(
      <PromptBodyRenderer
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
      <PromptBodyRenderer
        body={
          'Use [$to-prd](C:/Users/arishi/.agents/skills/to-prd/SKILL.md) and [prompt-body-renderer.tsx:42](C:/Users/arishi/promptrc/src/features/prompt-library/components/prompt-body-renderer.tsx:42).'
        }
      />,
    )

    expect(screen.getByRole('link', { name: 'skill: To Prd' }).getAttribute('href')).toBe(
      'C:/Users/arishi/.agents/skills/to-prd/SKILL.md',
    )
    expect(document.querySelector('[aria-label="file: prompt-body-renderer.tsx"]')).toBeTruthy()
    expect(screen.getByText('prompt-body-renderer.tsx (line 42)')).toBeTruthy()
  })
})
