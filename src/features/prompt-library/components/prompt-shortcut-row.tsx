import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'

type PromptShortcutRowData = {
  keys: readonly string[]
  label: string
}

type PromptShortcutKeysProps = {
  className?: string
  keyClassName?: string
  keys: readonly string[]
}

function PromptShortcutKeys({ className, keyClassName, keys }: PromptShortcutKeysProps) {
  return (
    <KbdGroup className={cn('flex-wrap gap-1', className)}>
      {keys.map((key) => (
        <Kbd className={keyClassName} key={key}>
          {key}
        </Kbd>
      ))}
    </KbdGroup>
  )
}

type PromptShortcutButtonRowProps = PromptShortcutRowData & {
  disabled: boolean
  onClick: () => void
}

function PromptShortcutButtonRow({ disabled, keys, label, onClick }: PromptShortcutButtonRowProps) {
  return (
    <button
      className="grid grid-cols-[74px_1fr] items-center gap-3 rounded-[4px] px-2 py-1.5 text-left transition-colors hover:bg-primary/8 active:bg-primary/14 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
      disabled={disabled}
      onClick={onClick}
      title="click, or press the shortcut"
      type="button"
    >
      <PromptShortcutKeys keys={keys} />
      <span className="truncate text-[12px]">{label}</span>
    </button>
  )
}

function PromptShortcutHelpRow({ keys, label }: PromptShortcutRowData) {
  return (
    <li className="group grid grid-cols-[92px_1fr] items-center gap-4 rounded-[2px] px-1 py-[3px] transition-colors hover:bg-primary/8">
      <PromptShortcutKeys className="justify-start" keyClassName="min-w-[22px]" keys={keys} />
      <span className="text-[13px] text-foreground/85 transition-colors group-hover:text-foreground">
        {label}
      </span>
    </li>
  )
}

export { PromptShortcutButtonRow, PromptShortcutHelpRow, PromptShortcutKeys }
export type { PromptShortcutRowData }
