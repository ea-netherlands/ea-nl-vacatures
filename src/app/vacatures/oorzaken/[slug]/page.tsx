import type { Metadata } from 'next'
import { CausePage } from '@jobboard/pages/ExplainerPages'
import { ROUTES, t } from '@jobboard/content/i18n'
import { CAUSE_AREAS, type CauseArea } from '@jobboard/taxonomy'
import { getExplainer } from '@jobboard/sanity/queries'
import { bilingualMetadata } from '@jobboard/lib/seo'

export const revalidate = 3600

export function generateStaticParams() {
  return CAUSE_AREAS.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const cause = slug as CauseArea
  const known = CAUSE_AREAS.includes(cause)
  const explainer = known ? await getExplainer('cause', 'nl', cause) : null
  const label = known ? t('nl').causeAreas[cause] : slug
  return bilingualMetadata({
    locale: 'nl',
    nlPath: ROUTES.nl.cause(slug),
    enPath: ROUTES.en.cause(slug),
    title: explainer?.title ?? label,
    description: explainer?.summary,
  })
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <CausePage locale="nl" slug={slug} />
}
