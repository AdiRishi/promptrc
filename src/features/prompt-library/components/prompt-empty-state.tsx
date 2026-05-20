import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { Kbd } from '@/components/ui/kbd'

type PromptEmptyStateProps = {
  emptyReason: 'no-prompts' | 'no-query-matches'
  query: string
  onStartNew: () => void
}

export function PromptEmptyState({ emptyReason, query, onStartNew }: PromptEmptyStateProps) {
  const isNoMatch = emptyReason === 'no-query-matches'

  return (
    <Empty className="items-start justify-start border border-dashed border-border bg-card/55 px-8 py-9 text-left">
      <EmptyHeader className="items-start gap-2">
        <EmptyTitle className="text-[12px] tracking-[0.15em] text-accent-foreground uppercase">
          {isNoMatch ? '// no matching Prompts' : '// Prompt Library is empty'}
        </EmptyTitle>
        <EmptyDescription className="max-w-none text-[13px] text-muted-foreground">
          {isNoMatch ? (
            <>
              No Prompts matched <span className="text-primary">"{query}"</span>.
            </>
          ) : (
            <>
              Press <Kbd className="mx-1 align-middle">n</Kbd> to create your first Prompt.
            </>
          )}
        </EmptyDescription>
      </EmptyHeader>
      {isNoMatch ? null : (
        <EmptyContent className="items-start">
          <Button onClick={onStartNew} size="sm" type="button">
            n - New Prompt
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}
