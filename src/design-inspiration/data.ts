export type Prompt = {
  id: string
  title: string
  body: string
  category: string
  tags: string[]
  createdAt: string // ISO
  updatedAt: string // ISO
  uses: number
}

export const DEFAULT_CATEGORIES = [
  'Engineering',
  'Writing',
  'Thinking',
  'Teaching',
  'Product',
  'Career',
  'Personal',
  'Communication',
] as const

// Seed set — used on first launch only. Once the user has their own library,
// localStorage takes over and these never re-appear.
export const SEED_PROMPTS: Prompt[] = [
  {
    id: 'seed-cartographer',
    title: 'The Cartographer',
    category: 'Engineering',
    body: 'You are tasked with mapping an unfamiliar codebase. Begin by locating the README and entry points. Spend no more than five minutes skimming. Then, choose the three files most likely to contain architectural decisions and read them in full. Produce a 200-word tour aimed at a new engineer joining the team next week.',
    tags: ['research', 'onboarding'],
    createdAt: '2026-03-12T10:00:00.000Z',
    updatedAt: '2026-03-12T10:00:00.000Z',
    uses: 0,
  },
  {
    id: 'seed-second-draft',
    title: 'Second-Draft Editor',
    category: 'Writing',
    body: "Treat the draft below as a stranger's work. Read it once without a pen. Then, on a second pass, tighten only what obstructs the reader: cut hedges, break run-ons, replace abstractions with the concrete image nearest to hand. Preserve the author's voice. Change no facts.",
    tags: ['editing'],
    createdAt: '2026-03-08T10:00:00.000Z',
    updatedAt: '2026-03-08T10:00:00.000Z',
    uses: 0,
  },
  {
    id: 'seed-socratic',
    title: 'Socratic Partner',
    category: 'Thinking',
    body: 'Do not answer. For every claim I make, ask one question that would falsify it if answered poorly. Keep going until I have either retracted the claim, qualified it, or offered evidence I would still accept an hour from now.',
    tags: ['debate', 'reasoning'],
    createdAt: '2026-02-28T10:00:00.000Z',
    updatedAt: '2026-02-28T10:00:00.000Z',
    uses: 0,
  },
  {
    id: 'seed-explainer',
    title: 'The Explainer',
    category: 'Teaching',
    body: 'Explain this concept as if to a curious 14-year-old who is already comfortable with algebra. Use one analogy. Do not apologize for simplifying. End with a single question they could not yet answer.',
    tags: ['clarity'],
    createdAt: '2026-02-19T10:00:00.000Z',
    updatedAt: '2026-02-19T10:00:00.000Z',
    uses: 0,
  },
  {
    id: 'seed-silent-review',
    title: 'Silent Code Review',
    category: 'Engineering',
    body: 'Review the diff below. Produce no praise. No summaries. Only: (a) issues that would block merge, (b) issues I should fix in a follow-up, (c) suggestions I am free to ignore. Label every comment with the file and line.',
    tags: ['review'],
    createdAt: '2026-02-11T10:00:00.000Z',
    updatedAt: '2026-02-11T10:00:00.000Z',
    uses: 0,
  },
  {
    id: 'seed-premortem',
    title: 'Product Pre-Mortem',
    category: 'Product',
    body: 'It is six months after launch. The feature has failed. Write a memo — no more than 600 words — explaining, to the rest of the company, the three reasons it failed. You are allowed no hindsight we could not have today.',
    tags: ['strategy'],
    createdAt: '2026-02-03T10:00:00.000Z',
    updatedAt: '2026-02-03T10:00:00.000Z',
    uses: 0,
  },
  {
    id: 'seed-translator',
    title: 'The Translator',
    category: 'Communication',
    body: 'Translate this technical writeup for a non-engineer stakeholder. Preserve every risk. Drop every word a software engineer would use only amongst themselves.',
    tags: ['stakeholder'],
    createdAt: '2025-12-19T10:00:00.000Z',
    updatedAt: '2025-12-19T10:00:00.000Z',
    uses: 0,
  },
  {
    id: 'seed-ruthless-outline',
    title: 'Ruthless Outline',
    category: 'Writing',
    body: 'Turn the notes below into an outline with exactly five top-level points and no more than three sub-points each. Any idea that does not fit is cut, not squeezed.',
    tags: ['structure'],
    createdAt: '2025-12-11T10:00:00.000Z',
    updatedAt: '2025-12-11T10:00:00.000Z',
    uses: 0,
  },
]
