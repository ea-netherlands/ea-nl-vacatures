/**
 * The index — spec §9.2, rebuilt August 2026.
 *
 * ## What changed, and why the old docstring was wrong
 *
 * This file used to open by arguing that the index is "the *least* important
 * page on the site", on the grounds that most visitors land on a listing or an
 * explainer from a Dutch-language search and never see it. The traffic claim is
 * still true. The conclusion drawn from it — that the page should therefore be
 * a plain table of contents — was not, for two reasons.
 *
 * First, the people who *do* arrive here are the ones deciding whether this
 * board is worth returning to, which is the single most valuable thing a reader
 * can decide. Second, "not a marketing surface" got read as "no front door at
 * all": the page opened with five select dropdowns, which asks a first-time
 * reader to know the board's vocabulary before it will show them anything.
 *
 * So the page now has two states, and which one it is in depends entirely on
 * whether the URL carries a filter:
 *
 * - **Browse** (no filters): hero, the international-first statement, then a
 *   grid of cause tiles with their sub-areas exposed as chips, then the skill
 *   grid for cause-neutral readers. No dropdowns, no list — the whole page is
 *   the choice of where to start.
 * - **Filtered** (any filter set): a slim header naming the current selection,
 *   the filter bar for narrowing, and the two tiers of listings.
 *
 * The punch is meant to come from specificity and live counts, not from gloss.
 * Every tile states how many roles are behind it, and a tile with nothing
 * behind it says so instead of leading somewhere empty.
 *
 * ## What did not change
 *
 * The international-first statement still sits above everything a reader could
 * act on. Someone who can relocate should hit 80,000 Hours, Probably Good and
 * EA Opportunities before they touch a tile on this page; moving that below the
 * grid would turn the board's one piece of real honesty into a footer.
 */

import Link from 'next/link'
import { EmptyState, Filters, IntroBand, type FilterState } from '../components/Filters'
import {
  Container,
  Hero,
  InternationalFirst,
  OnwardStep,
  Section,
  TierHeading,
} from '../components/Chrome'
import { CauseGrid, SkillGrid, countFacets } from '../components/BrowseGrid'
import { ExpandableCardList } from '../components/ExpandableCardList'
import { Icon } from '../components/Icon'
import { routes, t, type Locale } from '../content/i18n'
import { getLiveListings } from '../sanity/queries'
import type { ListingView } from '../sanity/queries'
import { CAUSE_AREAS, SUB_AREA_CAUSE, type CauseArea, type Skill, type SubArea } from '../taxonomy'
import s from '../components/layout.module.css'
import u from '../components/ui.module.css'

export function parseFilters(searchParams: Record<string, string | string[] | undefined>): FilterState {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined
  return {
    view: one(searchParams.view),
    cause: one(searchParams.cause),
    subarea: one(searchParams.subarea),
    skill: one(searchParams.skill),
    location: one(searchParams.location),
    language: one(searchParams.language),
    seniority: one(searchParams.seniority),
    sort: one(searchParams.sort),
  }
}

/**
 * True when the reader has chosen something — the browse/filtered switch.
 *
 * `view=all` counts, even though it narrows nothing: someone who asked to see
 * the whole list has made a choice, and answering it with the tile grid they
 * just clicked past would be ignoring them.
 */
export function isFiltered(f: FilterState): boolean {
  return Boolean(
    f.view === 'all' || f.cause || f.subarea || f.skill || f.location || f.language || f.seniority,
  )
}

export function applyFilters(listings: ListingView[], f: FilterState): ListingView[] {
  return listings.filter((l) => {
    if (f.cause && l.primaryCause !== f.cause && !l.secondaryCauses.includes(f.cause as never))
      return false
    // A listing carries exactly one sub-area, so this is an equality test and
    // not a membership one — see countFacets for why the counts match.
    if (f.subarea && l.subArea !== f.subarea) return false
    if (f.skill && !l.skills.includes(f.skill as Skill)) return false
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

/**
 * What the reader picked, in their words rather than in slugs.
 *
 * A sub-area implies its cause, so naming both would read as "Mondiale
 * catastrofale risico's · AI-veiligheid" when the reader only chose one thing.
 * The most specific selection wins.
 */
function selectionLabel(state: FilterState, locale: Locale): string | null {
  const copy = t(locale)
  if (state.subarea && state.subarea in copy.subAreas)
    return copy.filteredBySubArea(copy.subAreas[state.subarea as SubArea])
  if (state.skill && state.skill in copy.skills)
    return copy.filteredBySkill(copy.skills[state.skill as Skill])
  if (state.cause && state.cause in copy.causeAreas)
    return copy.filteredByCause(copy.causeAreas[state.cause as CauseArea])
  return null
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

  // A sub-area in the URL implies its cause. Normalising here rather than in
  // the filter predicate means the cause tile, the breadcrumb and the filter
  // bar all agree with each other on a link arrived at from outside.
  if (state.subarea && !state.cause) {
    state.cause = SUB_AREA_CAUSE[state.subarea as SubArea] ?? undefined
  }

  // Earning to give is excluded here: it has its own route because it needs
  // different framing and a different card layout (§9.6).
  const all = await getLiveListings({
    excludeEarningToGive: true,
    sort: state.sort === 'leverage' ? 'leverage' : 'recent',
  })
  const filtered = applyFilters(all, state)
  const counts = countFacets(all)
  const browsing = !isFiltered(state)

  // The board's priority order, stated rather than implied. Roles at
  // organisations an independent evaluator or 80,000 Hours already vetted go
  // first, under a heading that says what that buys you and what it costs;
  // everything else follows under a heading that admits the judgement is ours
  // and that the competition is lighter. The sort control orders within each
  // tier, not across them.
  const recommended = filtered.filter((l) => l.leverage === 'trusted-recommendation')
  const dutch = filtered.filter((l) => l.leverage !== 'trusted-recommendation')

  /*
    The date under the hero is the newest listing's, not today's.

    The page fetches live from Sanity on every request, so "updated <today>"
    would be literally true and still misleading — a reader parses it as "a
    person curated this today", which is a claim about editorial activity we
    cannot make. The most recent posting date is a fact about the board that
    answers the same question honestly: how stale is this.
  */
  const newest = all
    .map((l) => l.postedAt)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1)
  const updated = newest
    ? new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
        day: 'numeric',
        month: 'long',
      }).format(new Date(newest))
    : null

  // ---------------------------------------------------------------------
  // Browse state — no filters. The page is the choice, not a list.
  // ---------------------------------------------------------------------
  if (browsing) {
    return (
      <>
        <Hero title={copy.heroTitle} lead={copy.heroLead}>
          <p className={s.heroStat}>
            {updated ? copy.heroStat(all.length, updated) : copy.browseRoleCount(all.length)}
          </p>
        </Hero>

        <Container>
          <Section first>
            {/*
              Above the grid, deliberately. Someone who can relocate should hit
              the three international boards before they hit a tile — putting
              this below the grid would make it decoration.
            */}
            <InternationalFirst locale={locale} compact />
          </Section>

          <Section>
            <h2 className={u.browseHeading}>{copy.browseCauseHeading}</h2>
            <p className={u.browseBody}>{copy.browseCauseBody}</p>
            <CauseGrid locale={locale} counts={counts} />
          </Section>

          <Section>
            <h2 className={u.browseHeading}>{copy.browseSkillHeading}</h2>
            <p className={u.browseBody}>
              {copy.browseSkillBody} <span className={u.browseAside}>{copy.browseSkillAside}</span>
            </p>
            <SkillGrid locale={locale} counts={counts} />
          </Section>

          <Section tight>
            <IntroBand locale={locale} />
            <p className={u.linkRow}>
              <Link href={`${r.index}?view=all`}>{copy.browseShowAll(all.length)}</Link>
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

  // ---------------------------------------------------------------------
  // Filtered state — the reader has chosen. Get out of the way and list.
  // ---------------------------------------------------------------------
  const label = selectionLabel(state, locale)

  return (
    <>
      <Hero title={label ?? copy.indexTitle} compact>
        <p className={s.heroBack}>
          <Link href={r.index}>
            <Icon name="arrow-left" /> {copy.backToBrowse}
          </Link>
        </p>
      </Hero>

      <Container>
        <Section first>
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
            <>
              {/* A tier with nothing in it — because a filter excluded it —
                  renders nothing at all: an explanation of an empty list is
                  worse than no heading. */}
              {recommended.length > 0 ? (
                <>
                  <TierHeading
                    icon="circle-check"
                    heading={copy.tierRecommendedHeading}
                    body={copy.tierRecommendedBody}
                    count={copy.tierRecommendedCount(recommended.length)}
                  />
                  <ExpandableCardList listings={recommended} locale={locale} />
                </>
              ) : null}

              {dutch.length > 0 ? (
                <>
                  <TierHeading
                    icon="building"
                    heading={copy.tierDutchHeading}
                    body={copy.tierDutchBody}
                    count={copy.tierDutchCount(dutch.length)}
                  />
                  <ExpandableCardList listings={dutch} locale={locale} />
                </>
              ) : null}
            </>
          )}
        </Section>

        <Section tight>
          <OnwardStep locale={locale} />
        </Section>
      </Container>
    </>
  )
}
