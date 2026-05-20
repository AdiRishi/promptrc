import { Kbd } from '@/components/ui/kbd'

type PromptCommandBarProps = {
  filteredCount: number
  totalCount: number
  query: string
  searchFocused: boolean
  searchInputRef: React.RefObject<HTMLInputElement | null>
  onFocusChange: (focused: boolean) => void
  onQueryChange: (value: string) => void
}

export function PromptCommandBar({
  filteredCount,
  totalCount,
  query,
  searchFocused,
  searchInputRef,
  onFocusChange,
  onQueryChange,
}: PromptCommandBarProps) {
  return (
    <>
      <div
        className="relative mb-5 flex items-center gap-2 border border-border bg-card px-4 py-3"
        data-focused={searchFocused ? 'true' : 'false'}
      >
        <span className="font-semibold text-accent-foreground">~/.promptrc</span>
        <span className="text-primary">$ grep -r</span>

        <div className="relative min-w-0 flex-1">
          <input
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground focus:text-transparent focus:caret-transparent focus:selection:bg-primary/30 focus:selection:text-foreground focus:placeholder:text-transparent"
            onBlur={() => onFocusChange(false)}
            onChange={(event) => {
              onQueryChange(event.target.value)
            }}
            onFocus={() => onFocusChange(true)}
            placeholder="search title, body, or #tag - press / to focus"
            ref={searchInputRef}
            value={query}
          />

          {searchFocused ? (
            <span className="pointer-events-none absolute inset-0 flex items-center overflow-hidden text-[14px] whitespace-pre text-foreground">
              <span className="truncate">{query}</span>
              <span className="ml-[1px] h-4 w-[9px] animate-[terminal-blink_1s_steps(1)_infinite] bg-primary" />
            </span>
          ) : null}
        </div>

        <Kbd>/</Kbd>
      </div>

      <div className="mb-4 text-[12px] text-muted-foreground">
        <span className="text-accent-foreground">[ok]</span> matched{' '}
        <span className="text-primary">{filteredCount}</span> of{' '}
        <span className="text-primary">{totalCount}</span>
        <span className="opacity-85">
          {' '}
          - press <Kbd className="mx-1 align-middle">n</Kbd> to create -{' '}
          <Kbd className="mx-1 align-middle">?</Kbd> for keys
        </span>
      </div>
    </>
  )
}
