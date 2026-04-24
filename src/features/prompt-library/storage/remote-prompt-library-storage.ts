import { useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useCallback, useMemo } from 'react'

import {
  deleteRemotePrompt,
  incrementRemotePromptUses,
  listRemotePrompts,
  upsertRemotePrompt,
} from '@/features/prompt-library/server/prompt-library-functions'
import {
  type RemotePromptLibraryStorage,
  normalizeStorageError,
} from '@/features/prompt-library/storage/prompt-library-storage'

const getPromptLibraryQueryKey = (userId: string | null) =>
  ['prompt-library', 'prompts', userId ?? 'signed-out'] as const

export function useRemotePromptLibraryStorage(userId: string | null): RemotePromptLibraryStorage {
  const queryClient = useQueryClient()
  const listPrompts = useServerFn(listRemotePrompts)
  const upsertPrompt = useServerFn(upsertRemotePrompt)
  const removePrompt = useServerFn(deleteRemotePrompt)
  const incrementPromptUses = useServerFn(incrementRemotePromptUses)
  const queryKey = useMemo(() => getPromptLibraryQueryKey(userId), [userId])
  const invalidatePrompts = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey],
  )

  return useMemo<RemotePromptLibraryStorage>(
    () => ({
      mode: 'remote',
      deletePrompt: async (promptId) => {
        await removePrompt({ data: promptId })
        await invalidatePrompts()
      },
      hydrate: async () => ({
        source: 'remote',
        prompts: await queryClient.fetchQuery({
          queryKey,
          queryFn: () => listPrompts(),
        }),
      }),
      incrementUses: async (promptId) => {
        const updatedPrompt = await incrementPromptUses({ data: promptId })

        await invalidatePrompts()

        return updatedPrompt
      },
      reportError: normalizeStorageError,
      savePrompt: async (prompt) => {
        const savedPrompt = await upsertPrompt({ data: prompt })

        await invalidatePrompts()

        return savedPrompt
      },
    }),
    [
      incrementPromptUses,
      invalidatePrompts,
      listPrompts,
      queryClient,
      queryKey,
      removePrompt,
      upsertPrompt,
    ],
  )
}
