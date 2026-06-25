import { useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useCallback, useMemo } from 'react'

import {
  type RemotePromptLibraryStorage,
  normalizeStorageError,
} from '@/features/prompt-library/persistence/prompt-library-storage'
import {
  acceptRemoteFirstSignInCopy,
  addRemoteStarterPrompts,
  createRemotePromptShare,
  declineRemoteFirstSignInCopy,
  deleteRemotePrompt,
  getRemotePromptLibrary,
  incrementRemotePromptUses,
  revokeRemotePromptShare,
  upsertRemotePrompt,
} from '@/features/prompt-library/server/prompt-library-functions'

const getPromptLibraryQueryKey = (userId: string | null) =>
  ['prompt-library', 'prompts', userId ?? 'signed-out'] as const

export function useRemotePromptLibraryStorage(userId: string | null): RemotePromptLibraryStorage {
  const queryClient = useQueryClient()
  const getPromptLibrary = useServerFn(getRemotePromptLibrary)
  const upsertPrompt = useServerFn(upsertRemotePrompt)
  const removePrompt = useServerFn(deleteRemotePrompt)
  const incrementPromptUses = useServerFn(incrementRemotePromptUses)
  const createPromptShare = useServerFn(createRemotePromptShare)
  const revokePromptShare = useServerFn(revokeRemotePromptShare)
  const addStarterPrompts = useServerFn(addRemoteStarterPrompts)
  const acceptFirstSignInCopy = useServerFn(acceptRemoteFirstSignInCopy)
  const declineFirstSignInCopy = useServerFn(declineRemoteFirstSignInCopy)
  const queryKey = useMemo(() => getPromptLibraryQueryKey(userId), [userId])
  const invalidatePrompts = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey],
  )

  return useMemo<RemotePromptLibraryStorage>(
    () => ({
      mode: 'remote',
      acceptFirstSignInCopy: async (prompts) => {
        const copiedPrompts = await acceptFirstSignInCopy({ data: prompts })

        await invalidatePrompts()

        return copiedPrompts
      },
      addStarterPrompts: async (prompts) => {
        const savedPrompts = await addStarterPrompts({ data: prompts })

        await invalidatePrompts()

        return savedPrompts
      },
      createPromptShare: (promptId) => createPromptShare({ data: promptId }),
      deletePrompt: async (promptId) => {
        await removePrompt({ data: promptId })
        await invalidatePrompts()
      },
      declineFirstSignInCopy: async () => {
        const result = await declineFirstSignInCopy()

        await invalidatePrompts()

        return result
      },
      hydrate: async () => ({
        source: 'remote',
        snapshot: await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getPromptLibrary(),
        }),
      }),
      recordPromptUse: async (promptId) => {
        const updatedPrompt = await incrementPromptUses({ data: promptId })

        await invalidatePrompts()

        return updatedPrompt
      },
      reportError: normalizeStorageError,
      revokePromptShare: (promptId) => revokePromptShare({ data: promptId }),
      savePrompt: async (prompt) => {
        const savedPrompt = await upsertPrompt({ data: prompt })

        await invalidatePrompts()

        return savedPrompt
      },
    }),
    [
      acceptFirstSignInCopy,
      addStarterPrompts,
      createPromptShare,
      declineFirstSignInCopy,
      getPromptLibrary,
      incrementPromptUses,
      invalidatePrompts,
      queryClient,
      queryKey,
      removePrompt,
      revokePromptShare,
      upsertPrompt,
    ],
  )
}
