import { generatePromptId } from '@/features/prompt-library/model/prompt-library-integrity'
import { joinSequenceSteps } from '@/features/prompt-library/model/prompt-sequences'
import { type PromptKind, type PromptRecord } from '@/features/prompt-library/types'

type StarterPromptDefinition = {
  kind: PromptKind
  title: string
  body: string
  notes: string
  category: string
  tags: string[]
  pinned?: boolean
}

/**
 * Starter Prompts are real Prompts, added once to a Fresh Prompt Library. Between
 * them they show every kind, template variables, and the capture workflow.
 */
const STARTER_PROMPT_DEFINITIONS = [
  {
    kind: 'prompt',
    title: 'Start Here',
    category: 'Onboarding',
    tags: ['onboarding', 'promptrc'],
    pinned: true,
    body: `promptrc is a place for the prompts that worked — the things worth keeping from working with AI, before they slip away.

Four kinds of things are worth keeping:

- **Prompts** — reusable instructions. Write \`{{variables}}\` for the parts that change, like {{your_name | friend}}, and fill them in before you yank.
- **Fragments** — a turn of phrase that landed exactly right.
- **Sequences** — an ordered chain of instructions, yanked one step at a time.
- **Benchmarks** — a reproducible test with an expected result and a log of runs.

It drives like a terminal:

- **c** captures a thought in seconds, **y** yanks the selection to your clipboard, **r** flips between rendered and raw.
- **j** / **k** move, **1** **2** **3** jump between panes, **⌘K** finds anything.
- **:** opens the command line — try \`:sequences\`, \`:colorscheme phosphor\` or \`:new benchmark\`.
- **?** opens the manual.`,
    notes:
      'Pinned so it stays at the top. Unpin it with p, or delete it with x pressed twice (or :rm!) — it is yours now.',
  },
  {
    kind: 'prompt',
    title: 'Bug Hunt',
    category: 'Engineering',
    tags: ['debugging', 'root-cause'],
    body: `Act as a senior engineer debugging a tricky defect.

Observed: {{observed}}
Expected: {{expected}}

Restate the gap in one sentence. List the highest-probability causes, then design the smallest reproduction that could tell them apart. Ask for logs or inputs only when they would change the next step.

Finish with a concrete fix plan and the regression test that proves it stays fixed.`,
    notes:
      'Forcing "the smallest reproduction that could tell them apart" stops the model from guessing a fix before it understands the bug.',
  },
  {
    kind: 'fragment',
    title: 'Preserve uncertainty',
    category: 'Writing',
    tags: ['precision', 'tone'],
    body: 'Preserve uncertainty as open questions instead of inventing false precision.',
    notes:
      'Append to any summarising or planning prompt. It keeps confident-sounding filler out of PRDs and status updates.',
  },
  {
    kind: 'sequence',
    title: 'Plan, critique, build',
    category: 'Engineering',
    tags: ['planning', 'review'],
    body: joinSequenceSteps([
      `Here is the task: {{task}}

Don't write code yet. Propose a plan as a numbered list of small, verifiable steps, and name the riskiest assumption.`,
      `Now argue against your own plan. What breaks first, what did you over-engineer, and what would a reviewer push back on? Revise the plan.`,
      `Implement the revised plan one step at a time. After each step, say how you verified it before moving on.`,
    ]),
    notes:
      'Separating planning from critique gets noticeably better plans than asking for both in one message.',
  },
  {
    kind: 'benchmark',
    title: 'Executive summary under pressure',
    category: 'Writing',
    tags: ['summary', 'stakeholder'],
    body: `Write an executive summary of the incident notes below for a VP who has 30 seconds.

Lead with the decision they need to make. Separate confirmed facts from guesses. Name the owner of the next action.

{{incident_notes}}`,
    notes: `Pass — the first sentence is the decision, facts and guesses are visibly separated, and an owner is named.
Mixed — accurate, but the decision is buried or the owner is missing.
Fail — restates the timeline, or presents guesses as facts.`,
  },
  {
    kind: 'prompt',
    title: 'Difficult Reply',
    category: 'Communication',
    tags: ['reply', 'stakeholder'],
    body: `Draft a reply to {{person}} that stays kind, clear, and firm.

The decision: {{decision}}

Acknowledge their concern, state the decision plainly, and offer the single most useful next step. Don't over-apologise or sound defensive.`,
    notes: 'Works best when you paste their original message underneath.',
  },
] satisfies StarterPromptDefinition[]

export const STARTER_PROMPT_TITLES = STARTER_PROMPT_DEFINITIONS.map((prompt) => prompt.title)

export const START_HERE_PROMPT_TITLE = 'Start Here'

export const createStarterPrompts = (): PromptRecord[] => {
  const newestTimestamp = Date.now()

  return STARTER_PROMPT_DEFINITIONS.map((prompt: StarterPromptDefinition, index) => {
    const timestamp = new Date(newestTimestamp - index).toISOString()

    return {
      kind: prompt.kind,
      title: prompt.title,
      body: prompt.body,
      notes: prompt.notes,
      category: prompt.category,
      tags: prompt.tags,
      id: generatePromptId(),
      images: [],
      runs: [],
      pinned: prompt.pinned ?? false,
      createdAt: timestamp,
      updatedAt: timestamp,
      uses: 0,
    }
  })
}

export const getStartHerePrompt = (prompts: PromptRecord[]) => {
  return prompts.find((prompt) => prompt.title === START_HERE_PROMPT_TITLE) ?? null
}

export const hasStarterPrompts = (prompts: PromptRecord[]) => {
  const promptTitles = new Set(prompts.map((prompt) => prompt.title))

  return STARTER_PROMPT_TITLES.every((title) => promptTitles.has(title))
}
