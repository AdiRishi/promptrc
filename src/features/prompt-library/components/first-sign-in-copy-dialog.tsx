'use client'

import { useCallback } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { KeyAction, KeyActionBar } from '@/components/ui/key-action'
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
        className="gap-0 p-0 sm:max-w-[60ch]"
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
        <DialogTitle className="pane-title text-meta font-normal text-fg-dim">
          first sign-in
        </DialogTitle>
        <div className="px-[3ch] pt-6 pb-4">
          <p className="text-meta text-fg-faint">$ promptrc sync --from=this-browser</p>
          <DialogDescription className="mt-2 text-fg-dim">
            Found <span className="font-semibold text-fg">{entries}</span> here that aren’t in your
            account yet. Nothing on this device is removed either way.
          </DialogDescription>
          {firstSignInCopy.error ? (
            <p className="mt-2 text-red">error: {firstSignInCopy.error}</p>
          ) : null}
          <p className="mt-4 text-fg">
            Copy {promptCount === 1 ? 'it' : `all ${promptCount}`} into your account?{' '}
            <span className="text-fg-faint">[Y/n]</span>{' '}
            {isBusy ? (
              <span className="text-fg-dim">copying…</span>
            ) : (
              <span className="cursor-block cursor-blink" />
            )}
          </p>
        </div>
        <KeyActionBar className="mx-0 border-t border-line px-[2ch] py-2">
          <KeyAction
            disabled={isBusy}
            keys={['Y']}
            label={`copy ${promptCount === 1 ? 'it' : `all ${promptCount}`}`}
            onClick={acceptCopy}
            primary
          />
          <KeyAction disabled={isBusy} keys={['n']} label="start empty" onClick={declineCopy} />
        </KeyActionBar>
      </DialogContent>
    </Dialog>
  )
}
