import { Kbd, KbdGroup } from '@/components/ui/kbd'

export type PromptShortcutDefinition = {
  keys: string[]
  label: string
  action: () => void
}

type PromptShortcutsPanelProps = {
  shortcuts: PromptShortcutDefinition[]
}

export function PromptShortcutsPanel({ shortcuts }: PromptShortcutsPanelProps) {
  return (
    <aside className="order-3 border-t border-border bg-background/85 px-4 py-5 xl:order-3 xl:border-t-0 xl:border-l xl:px-5">
      <h2 className="mb-4 text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
        Quick Actions
      </h2>

      <div className="flex flex-col gap-1">
        {shortcuts.map((shortcut) => (
          <button
            className="grid grid-cols-[74px_1fr] items-center gap-3 rounded-[4px] px-2 py-1.5 text-left transition-colors hover:bg-primary/8 active:bg-primary/14"
            key={`${shortcut.label}-${shortcut.keys.join('-')}`}
            onClick={shortcut.action}
            title="click, or press the shortcut"
            type="button"
          >
            <KbdGroup className="flex-wrap gap-1">
              {shortcut.keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </KbdGroup>

            <span className="truncate text-[12px]">{shortcut.label}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
