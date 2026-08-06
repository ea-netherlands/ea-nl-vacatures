import type { Metadata } from 'next'
import { CausesIndexPage } from '@jobboard/pages/ExplainerPages'
import { ROUTES } from '@jobboard/content/i18n'
import { bilingualMetadata } from '@jobboard/lib/seo'

export const revalidate = 3600

export const metadata: Metadata = bilingualMetadata({
  locale: 'en',
  nlPath: ROUTES.nl.causes,
  enPath: ROUTES.en.causes,
  title: 'Problem areas',
  description: 'Why we think these problems matter, and what kind of Dutch work bears on them.',
})

export default async function Page() {
  return <CausesIndexPage locale="en" />
}
