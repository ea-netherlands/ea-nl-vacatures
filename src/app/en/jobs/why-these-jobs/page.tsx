import type { Metadata } from 'next'
import { MethodPage } from '@jobboard/pages/ExplainerPages'
import { ROUTES } from '@jobboard/content/i18n'
import { bilingualMetadata } from '@jobboard/lib/seo'

export const revalidate = 3600

export const metadata: Metadata = bilingualMetadata({
  locale: 'en',
  nlPath: ROUTES.nl.method,
  enPath: ROUTES.en.method,
  title: 'Why these jobs?',
  description:
    'How a job ends up on this board: importance, tractability, neglectedness — and leverage.',
})

export default async function Page() {
  return <MethodPage locale="en" />
}
