import type { Metadata } from 'next'
import { SuggestPage } from '@jobboard/pages/ExplainerPages'
import { ROUTES } from '@jobboard/content/i18n'
import { bilingualMetadata } from '@jobboard/lib/seo'

export const revalidate = 3600

export const metadata: Metadata = bilingualMetadata({
  locale: 'en',
  nlPath: ROUTES.nl.suggest,
  enPath: ROUTES.en.suggest,
  title: 'Suggest a job',
  description:
    'Know a Dutch vacancy or organisation that belongs on this board? Tell us — most organisations here cannot be followed automatically.',
})

export default async function Page() {
  return <SuggestPage locale="en" />
}
