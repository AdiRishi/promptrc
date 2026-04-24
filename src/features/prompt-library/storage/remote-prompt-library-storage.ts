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

const PROMPT_LIBRARY_QUERY_KEY = ['prompt-library', 'prompts'] as const

const sortPromptsByUpdatedAtDesc = (prompts: PromptRecord[]) => {
  return [...prompts].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )
}

export function useRemotePromptLibraryStorage(): RemotePromptLibraryStorage {
  const queryClient = useQueryClient()
  const listPrompts = useServerFn(listRemotePrompts)
  const upsertPrompt = useServerFn(upsertRemotePrompt)
  const removePrompt = useServerFn(deleteRemotePrompt)
  const incrementPromptUses = useServerFn(incrementRemotePromptUses)

  return useMemo<RemotePromptLibraryStorage>(
    () => ({
      mode: 'remote',
      deletePrompt: async (promptId) => {
        await removePrompt({ data: promptId })
        queryClient.setQueryData<PromptRecord[]>(PROMPT_LIBRARY_QUERY_KEY, (prompts = []) =>
          prompts.filter((prompt) => prompt.id !== promptId),
        )
      },
      hydrate: async () => ({
        source: 'remote',
        prompts: await queryClient.fetchQuery({
          queryKey: PROMPT_LIBRARY_QUERY_KEY,
          queryFn: () => listPrompts(),
        }),
      }),
      incrementUses: async (promptId) => {
        const updatedPrompt = await incrementPromptUses({ data: promptId })
        queryClient.setQueryData<PromptRecord[]>(PROMPT_LIBRARY_QUERY_KEY, (prompts = []) =>
          sortPromptsByUpdatedAtDesc(
            prompts.map((prompt) => (prompt.id === updatedPrompt.id ? updatedPrompt : prompt)),
          ),
        )

        return updatedPrompt
      },
      reportError: normalizeStorageError,
      savePrompt: async (prompt) => {
        const savedPrompt = await upsertPrompt({ data: prompt })
        queryClient.setQueryData<PromptRecord[]>(PROMPT_LIBRARY_QUERY_KEY, (prompts = []) =>
          sortPromptsByUpdatedAtDesc([
            savedPrompt,
            ...prompts.filter((existingPrompt) => existingPrompt.id !== savedPrompt.id),
          ]),
        )

        return savedPrompt
      },
    }),
    [incrementPromptUses, listPrompts, queryClient, removePrompt, upsertPrompt],
  )
}
