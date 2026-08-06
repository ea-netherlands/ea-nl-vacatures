import type { Metadata } from 'next'
import { MethodPage } from '@jobboard/pages/ExplainerPages'
import { ROUTES } from '@jobboard/content/i18n'
import { bilingualMetadata } from '@jobboard/lib/seo'

export const revalidate = 3600

export const metadata: Metadata = bilingualMetadata({
  locale: 'nl',
  nlPath: ROUTES.nl.method,
  enPath: ROUTES.en.method,
  title: 'Waarom deze banen?',
  description:
    'Hoe een vacature op dit bord terechtkomt: belangrijkheid, oplosbaarheid, verwaarlozing — en hefboom.',
})

export default async function Page() {
  return <MethodPage locale="nl" />
}
