import type { Metadata } from 'next'
import { DetailPage } from '@jobboard/pages/DetailPage'
import { firstLine } from '@jobboard/components/ListingCard'
import { ROUTES } from '@jobboard/content/i18n'
import { getAllListingSlugs, getListingBySlug } from '@jobboard/sanity/queries'
import { absolute, bilingualMetadata, breadcrumbJsonLd, JsonLd, jobPostingJsonLd } from '@jobboard/lib/seo'

export const revalidate = 600

/** Pre-render the live set; anything else renders on demand. */
export async function generateStaticParams() {
  const slugs = await getAllListingSlugs()
  return slugs
    .filter((s) => !s.expiresAt || new Date(s.expiresAt) > new Date())
    .map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const listing = await getListingBySlug(slug)
  if (!listing) return { title: 'Vacature niet gevonden' }
  return bilingualMetadata({
    locale: 'nl',
    nlPath: ROUTES.nl.detail(slug),
    enPath: ROUTES.en.detail(slug),
    title: `${listing.title}${listing.employer ? ` — ${listing.employer.name}` : ''}`,
    // The editorial note is the description: it is what makes this listing
    // different from the same ad on LinkedIn.
    description: firstLine(listing.whyThisMattersNl, 155) || (listing.excerpt ?? undefined),
  })
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const listing = await getListingBySlug(slug)
  return (
    <>
      {listing ? (
        <>
          <JsonLd data={jobPostingJsonLd(listing, 'nl', absolute(ROUTES.nl.detail(slug)))} />
          <JsonLd
            data={breadcrumbJsonLd([
              { name: 'Vacatures', path: ROUTES.nl.index },
              { name: listing.title, path: ROUTES.nl.detail(slug) },
            ])}
          />
        </>
      ) : null}
      <DetailPage locale="nl" slug={slug} />
    </>
  )
}
