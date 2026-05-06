import { describe, expect, it } from 'vitest'

import {
  createPromptReferenceToken,
  shouldPreservePromptReferenceHref,
} from '@/features/prompt-library/rendering/prompt-reference-tokens'

describe('prompt reference tokens', () => {
  it('classifies Codex skill and plugin references', () => {
    expect(
      createPromptReferenceToken(
        '$to-prd',
        '/Users/arishi/personal/app/.agents/skills/to-prd/SKILL.md',
      ),
    ).toEqual({
      href: '/Users/arishi/personal/app/.agents/skills/to-prd/SKILL.md',
      kind: 'skill',
      label: 'To Prd',
      rawLabel: '$to-prd',
      type: 'reference',
    })
    expect(createPromptReferenceToken('@github', 'plugin://github@openai-curated')).toEqual({
      href: 'plugin://github@openai-curated',
      kind: 'plugin',
      label: 'GitHub',
      rawLabel: '@github',
      type: 'reference',
    })
  })

  it('classifies app, file, and directory references', () => {
    expect(createPromptReferenceToken('GitHub', 'app://github')).toEqual({
      href: 'app://github',
      kind: 'app',
      label: 'GitHub',
      rawLabel: 'GitHub',
      type: 'reference',
    })
    expect(
      createPromptReferenceToken(
        'prompt-workspace.tsx:269',
        '/Users/arishi/personal/promptrc/src/features/prompt-library/components/prompt-workspace.tsx:269',
      ),
    ).toEqual({
      href: '/Users/arishi/personal/promptrc/src/features/prompt-library/components/prompt-workspace.tsx:269',
      kind: 'file',
      label: 'prompt-workspace.tsx',
      lineNumber: 269,
      rawLabel: 'prompt-workspace.tsx:269',
      type: 'reference',
    })
    expect(
      createPromptReferenceToken(
        'prompt-library',
        '/Users/arishi/personal/promptrc/src/features/prompt-library',
      ),
    ).toEqual({
      href: '/Users/arishi/personal/promptrc/src/features/prompt-library',
      kind: 'directory',
      label: 'prompt-library',
      rawLabel: 'prompt-library',
      type: 'reference',
    })
  })

  it('uses sensible defaults for URI labels, file URLs, columns, and trailing directories', () => {
    expect(
      createPromptReferenceToken('@browser-use', 'plugin://browser-use@openai-bundled'),
    ).toEqual({
      href: 'plugin://browser-use@openai-bundled',
      kind: 'plugin',
      label: 'Browser',
      rawLabel: '@browser-use',
      type: 'reference',
    })
    expect(createPromptReferenceToken('@computer-use', 'app://computer-use')).toEqual({
      href: 'app://computer-use',
      kind: 'app',
      label: 'Computer',
      rawLabel: '@computer-use',
      type: 'reference',
    })
    expect(
      createPromptReferenceToken(
        'settings.json:12:4',
        'file:///Users/arishi/personal/promptrc/.vscode/settings.json:12:4',
      ),
    ).toEqual({
      columnNumber: 4,
      href: 'file:///Users/arishi/personal/promptrc/.vscode/settings.json:12:4',
      kind: 'file',
      label: 'settings.json',
      lineNumber: 12,
      rawLabel: 'settings.json:12:4',
      type: 'reference',
    })
    expect(createPromptReferenceToken('src/', '/Users/arishi/personal/promptrc/src/')).toEqual({
      href: '/Users/arishi/personal/promptrc/src/',
      kind: 'directory',
      label: 'src',
      rawLabel: 'src/',
      type: 'reference',
    })
  })

  it('falls back to raw file URL paths when percent escapes are malformed', () => {
    expect(createPromptReferenceToken('notes.md', 'file:///tmp/100%/notes.md')).toEqual({
      href: 'file:///tmp/100%/notes.md',
      kind: 'file',
      label: 'notes.md',
      rawLabel: 'notes.md',
      type: 'reference',
    })
  })

  it('preserves Windows drive-letter skill and file references', () => {
    expect(
      createPromptReferenceToken('$to-prd', 'C:/Users/arishi/.agents/skills/to-prd/SKILL.md'),
    ).toEqual({
      href: 'C:/Users/arishi/.agents/skills/to-prd/SKILL.md',
      kind: 'skill',
      label: 'To Prd',
      rawLabel: '$to-prd',
      type: 'reference',
    })
    expect(
      createPromptReferenceToken(
        'prompt-body-markdown.tsx:42',
        'C:/Users/arishi/promptrc/src/features/prompt-library/rendering/prompt-body-markdown.tsx:42',
      ),
    ).toEqual({
      href: 'C:/Users/arishi/promptrc/src/features/prompt-library/rendering/prompt-body-markdown.tsx:42',
      kind: 'file',
      label: 'prompt-body-markdown.tsx',
      lineNumber: 42,
      rawLabel: 'prompt-body-markdown.tsx:42',
      type: 'reference',
    })
  })

  it('leaves normal markdown links alone and preserves app-style hrefs', () => {
    expect(createPromptReferenceToken('the docs', 'https://example.com')).toBeNull()
    expect(shouldPreservePromptReferenceHref('https://example.com')).toBe(false)
    expect(shouldPreservePromptReferenceHref('plugin://github@openai-curated')).toBe(true)
    expect(shouldPreservePromptReferenceHref('app://github')).toBe(true)
    expect(shouldPreservePromptReferenceHref('file:///Users/arishi/file.ts')).toBe(true)
    expect(shouldPreservePromptReferenceHref('C:/Users/arishi/file.ts')).toBe(true)
  })
})
