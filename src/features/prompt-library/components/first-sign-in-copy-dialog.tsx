'use client'

import { useCallback } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  usePromptLibraryClient,
  usePromptLibraryStore,
} from '@/features/prompt-library/components/prompt-library-provider'
import { echo } from '@/lib/echo'

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
      echo(`Copied ${promptCount} ${promptCount === 1 ? 'entry' : 'entries'} into your account`)
    } catch (error) {
      echo(`Couldn’t copy — ${library.reportError(error)}`)
    }
  }, [library, promptCount])

  const declineCopy = useCallback(async () => {
    try {
      await library.declineFirstSignInCopy()
      echo('Your synced library starts empty')
    } catch (error) {
      echo(`Couldn’t save that choice — ${library.reportError(error)}`)
    }
  }, [library])

  if (!isOpen) {
    return null
  }

  const entries = `${promptCount} ${promptCount === 1 ? 'entry' : 'entries'}`

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="gap-0 p-0 sm:max-w-[520px]"
        // y / n answer the prompt, like any good installer.
        onKeyDown={(event) => {
          if (isBusy) {
            return
          }

          if (event.key === 'y') {
            event.preventDefault()
            void acceptCopy()
          } else if (event.key === 'n') {
            event.preventDefault()
            void declineCopy()
          }
        }}
        showCloseButton={false}
      >
        <DialogTitle className="pane-title text-accent">first sign-in</DialogTitle>
        <div className="px-[2ch] pt-5 pb-4 text-[13px] leading-[1.75]">
          <p className="text-fg-dim">
            <span className="text-fg-faint">$</span> promptrc sync --from=this-browser
          </p>
          <DialogDescription className="mt-1 text-fg-dim">
            found <span className="font-bold text-fg">{entries}</span> here that aren’t in your
            account yet.
            <br />
            <span className="text-fg-faint"># nothing on this device is removed either way</span>
          </DialogDescription>
          {firstSignInCopy.error ? (
            <p className="mt-2 text-red">error: {firstSignInCopy.error}</p>
          ) : null}
          <p className="mt-3 text-fg">
            copy {promptCount === 1 ? 'it' : `all ${promptCount}`} into your account?{' '}
            <span className="text-fg-dim">[Y/n]</span>{' '}
            {isBusy ? (
              <span className="text-yellow">copying…</span>
            ) : (
              <span className="cursor-block" />
            )}
          </p>
          <div className="mt-4 flex justify-end gap-[2ch]">
            <Button disabled={isBusy} onClick={declineCopy} type="button" variant="ghost">
              n · start empty
            </Button>
            <Button
              // The prompt waits for an answer; focus the default one.
              // oxlint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              disabled={isBusy}
              onClick={acceptCopy}
              type="button"
            >
              Y · copy {promptCount === 1 ? 'it' : `all ${promptCount}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
