import promptBenchmarks from './prompt-benchmarks.md?raw'
import promptChaining from './prompt-chaining.md?raw'
import promptTemplates from './prompt-templates.md?raw'

export type Guide = {
  /** The last segment of its URL: `/guides/<slug>`. */
  slug: string
  /** The page's heading and its title in search results. */
  title: string
  /** One or two sentences for the search snippet and the guides index. */
  description: string
  /** ISO dates, for the article's structured data. */
  published: string
  updated: string
  /** Markdown, rendered the way an entry's body is. */
  body: string
}

/**
 * Each guide explains a technique people search for and shows how promptrc
 * handles it. A new guide needs an entry here and a route file under
 * `src/routes/` (a static route, so the sitemap picks it up).
 */
export const GUIDES = {
  'prompt-templates': {
    slug: 'prompt-templates',
    title: 'Prompt templates with variables',
    description:
      'Write a prompt once and reuse it: how to mark the parts that change as variables, give them fallbacks, and keep pasted material apart from instructions.',
    published: '2026-11-10',
    updated: '2026-11-10',
    body: promptTemplates,
  },
  'prompt-chaining': {
    slug: 'prompt-chaining',
    title: 'Prompt chaining: split one big prompt into steps',
    description:
      'When to break a prompt into a sequence of messages, three chains worth keeping for planning, research and writing, and how to write a good step.',
    published: '2026-11-10',
    updated: '2026-11-10',
    body: promptChaining,
  },
  'prompt-benchmarks': {
    slug: 'prompt-benchmarks',
    title: 'How to benchmark a prompt across AI models',
    description:
      'A repeatable test for a prompt: a fixed input, a rubric written first, and a log of runs, so you know when a model update breaks what worked.',
    published: '2026-11-10',
    updated: '2026-11-10',
    body: promptBenchmarks,
  },
} as const satisfies Record<string, Guide>

export type GuideSlug = keyof typeof GUIDES

export const GUIDE_LIST: readonly Guide[] = Object.values(GUIDES)
