import type { Metadata } from 'next'
import { SuggestPage } from '@jobboard/pages/ExplainerPages'
import { ROUTES } from '@jobboard/content/i18n'
import { bilingualMetadata } from '@jobboard/lib/seo'

export const revalidate = 3600

export const metadata: Metadata = bilingualMetadata({
  locale: 'nl',
  nlPath: ROUTES.nl.suggest,
  enPath: ROUTES.en.suggest,
  title: 'Feedback',
  description:
    'Dit bord is nog in bèta. Ken je een vacature of organisatie die hier hoort, klopt er iets niet, of missen we iets? Laat het ons weten.',
})

export default async function Page() {
  return <SuggestPage locale="nl" />
}
