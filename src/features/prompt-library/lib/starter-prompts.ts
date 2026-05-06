import { generatePromptId } from '@/features/prompt-library/lib/prompt-library-utils'
import { type PromptRecord } from '@/features/prompt-library/types'

type StarterPromptDefinition = {
  title: string
  body: string
  category: string
  tags: string[]
}

const STARTER_PROMPT_DEFINITIONS = [
  {
    title: 'Start Here',
    category: 'Onboarding',
    tags: ['onboarding', 'workflow', 'promptrc'],
    body: `You are in promptrc, a terminal-inspired Prompt Library.

Use this space to keep Prompts you reuse often. Browse Categories in the tree, search by title, Prompt Body, Category, or Tag, then copy a Prompt Body when it is time to use it elsewhere.

Try searching for "prd", "bug", or "#stakeholder". Press n to create your own Prompt when you are ready.`,
  },
  {
    title: 'Bug Hunt',
    category: 'Engineering',
    tags: ['debugging', 'testing', 'root-cause'],
    body: `Act as a senior engineer debugging a tricky defect.

Start by restating the observed behavior and expected behavior. List the highest-probability causes, then design the smallest reproduction that could distinguish between them. Ask for missing logs, inputs, or environment details only when they would change the next step.

Finish with a concrete fix plan and the regression tests that should prove the issue stays fixed.`,
  },
  {
    title: 'PRD Shaper',
    category: 'Product',
    tags: ['prd', 'scope', 'requirements'],
    body: `Turn the notes below into a sharp PRD.

Clarify the problem, user stories, success criteria, constraints, and out-of-scope work. Preserve uncertainty as open questions instead of inventing false precision. Make the smallest useful first release obvious, then call out follow-up slices that can wait.`,
  },
  {
    title: 'Executive Summary',
    category: 'Writing',
    tags: ['summary', 'stakeholder', 'brief'],
    body: `Write an executive summary for the material below.

Lead with the decision or most important takeaway. Keep the tone calm and direct. Use short paragraphs, name risks plainly, and separate confirmed facts from recommendations. Close with the next action and owner when they are known.`,
  },
  {
    title: 'Decision Partner',
    category: 'Thinking',
    tags: ['decision', 'tradeoffs', 'strategy'],
    body: `Help me make this decision.

Frame the real choice, identify the constraints, and compare the strongest options. For each option, explain upside, downside, reversibility, and what evidence would change the call. End with a recommendation and a short "watch for" list.`,
  },
  {
    title: 'Difficult Reply',
    category: 'Communication',
    tags: ['reply', 'conflict', 'stakeholder'],
    body: `Draft a difficult reply that stays kind, clear, and firm.

Preserve the relationship without blurring the boundary. Acknowledge the other person's concern, state the decision or constraint plainly, and offer the most useful next step. Avoid over-apologizing or sounding defensive.`,
  },
] satisfies StarterPromptDefinition[]

export const STARTER_PROMPT_TITLES = STARTER_PROMPT_DEFINITIONS.map((prompt) => prompt.title) as [
  string,
  string,
  string,
  string,
  string,
  string,
]

export const START_HERE_PROMPT_TITLE = STARTER_PROMPT_TITLES[0]

export const createStarterPrompts = (): PromptRecord[] => {
  const now = new Date().toISOString()

  return STARTER_PROMPT_DEFINITIONS.map((prompt) => ({
    ...prompt,
    id: generatePromptId(),
    createdAt: now,
    updatedAt: now,
    uses: 0,
  }))
}

export const getStartHerePrompt = (prompts: PromptRecord[]) => {
  return prompts.find((prompt) => prompt.title === START_HERE_PROMPT_TITLE) ?? null
}

export const hasStarterPrompts = (prompts: PromptRecord[]) => {
  const promptTitles = new Set(prompts.map((prompt) => prompt.title))

  return STARTER_PROMPT_TITLES.every((title) => promptTitles.has(title))
}
