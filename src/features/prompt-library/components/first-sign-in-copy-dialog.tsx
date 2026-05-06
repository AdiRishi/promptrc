'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  usePromptLibraryClient,
  usePromptLibraryStore,
} from '@/features/prompt-library/components/prompt-library-provider'

export function FirstSignInCopyDialog() {
  const library = usePromptLibraryClient()
  const firstSignInCopy = usePromptLibraryStore((state) => state.firstSignInCopy)
  const isBusy = firstSignInCopy.status === 'copying'
  const isOpen =
    firstSignInCopy.status === 'prompting' ||
    firstSignInCopy.status === 'copying' ||
    firstSignInCopy.status === 'error'
  const promptCount = firstSignInCopy.localPrompts.length

  const acceptCopy = useCallback(async () => {
    try {
      await library.acceptFirstSignInCopy()
      toast(`copied ${promptCount} ${promptCount === 1 ? 'prompt' : 'prompts'} to cloud`)
    } catch (error) {
      toast(`copy failed - ${library.reportError(error)}`)
    }
  }, [library, promptCount])

  const declineCopy = useCallback(async () => {
    try {
      await library.declineFirstSignInCopy()
      toast('cloud library started empty')
    } catch (error) {
      toast(`choice failed - ${library.reportError(error)}`)
    }
  }, [library])

  if (!isOpen) {
    return null
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="gap-5 rounded-[4px] border border-border bg-card p-0 shadow-xl sm:max-w-[460px]"
        showCloseButton={false}
      >
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="text-[15px] text-foreground">
            Copy local Prompt Library?
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-6">
            You have {promptCount} local {promptCount === 1 ? 'Prompt' : 'Prompts'}. Copy them into
            your cloud Prompt Library, or start cloud empty.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 text-[12px] leading-6 text-muted-foreground">
          Local Prompts stay on this browser either way.
          {firstSignInCopy.error ? (
            <div className="mt-3 border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
              {firstSignInCopy.error}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border px-5 py-4">
          <Button disabled={isBusy} onClick={declineCopy} size="sm" type="button" variant="outline">
            Continue empty
          </Button>
          <Button disabled={isBusy} onClick={acceptCopy} size="sm" type="button">
            {isBusy ? 'Copying...' : 'Copy local Prompts'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
