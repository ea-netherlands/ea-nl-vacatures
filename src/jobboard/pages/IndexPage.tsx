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
 * - **Browse** (no filters): hero, then the band tiles, a grid of cause tiles
 *   with their sub-areas exposed as chips, and the skill grid for cause-neutral
 *   readers. No dropdowns, no list — the whole page is
 *   the choice of where to start.
 * - **Filtered** (any filter set): a slim header naming the current selection,
 *   the filter bar for narrowing, and the three bands of listings (../lib/bands).
 *
 * The punch is meant to come from specificity and live counts, not from gloss.
 * Every tile states how many roles are behind it, and a tile with nothing
 * behind it says so instead of leading somewhere empty.
 *
 * ## What changed again, October 2026
 *
 * The browse state was cut back to five parts: a plain hero with one button,
 * the three bands, the cause grid, the skill grid, and the course/fellowship
 * close. The international-first statement used to sit above everything a
 * reader could act on, on the argument that someone who can relocate should hit
 * the international boards before a tile here. James reversed that: the
 * statement stays on every listing and on the method page, but the front page
 * leads with the jobs. See the comment above the grids.
 */

import Link from 'next/link'
import { EmptyState, Filters, type FilterState } from '../components/Filters'
import {
  BetaNote,
  Container,
  FeedbackBand,
  Hero,
  OnwardStep,
  Section,
  TierHeading,
} from '../components/Chrome'
import { BandGrid, CauseGrid, LocationGrid, SkillGrid, countFacets } from '../components/BrowseGrid'
import { BAND_ICONS, ExpandableCardList, TierJump } from '../components/ExpandableCardList'
import { Icon } from '../components/Icon'
import { routes, t, type Locale } from '../content/i18n'
import { BANDS, bandOf, isBand, splitIntoBands, type Band } from '../lib/bands'
import { getEarningToGiveListings, getLiveListings } from '../sanity/queries'
import type { ListingView } from '../sanity/queries'
import {
  CAUSE_AREAS,
  SUB_AREA_CAUSE,
  type CauseArea,
  type LocationMode,
  type Skill,
  type SubArea,
} from '../taxonomy'
import s from '../components/layout.module.css'
import u from '../components/ui.module.css'

export function parseFilters(searchParams: Record<string, string | string[] | undefined>): FilterState {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined
  return {
    view: one(searchParams.view),
    band: one(searchParams.band),
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
    f.view === 'all' ||
      f.band ||
      f.cause ||
      f.subarea ||
      f.skill ||
      f.location ||
      f.language ||
      f.seniority,
  )
}

export function applyFilters(listings: ListingView[], f: FilterState): ListingView[] {
  return listings.filter((l) => {
    if (isBand(f.band) && bandOf(l) !== f.band) return false
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
  if (state.location && state.location in copy.locationModes)
    return copy.filteredByLocation(copy.locationModes[state.location as LocationMode])
  if (state.cause && state.cause in copy.causeAreas)
    return copy.filteredByCause(copy.causeAreas[state.cause as CauseArea])
  // Least specific last: a band narrowed further by a cause is named by the cause.
  if (isBand(state.band)) return copy.bandLabels[state.band]
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
  const [all, earningToGive] = await Promise.all([
    getLiveListings({
      excludeEarningToGive: true,
      sort: state.sort === 'leverage' ? 'leverage' : 'recent',
    }),
    getEarningToGiveListings(),
  ])
  const filtered = applyFilters(all, state)
  const counts = countFacets(all)
  const browsing = !isFiltered(state)

  // The board's priority order, stated rather than implied: three bands, each
  // under a heading that says why its listings are here and what it costs to
  // win one. What goes in which band, and why ways in are decided first, is in
  // ../lib/bands. The sort control orders within each band, not across them.
  const bands = splitIntoBands(filtered)
  const bandCounts = Object.fromEntries(
    BANDS.map((b) => [b, all.filter((l) => bandOf(l) === b).length]),
  ) as Record<Band, number>

  // ---------------------------------------------------------------------
  // Browse state — no filters. The page is the choice, not a list.
  // ---------------------------------------------------------------------
  if (browsing) {
    return (
      <>
        {/*
          A plain hero: what this is, in one line, and one button.

          It used to carry a paragraph of reasoning, a "newest from" date, a
          second button and two links. Each had a reason, and together they
          meant a first-time reader met five things before a single job. The
          reasoning lives on the method page, linked from the header.
        */}
        <Hero title={copy.heroTitle} lead={copy.heroLead}>
          <p className={s.heroActions}>
            <Link href={`${r.index}?view=all`} className={`${u.btn} ${u.btnSolid}`}>
              {copy.browseShowAll(all.length)}
              <Icon name="arrow-right" />
            </Link>
          </p>
        </Hero>

        {/*
          Then four ways to narrow it, each a grid with live counts, under
          parallel headings so they read as one choice: by kind, by problem,
          by skill, by location.

          Two bands that used to sit above these were removed in October 2026
          at James's call: the international-first statement and the beta
          band. Neither claim was dropped. The compact international note is
          still on every listing and on the method page, and the beta pill
          stays in the header, with a one-line beta note on every list and
          listing. They are off this page because a reader should reach the
          jobs before the caveats.
        */}
        <Container>
          <Section first>
            <h2 className={u.browseHeading}>{copy.browseBandHeading}</h2>
            <p className={u.browseBody}>{copy.browseBandBody}</p>
            <BandGrid locale={locale} counts={bandCounts} earningToGive={earningToGive.length} />
          </Section>

          <Section id="problemareas">
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

          <Section>
            <h2 className={u.browseHeading}>{copy.browseLocationHeading}</h2>
            <p className={u.browseBody}>{copy.browseLocationBody}</p>
            <LocationGrid locale={locale} counts={counts} />
          </Section>

          {/* One way onward for someone not ready to apply: the free course,
              or the fellowship after it. Earning to give, feedback and the
              organisations index are all in the header. */}
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
          {/* The filtered state is a list, and a reader who arrived on a shared
              ?cause= link may never touch the browse page where the full beta
              band lives. One line, so it does not sit between them and the
              results they asked for. */}
          <BetaNote locale={locale} />
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
              {/* Every band named and counted before any list starts, so a
                  reader knows the later ones exist without us truncating the
                  first to tell them. */}
              <TierJump
                locale={locale}
                counts={BANDS.map((b) => ({
                  band: b,
                  count: bands[b].length,
                  // Named, not just counted: with three bands, "4 plekken"
                  // on its own says nothing about which four.
                  label: `${copy.bandLabels[b]} · ${bands[b].length}`,
                }))}
              />

              {/* A band with nothing in it — because a filter excluded it —
                  renders nothing at all: an explanation of an empty list is
                  worse than no heading. */}
              {BANDS.map((b) => {
                if (!bands[b].length) return null
                const c = tierCopy(b, copy)
                return (
                  <div key={b} id={`tier-${b}`}>
                    <TierHeading
                      icon={BAND_ICONS[b]}
                      heading={c.heading}
                      body={c.body}
                      count={c.count(bands[b].length)}
                      /* Only the Dutch band gets the link. The vetted band's
                         criterion — somebody else vetted the organisation —
                         is self-explanatory in a sentence, and so is a way
                         in; leverage is not. */
                      link={
                        b === 'dutch'
                          ? { href: `${r.method}#leverage`, label: copy.tierDutchLeverageLink }
                          : undefined
                      }
                    />
                    <ExpandableCardList listings={bands[b]} locale={locale} />
                  </div>
                )
              })}
            </>
          )}
        </Section>

        <Section tight>
          <FeedbackBand locale={locale} />
        </Section>

        <Section tight>
          <OnwardStep locale={locale} />
        </Section>
      </Container>
    </>
  )
}

/** Each band's heading copy. The vetted and Dutch keys predate the bands and keep their names. */
function tierCopy(band: Band, copy: ReturnType<typeof t>) {
  switch (band) {
    case 'vetted':
      return {
        heading: copy.tierRecommendedHeading,
        body: copy.tierRecommendedBody,
        count: copy.tierRecommendedCount,
      }
    case 'routes':
      return { heading: copy.tierRoutesHeading, body: copy.tierRoutesBody, count: copy.tierRoutesCount }
    case 'dutch':
      return { heading: copy.tierDutchHeading, body: copy.tierDutchBody, count: copy.tierDutchCount }
  }
}
