import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PromptBodyMarkdown } from '@/features/prompt-library/rendering/prompt-body-markdown'

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
    expect(screen.getByText('bold').tagName).toBe('STRONG')
    expect(screen.getByText('emphasis').tagName).toBe('EM')
    expect(screen.getByText('stale').tagName).toBe('DEL')
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
    expect(document.querySelector('[aria-label="app: Computer Use"]')).toBeTruthy()
    expect(document.querySelector('[aria-label="file: settings.json"]')).toBeTruthy()
    expect(document.querySelector('[aria-label="directory: src"]')).toBeTruthy()
    expect(screen.getByText('settings.json (line 12, column 4)')).toBeTruthy()
  })

  it('renders Codex plugin references with generated product SVG icons', () => {
    render(
      <PromptBodyMarkdown
        body={
          'Use [@posthog](plugin://posthog@openai-curated), [@cloudflare](plugin://cloudflare@openai-curated), [@expo](plugin://expo@openai-curated), [@alpaca](plugin://alpaca@openai-curated), and [@Browser](plugin://browser@openai-bundled).'
        }
      />,
    )

    const posthogReference = document.querySelector('[aria-label="plugin: PostHog"]')
    const cloudflareReference = document.querySelector('[aria-label="plugin: Cloudflare"]')
    const expoReference = document.querySelector('[aria-label="plugin: Expo"]')
    const alpacaReference = document.querySelector('[aria-label="plugin: Alpaca"]')
    const browserReference = document.querySelector('[aria-label="plugin: Browser"]')

    expect(posthogReference?.querySelector('img')?.getAttribute('src')).toBe(
      '/codex-plugin-icons/posthog.svg',
    )
    expect(cloudflareReference?.querySelector('img')?.getAttribute('src')).toBe(
      '/codex-plugin-icons/cloudflare.svg',
    )
    expect(expoReference?.querySelector('img')?.getAttribute('src')).toBe(
      '/codex-plugin-icons/expo.svg',
    )
    expect(alpacaReference?.querySelector('img')?.getAttribute('src')).toBe(
      '/codex-plugin-icons/alpaca.svg',
    )
    expect(alpacaReference?.className).toContain('text-[#6f7890]')
    expect(alpacaReference?.className).not.toContain('text-current')
    expect(browserReference?.querySelector('img')?.getAttribute('src')).toBe(
      '/codex-plugin-icons/browser.svg',
    )
    expect(screen.getByText('PostHog')).toBeTruthy()
    expect(screen.getByText('Cloudflare')).toBeTruthy()
    expect(screen.getByText('Expo')).toBeTruthy()
    expect(screen.getByText('Alpaca')).toBeTruthy()
    expect(screen.getByText('Browser')).toBeTruthy()
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
})
