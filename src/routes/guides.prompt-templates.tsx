import { createFileRoute } from '@tanstack/react-router'

import { GuidePage } from '@/features/site/components/guide-page'
import { guideHead } from '@/features/site/guide-route'
import { GUIDES } from '@/features/site/guides/guides'

export const Route = createFileRoute('/guides/prompt-templates')({
  component: () => <GuidePage guide={GUIDES['prompt-templates']} />,
  head: () => guideHead('prompt-templates'),
})
