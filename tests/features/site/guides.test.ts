import { describe, expect, it } from 'vitest'

import { GUIDE_LIST } from '@/features/site/guides/guides'
import { SITE_DEFAULT_TITLE, SITE_DESCRIPTION, SITE_NAME } from '@/lib/site-config'

// A search result shows about 60 characters of a title and 155 of a description.
// Longer ones are cut mid-sentence, which is how the old home page read.
const TITLE_LIMIT = 60
const DESCRIPTION_LIMIT = 155

describe('what a search result shows', () => {
  it('fits the home page into a result', () => {
    expect(SITE_DEFAULT_TITLE.length).toBeLessThanOrEqual(TITLE_LIMIT)
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(DESCRIPTION_LIMIT)
  })

  it.each(GUIDE_LIST)('fits the guide "$slug" into a result', (guide) => {
    expect(`${guide.title} | ${SITE_NAME}`.length).toBeLessThanOrEqual(TITLE_LIMIT)
    expect(guide.description.length).toBeLessThanOrEqual(DESCRIPTION_LIMIT)
    expect(guide.body.trim()).not.toBe('')
  })
})
