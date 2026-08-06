import type { Metadata } from 'next'
import { IndexPage } from '@jobboard/pages/IndexPage'
import { ROUTES, t } from '@jobboard/content/i18n'
import { bilingualMetadata } from '@jobboard/lib/seo'

export const revalidate = 300

export const metadata: Metadata = bilingualMetadata({
  locale: 'en',
  nlPath: ROUTES.nl.index,
  enPath: ROUTES.en.index,
  title: 'Jobs',
  description: t('en').boardTagline,
})

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <IndexPage locale="en" searchParams={await searchParams} />
}
