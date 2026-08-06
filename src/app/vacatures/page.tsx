import type { Metadata } from 'next'
import { IndexPage } from '@jobboard/pages/IndexPage'
import { ROUTES, t } from '@jobboard/content/i18n'
import { bilingualMetadata } from '@jobboard/lib/seo'

export const revalidate = 300

export const metadata: Metadata = bilingualMetadata({
  locale: 'nl',
  nlPath: ROUTES.nl.index,
  enPath: ROUTES.en.index,
  title: 'Vacatures',
  description: t('nl').boardTagline,
})

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <IndexPage locale="nl" searchParams={await searchParams} />
}
