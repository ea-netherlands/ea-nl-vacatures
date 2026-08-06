import type { Metadata } from 'next'
import { EmployersIndexPage } from '@jobboard/pages/ExplainerPages'
import { ROUTES } from '@jobboard/content/i18n'
import { bilingualMetadata } from '@jobboard/lib/seo'

export const revalidate = 900

export const metadata: Metadata = bilingualMetadata({
  locale: 'nl',
  nlPath: ROUTES.nl.employers,
  enPath: ROUTES.en.employers,
  title: 'Organisaties',
  description: 'Waar deze vacatures staan, en waarom we denken dat deze organisaties ertoe doen.',
})

export default async function Page() {
  return <EmployersIndexPage locale="nl" />
}
