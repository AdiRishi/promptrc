import { useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useMemo } from 'react'

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
import { type PromptRecord } from '@/features/prompt-library/types'

const sortPromptsByUpdatedAtDesc = (prompts: PromptRecord[]) => {
  return [...prompts].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )
}

const getPromptLibraryQueryKey = (userId: string | null) =>
  ['prompt-library', 'prompts', userId ?? 'signed-out'] as const

export function useRemotePromptLibraryStorage(userId: string | null): RemotePromptLibraryStorage {
  const queryClient = useQueryClient()
  const listPrompts = useServerFn(listRemotePrompts)
  const upsertPrompt = useServerFn(upsertRemotePrompt)
  const removePrompt = useServerFn(deleteRemotePrompt)
  const incrementPromptUses = useServerFn(incrementRemotePromptUses)
  const queryKey = useMemo(() => getPromptLibraryQueryKey(userId), [userId])

  return useMemo<RemotePromptLibraryStorage>(
    () => ({
      mode: 'remote',
      deletePrompt: async (promptId) => {
        await removePrompt({ data: promptId })
        queryClient.setQueryData<PromptRecord[]>(queryKey, (prompts = []) =>
          prompts.filter((prompt) => prompt.id !== promptId),
        )
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
        queryClient.setQueryData<PromptRecord[]>(queryKey, (prompts = []) =>
          sortPromptsByUpdatedAtDesc(
            prompts.map((prompt) => (prompt.id === updatedPrompt.id ? updatedPrompt : prompt)),
          ),
        )

        return updatedPrompt
      },
      reportError: normalizeStorageError,
      savePrompt: async (prompt) => {
        const savedPrompt = await upsertPrompt({ data: prompt })
        queryClient.setQueryData<PromptRecord[]>(queryKey, (prompts = []) =>
          sortPromptsByUpdatedAtDesc([
            savedPrompt,
            ...prompts.filter((existingPrompt) => existingPrompt.id !== savedPrompt.id),
          ]),
        )

        return savedPrompt
      },
    }),
    [incrementPromptUses, listPrompts, queryClient, queryKey, removePrompt, upsertPrompt],
  )
}
