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

  it('renders skill and plugin markdown links as prompt mention chips', () => {
    render(
      <PromptBodyRenderer
        body={
          'Use [$to-prd](/Users/arishi/personal/app/.agents/skills/to-prd/SKILL.md) and [@github](plugin://github@openai-curated). Read [docs](https://example.com).'
        }
      />,
    )

    expect(document.querySelector('[aria-label="skill: To Prd"]')).toBeTruthy()
    expect(document.querySelector('[aria-label="plugin: GitHub"]')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'docs' }).getAttribute('href')).toBe(
      'https://example.com',
    )
  })
})
