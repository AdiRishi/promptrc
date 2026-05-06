import { useMemo } from 'react'
import { toast } from 'sonner'

import {
  usePromptLibraryClient,
  usePromptLibraryMeta,
  usePromptLibraryStoreApi,
} from '@/features/prompt-library/components/prompt-library-provider'
import { createPromptLibraryCommandExecutor } from '@/features/prompt-library/lib/prompt-library-command-executor'

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
        library,
        notify: toast,
        store,
      }),
    [library, store, titleInputRef],
  )
}
