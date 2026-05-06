import { describe, expect, it } from 'vitest'

import { parsePromptBodyMentions } from '@/features/prompt-library/rendering/prompt-mention-rendering'

describe('prompt mention rendering', () => {
  it('parses Codex skill references into display tokens', () => {
    const tokens = parsePromptBodyMentions(
      'Use [$to-prd](/Users/arishi/personal/app/.agents/skills/to-prd/SKILL.md) first.',
    )

    expect(tokens).toEqual([
      { text: 'Use ', type: 'text' },
      {
        href: '/Users/arishi/personal/app/.agents/skills/to-prd/SKILL.md',
        kind: 'skill',
        label: 'To Prd',
        rawLabel: '$to-prd',
        type: 'mention',
      },
      { text: ' first.', type: 'text' },
    ])
  })

  it('parses plugin references into display tokens', () => {
    const tokens = parsePromptBodyMentions('Document on [@github](plugin://github@openai-curated).')

    expect(tokens).toEqual([
      { text: 'Document on ', type: 'text' },
      {
        href: 'plugin://github@openai-curated',
        kind: 'plugin',
        label: 'GitHub',
        rawLabel: '@github',
        type: 'mention',
      },
      { text: '.', type: 'text' },
    ])
  })

  it('parses app, file, and directory references into display tokens', () => {
    const tokens = parsePromptBodyMentions(
      'Open [GitHub](app://github), [prompt-workspace.tsx:269](/Users/arishi/personal/promptrc/src/features/prompt-library/components/prompt-workspace.tsx:269), and [prompt-library](/Users/arishi/personal/promptrc/src/features/prompt-library).',
    )

    expect(tokens).toEqual([
      { text: 'Open ', type: 'text' },
      {
        href: 'app://github',
        kind: 'app',
        label: 'GitHub',
        rawLabel: 'GitHub',
        type: 'mention',
      },
      { text: ', ', type: 'text' },
      {
        href: '/Users/arishi/personal/promptrc/src/features/prompt-library/components/prompt-workspace.tsx:269',
        kind: 'file',
        label: 'prompt-workspace.tsx',
        lineNumber: 269,
        rawLabel: 'prompt-workspace.tsx:269',
        type: 'mention',
      },
      { text: ', and ', type: 'text' },
      {
        href: '/Users/arishi/personal/promptrc/src/features/prompt-library',
        kind: 'directory',
        label: 'prompt-library',
        rawLabel: 'prompt-library',
        type: 'mention',
      },
      { text: '.', type: 'text' },
    ])
  })

  it('uses sensible defaults for URI labels, file URLs, columns, and trailing directories', () => {
    const tokens = parsePromptBodyMentions(
      'Open [@browser-use](plugin://browser-use@openai-bundled), [@computer-use](app://computer-use), [settings.json:12:4](file:///Users/arishi/personal/promptrc/.vscode/settings.json:12:4), and [src/](/Users/arishi/personal/promptrc/src/).',
    )

    expect(tokens).toEqual([
      { text: 'Open ', type: 'text' },
      {
        href: 'plugin://browser-use@openai-bundled',
        kind: 'plugin',
        label: 'Browser',
        rawLabel: '@browser-use',
        type: 'mention',
      },
      { text: ', ', type: 'text' },
      {
        href: 'app://computer-use',
        kind: 'app',
        label: 'Computer',
        rawLabel: '@computer-use',
        type: 'mention',
      },
      { text: ', ', type: 'text' },
      {
        columnNumber: 4,
        href: 'file:///Users/arishi/personal/promptrc/.vscode/settings.json:12:4',
        kind: 'file',
        label: 'settings.json',
        lineNumber: 12,
        rawLabel: 'settings.json:12:4',
        type: 'mention',
      },
      { text: ', and ', type: 'text' },
      {
        href: '/Users/arishi/personal/promptrc/src/',
        kind: 'directory',
        label: 'src',
        rawLabel: 'src/',
        type: 'mention',
      },
      { text: '.', type: 'text' },
    ])
  })

  it('preserves Windows drive-letter skill and file references', () => {
    const tokens = parsePromptBodyMentions(
      'Use [$to-prd](C:/Users/arishi/.agents/skills/to-prd/SKILL.md) and [prompt-body-renderer.tsx:42](C:/Users/arishi/promptrc/src/features/prompt-library/components/prompt-body-renderer.tsx:42).',
    )

    expect(tokens).toEqual([
      { text: 'Use ', type: 'text' },
      {
        href: 'C:/Users/arishi/.agents/skills/to-prd/SKILL.md',
        kind: 'skill',
        label: 'To Prd',
        rawLabel: '$to-prd',
        type: 'mention',
      },
      { text: ' and ', type: 'text' },
      {
        href: 'C:/Users/arishi/promptrc/src/features/prompt-library/components/prompt-body-renderer.tsx:42',
        kind: 'file',
        label: 'prompt-body-renderer.tsx',
        lineNumber: 42,
        rawLabel: 'prompt-body-renderer.tsx:42',
        type: 'mention',
      },
      { text: '.', type: 'text' },
    ])
  })

  it('leaves normal markdown links as text', () => {
    const body = 'Read [the docs](https://example.com) before writing.'

    expect(parsePromptBodyMentions(body)).toEqual([{ text: body, type: 'text' }])
  })
})
