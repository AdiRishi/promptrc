import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { KeyCombo } from '@/components/ui/kbd'
import {
  PROMPT_LIBRARY_HELP_GROUPS,
  getPromptLibraryCommand,
} from '@/features/prompt-library/commands/prompt-library-command-surface'

type KeyboardSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** The printed reference card: every key, grouped by what you're doing. */
export function KeyboardSheet({ open, onOpenChange }: KeyboardSheetProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="gap-0 p-0 sm:max-w-[640px]">
        <div className="border-b border-rule px-7 pt-6 pb-4">
          <DialogTitle className="text-[28px] italic">Keys</DialogTitle>
          <DialogDescription className="mt-1">
            Single letters act on the selected entry. Nothing fires while you are typing.
          </DialogDescription>
        </div>
        <div className="grid gap-x-10 gap-y-6 px-7 py-6 sm:grid-cols-2">
          {PROMPT_LIBRARY_HELP_GROUPS.map((group, groupIndex) => (
            <section
              className="animate-rise"
              key={group.heading}
              style={{ animationDelay: `${groupIndex * 40}ms` }}
            >
              <h3 className="label-caps mb-2 text-vermilion">{group.heading}</h3>
              <ul className="flex flex-col">
                {getHelpRows(group).map((row) => (
                  <li
                    className="flex items-center justify-between gap-4 border-b border-dashed border-rule py-1.5 text-[13.5px] text-ink-soft last:border-0"
                    key={row.label}
                  >
                    <span>{row.label}</span>
                    <KeyCombo keys={row.keys} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const getHelpRows = (group: (typeof PROMPT_LIBRARY_HELP_GROUPS)[number]) => {
  const commandRows = group.commandIds.map((commandId) => {
    const command = getPromptLibraryCommand(commandId)

    return { keys: command.keys, label: command.label }
  })
  const extraRows = 'rows' in group ? group.rows : []

  return [...commandRows, ...extraRows]
}
