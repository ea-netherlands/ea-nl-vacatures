import type { Metadata } from 'next'
import { EmployersIndexPage } from '@jobboard/pages/ExplainerPages'
import { ROUTES } from '@jobboard/content/i18n'
import { bilingualMetadata } from '@jobboard/lib/seo'

export const revalidate = 900

export const metadata: Metadata = bilingualMetadata({
  locale: 'en',
  nlPath: ROUTES.nl.employers,
  enPath: ROUTES.en.employers,
  title: 'Organisations',
  description: 'Where these jobs are, and why we think these organisations matter.',
})

export default async function Page() {
  return <EmployersIndexPage locale="en" />
}
