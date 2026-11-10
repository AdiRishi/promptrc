import { ManualContent } from '@/features/prompt-library/components/manual'
import { PageTitle, SiteShell } from '@/features/site/components/site-shell'

/** `/manual`: the same man page the `?` key opens in the app, as a page of its own. */
export function ManualPage() {
  return (
    <SiteShell path="~/.promptrc/MANUAL" section="manual">
      <PageTitle lede="Every key, command and convention in promptrc. Inside the app, press ? to open this page over whatever you are doing.">
        The promptrc manual
      </PageTitle>
      <ManualContent />
    </SiteShell>
  )
}
