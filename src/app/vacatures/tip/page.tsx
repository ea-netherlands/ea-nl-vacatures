import type { Metadata } from 'next'
import { SuggestPage } from '@jobboard/pages/ExplainerPages'
import { ROUTES } from '@jobboard/content/i18n'
import { bilingualMetadata } from '@jobboard/lib/seo'

export const revalidate = 3600

export const metadata: Metadata = bilingualMetadata({
  locale: 'nl',
  nlPath: ROUTES.nl.suggest,
  enPath: ROUTES.en.suggest,
  title: 'Tip ons',
  description:
    'Ken je een Nederlandse vacature of organisatie die op dit bord hoort? Laat het ons weten — de meeste organisaties kunnen we niet automatisch volgen.',
})

export default async function Page() {
  return <SuggestPage locale="nl" />
}
