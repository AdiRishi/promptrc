import { useMemo } from 'react'

import { createPromptLibraryCommandExecutor } from '@/features/prompt-library/commands/prompt-library-command-executor'
import {
  usePromptLibraryClient,
  usePromptLibraryMeta,
  usePromptLibraryStoreApi,
} from '@/features/prompt-library/components/prompt-library-provider'
import { echo } from '@/lib/echo'

export function usePromptLibraryCommands() {
  const library = usePromptLibraryClient()
  const { titleInputRef } = usePromptLibraryMeta()
  const store = usePromptLibraryStoreApi()

  return useMemo(
    () =>
      createPromptLibraryCommandExecutor({
        clipboard: {
          writeText: (value) => navigator.clipboard.writeText(value),
        },
        focusTitleInput: () => titleInputRef.current?.focus(),
        getShareUrl: (shareId) => new URL(`/share/${shareId}`, window.location.origin).toString(),
        library,
        notify: echo,
        store,
      }),
    [library, store, titleInputRef],
  )
}
