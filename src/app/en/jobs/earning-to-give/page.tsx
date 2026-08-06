import type { Metadata } from 'next'
import { EarningToGivePage } from '@jobboard/pages/ExplainerPages'
import { ROUTES } from '@jobboard/content/i18n'
import { bilingualMetadata } from '@jobboard/lib/seo'

export const revalidate = 3600

export const metadata: Metadata = bilingualMetadata({
  locale: 'en',
  nlPath: ROUTES.nl.earningToGive,
  enPath: ROUTES.en.earningToGive,
  title: 'Earning to give',
  description:
    'Jobs that are not the point in themselves, but pay enough to fund a lot of good. Including the case against.',
})

export default async function Page() {
  return <EarningToGivePage locale="en" />
}
