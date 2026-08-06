import type { Metadata } from 'next'
import { CausesIndexPage } from '@jobboard/pages/ExplainerPages'
import { ROUTES } from '@jobboard/content/i18n'
import { bilingualMetadata } from '@jobboard/lib/seo'

export const revalidate = 3600

export const metadata: Metadata = bilingualMetadata({
  locale: 'nl',
  nlPath: ROUTES.nl.causes,
  enPath: ROUTES.en.causes,
  title: 'Probleemgebieden',
  description: 'Waarom we denken dat deze problemen belangrijk zijn, en welk Nederlands werk eraan raakt.',
})

export default async function Page() {
  return <CausesIndexPage locale="nl" />
}
