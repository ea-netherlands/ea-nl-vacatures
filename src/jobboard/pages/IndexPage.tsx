/**
 * The index — spec §9.2.
 *
 * Worth remembering what this page is NOT: with the proto-EA as primary user,
 * the index is "the *least* important page on the site" (§4). It is the page you
 * would design first for a returning EA, and most visitors will never see it —
 * they land on a listing or an explainer from a Dutch-language Google search.
 * So it earns its keep by being a clean, honest table of contents rather than a
 * marketing surface.
 */

import Link from 'next/link'
import { EmptyState, Filters, IntroBand, type FilterState } from '../components/Filters'
import { Container, Hero, InternationalFirst, OnwardStep, Section } from '../components/Chrome'
import { ListingCard } from '../components/ListingCard'
import { routes, t, type Locale } from '../content/i18n'
import { getLiveListings } from '../sanity/queries'
import type { ListingView } from '../sanity/queries'
import { CAUSE_AREAS } from '../taxonomy'
import u from '../components/ui.module.css'

export function parseFilters(searchParams: Record<string, string | string[] | undefined>): FilterState {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined
  return {
    cause: one(searchParams.cause),
    leverage: one(searchParams.leverage),
    location: one(searchParams.location),
    language: one(searchParams.language),
    seniority: one(searchParams.seniority),
    sort: one(searchParams.sort),
  }
}

export function applyFilters(listings: ListingView[], f: FilterState): ListingView[] {
  return listings.filter((l) => {
    if (f.cause && l.primaryCause !== f.cause && !l.secondaryCauses.includes(f.cause as never))
      return false
    if (f.leverage && l.leverage !== f.leverage) return false
    if (f.location && l.locationMode !== f.location) return false
    if (f.language && l.languageRequirement !== f.language) return false
    if (f.seniority && l.seniority !== f.seniority) return false
    return true
  })
}

/**
 * Adjacent filters to offer when a combination returns nothing: the causes that
 * do have live roles, minus the one that just failed.
 */
function suggestions(
  all: ListingView[],
  state: FilterState,
  locale: Locale,
): { label: string; href: string }[] {
  const copy = t(locale)
  const r = routes(locale)
  const withRoles = new Set(all.map((l) => l.primaryCause).filter(Boolean) as string[])
  return CAUSE_AREAS.filter((c) => withRoles.has(c) && c !== state.cause)
    .slice(0, 5)
    .map((c) => ({ label: copy.causeAreas[c], href: `${r.index}?cause=${c}` }))
}

export async function IndexPage({
  locale,
  searchParams,
}: {
  locale: Locale
  searchParams: Record<string, string | string[] | undefined>
}) {
  const copy = t(locale)
  const r = routes(locale)
  const state = parseFilters(searchParams)

  // Earning to give is excluded here: it has its own route because it needs
  // different framing and a different card layout (§9.6).
  const all = await getLiveListings({
    excludeEarningToGive: true,
    sort: state.sort === 'leverage' ? 'leverage' : 'recent',
  })
  const filtered = applyFilters(all, state)

  return (
    <>
      <Hero title={copy.indexTitle} lead={copy.boardTagline} />

      <Container>
        <Section first>
          <IntroBand locale={locale} />
          {/*
            Above the filters, deliberately. Someone who can relocate should hit
            the three international boards before they hit a filter dropdown —
            putting this below the listings would make it decoration.
          */}
          <InternationalFirst locale={locale} />
          <Filters locale={locale} state={state} resultCount={filtered.length} />
        </Section>

        <Section tight>
          {filtered.length === 0 ? (
            <EmptyState
              locale={locale}
              state={state}
              suggestions={suggestions(all, state, locale)}
            />
          ) : (
            <ul className={u.cardList}>
              {filtered.map((listing) => (
                <ListingCard key={listing.id} listing={listing} locale={locale} />
              ))}
            </ul>
          )}

          <p className={u.linkRow}>
            <Link href={r.causes}>
              {locale === 'nl' ? 'Bekijk de probleemgebieden' : 'Browse the problem areas'}
            </Link>
            <Link href={r.employers}>
              {locale === 'nl' ? 'Bekijk de organisaties' : 'Browse the organisations'}
            </Link>
            <Link href={r.earningToGive}>{copy.e2gTitle}</Link>
          </p>
        </Section>

        <Section tight>
          <OnwardStep locale={locale} />
        </Section>
      </Container>
    </>
  )
}
