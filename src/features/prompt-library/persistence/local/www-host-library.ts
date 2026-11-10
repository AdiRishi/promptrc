import { parseLocalPromptLibrarySnapshot } from '@/features/prompt-library/persistence/local/local-prompt-library-storage'
import { type PromptLibraryPersistedSnapshot } from '@/features/prompt-library/types'
import { WWW_LIBRARY_BRIDGE_PATH } from '@/lib/canonical-host'
import { CANONICAL_SITE_URL } from '@/lib/site-config'

/**
 * `www.promptrc.app` used to serve the app, so a signed-out library may be
 * saved in that origin's `localStorage`. Page visits there now redirect to the
 * canonical host, which cannot read another origin's storage. The canonical
 * host therefore loads one page from the www host in a hidden frame, and that
 * page posts its stored library back. Both hosts are the same site, so the
 * frame sees the storage a direct visit would.
 */
const MESSAGE_TYPE = 'promptrc:www-library'
const IMPORTED_KEY = 'promptrc.www-library.imported'
const REPLY_TIMEOUT_MS = 3000

const getWwwOrigin = () => {
  const url = new URL(CANONICAL_SITE_URL)

  url.hostname = `www.${url.hostname}`

  return url.origin
}

/** The page the www host serves at `WWW_LIBRARY_BRIDGE_PATH`. */
export const getWwwLibraryBridgeHtml = (storageKey: string) => `<!doctype html>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>promptrc</title>
<script>
  var value = null
  try {
    value = localStorage.getItem(${JSON.stringify(storageKey)})
  } catch (error) {}
  parent.postMessage({ type: ${JSON.stringify(MESSAGE_TYPE)}, value: value }, ${JSON.stringify(CANONICAL_SITE_URL)})
</script>
`

/**
 * The library saved on the www host: `null` when it has none, `undefined`
 * when there is nothing to ask (another host, already imported) or no answer
 * came.
 */
export const readWwwHostLibrary = (): Promise<
  PromptLibraryPersistedSnapshot | null | undefined
> => {
  if (window.location.origin !== CANONICAL_SITE_URL || localStorage.getItem(IMPORTED_KEY)) {
    return Promise.resolve(undefined)
  }

  const wwwOrigin = getWwwOrigin()

  return new Promise((resolve) => {
    const frame = document.createElement('iframe')

    const finish = (snapshot: PromptLibraryPersistedSnapshot | null | undefined) => {
      window.clearTimeout(timeout)
      window.removeEventListener('message', onMessage)
      frame.remove()
      resolve(snapshot)
    }

    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== wwwOrigin || typeof event.data !== 'object' || event.data === null) {
        return
      }

      const { type, value } = event.data as { type?: unknown; value?: unknown }

      if (type === MESSAGE_TYPE) {
        finish(parseLocalPromptLibrarySnapshot(typeof value === 'string' ? value : null))
      }
    }

    const timeout = window.setTimeout(() => finish(undefined), REPLY_TIMEOUT_MS)

    window.addEventListener('message', onMessage)
    frame.hidden = true
    frame.src = `${wwwOrigin}${WWW_LIBRARY_BRIDGE_PATH}`
    document.body.appendChild(frame)
  })
}

export const markWwwHostLibraryImported = () => {
  localStorage.setItem(IMPORTED_KEY, '1')
}

const hasDraft = (snapshot: PromptLibraryPersistedSnapshot) => snapshot.composer.mode !== 'view'

/**
 * The canonical host's library once the www host's is brought over. Nothing
 * its owner made is dropped on either side:
 *
 * - Entries are joined, and the canonical host's copy of an entry wins. An
 *   untouched library (fresh, no draft) holds only starter entries, so it
 *   gives way to an edited one instead of being joined to it.
 * - A draft in progress here stays. A draft left on the www host is picked up
 *   only when there is none here.
 * - The filter, sort and search stay as they are here.
 */
export const mergeWwwHostLibrary = (
  current: PromptLibraryPersistedSnapshot,
  fromWww: PromptLibraryPersistedSnapshot | null,
): PromptLibraryPersistedSnapshot => {
  if (!fromWww || (fromWww.isFresh && !hasDraft(fromWww))) {
    return current
  }

  const replacesStarters = !fromWww.isFresh && current.isFresh && !hasDraft(current)
  const knownIds = new Set(current.prompts.map((prompt) => prompt.id))
  const prompts = fromWww.isFresh
    ? current.prompts
    : replacesStarters
      ? fromWww.prompts
      : [...current.prompts, ...fromWww.prompts.filter((prompt) => !knownIds.has(prompt.id))]

  // An edit draft is only meaningful beside the entry it edits.
  const takesDraft =
    !hasDraft(current) &&
    hasDraft(fromWww) &&
    (fromWww.composer.mode === 'new' ||
      prompts.some((prompt) => prompt.id === fromWww.selectedPromptId))
  const followsWwwSelection = replacesStarters || (takesDraft && fromWww.composer.mode === 'edit')

  return {
    ...current,
    prompts,
    isFresh: current.isFresh && fromWww.isFresh,
    selectedPromptId: followsWwwSelection ? fromWww.selectedPromptId : current.selectedPromptId,
    composer: takesDraft ? fromWww.composer : current.composer,
  }
}
