import { Show, UserButton } from '@clerk/tanstack-react-start'
import { Cloud, HardDrive, LogIn } from 'lucide-react'
import { FaGithub } from 'react-icons/fa'

import { TerminalChromeBar, TerminalTrafficLights } from '@/components/terminal-chrome'
import { type PromptSyncMode, type PromptSyncStatus } from '@/features/prompt-library/types'
import { SITE_GITHUB_URL } from '@/lib/site-config'

type PromptTopBarProps = {
  promptCount: number
  syncMode: PromptSyncMode
  syncStatus: PromptSyncStatus
}

export function PromptTopBar({ promptCount, syncMode, syncStatus }: PromptTopBarProps) {
  const SyncIcon = syncMode === 'remote' ? Cloud : HardDrive
  const syncText =
    syncMode === 'remote'
      ? syncStatus === 'loading'
        ? 'syncing'
        : syncStatus === 'error'
          ? 'sync error'
          : 'cloud'
      : 'local'

  return (
    <TerminalChromeBar>
      <TerminalTrafficLights />

      <div className="ml-[14px] min-w-0 text-[12px] tracking-[0.05em] text-muted-foreground">
        <span className="font-medium text-foreground">~/.promptrc</span>{' '}
        <span className="text-primary">·</span> zsh
      </div>

      <div className="ml-auto hidden items-center gap-3 text-[11px] tracking-[0.04em] text-muted-foreground sm:flex">
        <a
          aria-label="View promptrc on GitHub"
          className="inline-flex size-6 items-center justify-center rounded-[2px] border border-border bg-card/70 text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          href={SITE_GITHUB_URL}
          rel="noreferrer"
          target="_blank"
        >
          <FaGithub aria-hidden="true" className="size-3.5" />
        </a>
        <span>
          {promptCount} {promptCount === 1 ? 'Prompt' : 'Prompts'}
        </span>
        <span className="flex items-center gap-1.5">
          <SyncIcon aria-hidden="true" className="size-3 text-accent-foreground" />
          <span className={syncStatus === 'error' ? 'text-destructive' : undefined}>
            {syncText}
          </span>
        </span>
      </div>

      <div className="flex min-w-[34px] items-center justify-end">
        <Show when="signed-out">
          <a
            className="inline-flex h-7 items-center gap-1.5 rounded-[2px] border border-border bg-card px-2.5 text-[11px] text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            href="/sign-in"
          >
            <LogIn aria-hidden="true" className="size-3" />
            <span>login</span>
          </a>
        </Show>
        <Show when="signed-in">
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: 'size-7 rounded-[2px]',
                userButtonTrigger:
                  'rounded-[2px] border border-border focus-visible:ring-2 focus-visible:ring-ring',
              },
            }}
          />
        </Show>
      </div>
    </TerminalChromeBar>
  )
}
