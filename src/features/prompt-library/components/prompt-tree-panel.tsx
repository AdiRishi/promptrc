import { filenameOf } from '@/features/prompt-library/lib/prompt-library-utils'
import { type PromptRecord } from '@/features/prompt-library/types'

type PromptTreePanelProps = {
  categoryKeys: string[]
  groupedPrompts: Record<string, PromptRecord[]>
  filteredCount: number
  totalCount: number
  selectedPromptId: string | null
  query: string
  isComposerOpen: boolean
  onSelectPrompt: (promptId: string) => void
  onClearQuery: () => void
}

export function PromptTreePanel({
  categoryKeys,
  groupedPrompts,
  filteredCount,
  totalCount,
  selectedPromptId,
  query,
  isComposerOpen,
  onSelectPrompt,
  onClearQuery,
}: PromptTreePanelProps) {
  return (
    <aside className="order-2 min-w-0 overflow-hidden border-b border-border bg-background/90 px-4 py-5 md:order-1 md:border-r md:border-b-0 md:px-5 xl:px-4">
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3 text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
        <span className="min-w-0 truncate">tree ~/.promptrc</span>
        <span className="text-primary">
          {filteredCount} / {totalCount}
        </span>
      </div>

      <div className="min-w-0 text-[13px] leading-[1.9]">
        <div className="mb-1 truncate text-muted-foreground">~/.promptrc</div>

        {categoryKeys.length === 0 ? (
          <div className="flex flex-col items-start gap-2 px-1 py-3 text-[12px] text-muted-foreground">
            {totalCount === 0 ? (
              <span>no prompts yet - press `n`</span>
            ) : (
              <>
                <span>
                  no matches for <span className="text-primary">"{query}"</span>
                </span>
                <button
                  className="rounded-[2px] border border-border px-2 py-1 text-[11px] transition-colors hover:border-primary hover:text-primary"
                  onClick={onClearQuery}
                  type="button"
                >
                  clear
                </button>
              </>
            )}
          </div>
        ) : null}

        {categoryKeys.map((category, categoryIndex) => {
          const prompts = groupedPrompts[category]

          return (
            <div key={category}>
              <div className="mt-2 flex min-w-0 items-center font-medium text-accent-foreground">
                <span className="mr-1 shrink-0 text-muted-foreground">
                  {categoryIndex === categoryKeys.length - 1 ? '└──' : '├──'}
                </span>
                <span className="min-w-0 truncate">{category.toLowerCase()}/</span>
              </div>

              {prompts.map((prompt, promptIndex) => {
                const isLastCategory = categoryIndex === categoryKeys.length - 1
                const isLastPrompt = promptIndex === prompts.length - 1
                const branchPrefix = isLastCategory ? '    ' : '│   '
                const branch = isLastPrompt ? '└──' : '├──'

                return (
                  <button
                    aria-current={selectedPromptId === prompt.id ? 'true' : undefined}
                    className="flex w-full min-w-0 items-center gap-0 overflow-hidden rounded-[2px] px-1.5 py-0.5 text-left transition-colors hover:bg-primary/8 aria-[current=true]:bg-primary/14 aria-[current=true]:text-primary"
                    key={prompt.id}
                    onClick={() => {
                      if (isComposerOpen) {
                        return
                      }

                      onSelectPrompt(prompt.id)
                    }}
                    type="button"
                  >
                    <span className="shrink-0 whitespace-pre text-muted-foreground">
                      {branchPrefix}
                      {branch}
                    </span>
                    <span className="min-w-0 truncate">{filenameOf(prompt.title)}.md</span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
