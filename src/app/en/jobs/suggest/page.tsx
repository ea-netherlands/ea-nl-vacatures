import type { Metadata } from 'next'
import { SuggestPage } from '@jobboard/pages/ExplainerPages'
import { ROUTES } from '@jobboard/content/i18n'
import { bilingualMetadata } from '@jobboard/lib/seo'

export const revalidate = 3600

export const metadata: Metadata = bilingualMetadata({
  locale: 'en',
  nlPath: ROUTES.nl.suggest,
  enPath: ROUTES.en.suggest,
  title: 'Feedback',
  description:
    'This board is still in beta. Know a vacancy or organisation that belongs here, spotted something wrong, or think we are missing something? Tell us.',
})

export default async function Page() {
  return <SuggestPage locale="en" />
}
