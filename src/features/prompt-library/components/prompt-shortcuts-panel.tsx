import { PromptShortcutButtonRow } from '@/features/prompt-library/components/prompt-shortcut-row'

export type PromptShortcutDefinition = {
  disabled: boolean
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
          <PromptShortcutButtonRow
            disabled={shortcut.disabled}
            key={`${shortcut.label}-${shortcut.keys.join('-')}`}
            onClick={shortcut.action}
            keys={shortcut.keys}
            label={shortcut.label}
          />
        ))}
      </div>
    </aside>
  )
}
