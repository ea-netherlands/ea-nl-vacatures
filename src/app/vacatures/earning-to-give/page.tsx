import type { Metadata } from 'next'
import { EarningToGivePage } from '@jobboard/pages/ExplainerPages'
import { ROUTES } from '@jobboard/content/i18n'
import { bilingualMetadata } from '@jobboard/lib/seo'

export const revalidate = 3600

export const metadata: Metadata = bilingualMetadata({
  locale: 'nl',
  nlPath: ROUTES.nl.earningToGive,
  enPath: ROUTES.en.earningToGive,
  title: 'Earning to give',
  description:
    'Banen die zelf niet het punt zijn, maar genoeg betalen dat je er meer goed mee kunt doen. Met het argument ertegen.',
})

export default async function Page() {
  return <EarningToGivePage locale="nl" />
}
