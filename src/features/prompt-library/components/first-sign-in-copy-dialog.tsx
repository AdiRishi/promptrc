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
      toast(`Copied ${promptCount} ${promptCount === 1 ? 'entry' : 'entries'} into your account`)
    } catch (error) {
      toast(`Couldn’t copy — ${library.reportError(error)}`)
    }
  }, [library, promptCount])

  const declineCopy = useCallback(async () => {
    try {
      await library.declineFirstSignInCopy()
      toast('Your synced library starts empty')
    } catch (error) {
      toast(`Couldn’t save that choice — ${library.reportError(error)}`)
    }
  }, [library])

  if (!isOpen) {
    return null
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent className="gap-5 sm:max-w-[460px]" showCloseButton={false}>
        <DialogHeader>
          <p className="label-caps text-vermilion">First sign-in</p>
          <DialogTitle>Bring your book with you?</DialogTitle>
          <DialogDescription>
            This browser holds {promptCount} {promptCount === 1 ? 'entry' : 'entries'} that aren’t
            in your account yet. Copy them in to have them everywhere, or start your synced library
            empty.
          </DialogDescription>
        </DialogHeader>

        <div className="text-[12.5px] leading-relaxed text-ink-muted">
          Nothing on this device is removed either way.
          {firstSignInCopy.error ? (
            <div className="mt-3 rounded-lg bg-verdict-fail/10 px-3 py-2 text-verdict-fail">
              {firstSignInCopy.error}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button disabled={isBusy} onClick={declineCopy} type="button" variant="ghost">
            Start empty
          </Button>
          <Button disabled={isBusy} onClick={acceptCopy} type="button">
            {isBusy ? 'Copying…' : `Copy ${promptCount === 1 ? 'it' : `all ${promptCount}`}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
