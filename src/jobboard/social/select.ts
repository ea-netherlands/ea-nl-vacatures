/**
 * Which jobs go in this week's social post — November 2026.
 *
 * Every week the board posts a carousel of jobs to EA Nederland's Instagram and
 * LinkedIn and to James's own LinkedIn, modelled on Christians for Impact's
 * weekly jobs posts: a cover, one slide per job, then a slide pointing to the
 * monthly email. This module only decides which jobs; ./slides draws them.
 *
 * The rules, each of which exists because the obvious alternative fails:
 *
 * - **Mostly vetted roles, one or two ways in.** The post speaks for EA
 *   Nederland to people who have never heard of these organisations, so it
 *   leads with the band somebody in EA has already vetted. Programmes and
 *   internships go in too, at least one and at most two, because they are what
 *   a newcomer can actually win. The first week's preview had none: fresh
 *   vetted roles outscored every way in, so the best one now has a reserved
 *   place.
 * - **Funding calls on merit, at most one.** The board also carries funding
 *   calls ("Request for Proposals: Project Tailwind", "Seed Grants"), filed as
 *   jobs because the taxonomy has no other kind. They compete on the same
 *   score as jobs and get in when they earn it; one is the most a post takes,
 *   so a week with several new calls doesn't turn into a grants roundup.
 *   (A reserved place, tried on 9 Nov 2026, put one in every week; James
 *   wanted them welcome, not guaranteed, so it was dropped the same day.) They're recognised by title (`isFundingCall`) and labelled as
 *   funding on their slide, in the captions and on the cover ("opportunities",
 *   not "jobs").
 * - **No job closing before the post has had a chance to work.** Each slide
 *   shows the deadline, which is what makes people act. A role that closes the
 *   day after it is posted is a promise we can't keep, so the deadline has to
 *   be at least two days after posting.
 * - **Variety.** One role per organisation and at most three per problem area,
 *   or a week heavy with one funder's openings reads as an advert for them.
 * - **Something local, every week.** A role you do in the Netherlands, on site
 *   or hybrid (`on-site-nl`, `nl-flexible`), gets a reserved place whenever one
 *   is eligible (James, 9 November 2026). The first real week was seven remote
 *   roles at international organisations, which reads as "EA jobs, posted from
 *   the Netherlands" rather than jobs here. A local way in fills both
 *   reservations at once. With no eligible local role the week goes ahead
 *   without one and the preview says so.
 * - **No repeats within four weeks.** The caller passes the ids featured
 *   recently. A follower who sees the same job twice in a month stops reading.
 * - **No padding.** Below `min` the post says so rather than filling up with
 *   weak roles; the preview shows it and James decides.
 *
 * Earning-to-give roles never appear: the board keeps them in their own
 * section, and a feed of corporate jobs would undo the framing.
 */

import { bandOf, type Band } from '../lib/bands'
import { MIN_THEMED, THEMES, themeForWeek, type ThemeKey } from './themes'
import type { ListingView } from '../sanity/queries'

export const SELECTION = {
  /** Instagram allows ten images: cover + up to eight jobs + the closing slide. */
  max: 7,
  min: 3,
  /** A way in gets a place whenever one is eligible, even if vetted roles outscore it. */
  minRoutes: 1,
  maxRoutes: 2,
  /** A role done in the Netherlands (on site or hybrid) gets a place whenever one is eligible. */
  minLocal: 1,
  maxPerCause: 3,
  /** Funding calls compete on merit; one is the most a post takes. */
  maxFunding: 1,
  deadlineMarginDays: 2,
  freshDays: 7,
  closingSoonDays: 14,
  repeatWeeks: 4,
} as const

const DAY = 864e5

/**
 * Funding calls and grant rounds, which the board files as jobs. A title that
 * talks about funding or grants is a call ("Seed Grants", "Funding for
 * Increasing Vaccine Impact", "Autumn Documentary Grant Cycle") unless it also
 * names a role: "Grants Associate" and "Technical Grant Writer" are jobs.
 * Checked against every live title in November 2026.
 */
const FUNDING_WORDS =
  /^(funding|request for (proposals|applications)|rfp|call for (proposals|applications))\b|\bgrants?\b|\bfund$/i
const ROLE_WORDS =
  /\b(associate|lead|manager|officer|writer|director|coordinator|assistant|specialist|analyst|advis[eo]r|grantmaker|head|member|consultants?|researcher)\b/i

export function isFundingCall(title: string): boolean {
  return FUNDING_WORDS.test(title) && !ROLE_WORDS.test(title)
}

/** Standing "tell us you're interested" listings, which have no role to apply for yet. */
const NOT_AN_OPENING = /\b(future roles?|general application|open application|talent pool)\b/i

/**
 * One organisation, however many records it has: the board holds "Safe AI
 * Netherlands (SAIN)" and "Safe AI Netherlands" as two employers, which let
 * both into one post. Compared by name without a bracketed abbreviation.
 */
export function organisationKey(listing: ListingView): string {
  const name = listing.employer?.name ?? listing.employer?.id ?? ''
  return name.replace(/\s*\([^)]*\)\s*/g, ' ').trim().toLowerCase()
}

/**
 * Done in the Netherlands, on site or hybrid, as opposed to remote or abroad.
 * The location text can contradict the mode: Talos Incubator Europe is filed
 * `nl-flexible` with the location "Remote (Europe)". A location that says
 * remote wins, because that is what the slide will show.
 */
export function isLocal(listing: { locationMode: ListingView['locationMode']; locationCity: ListingView['locationCity'] }): boolean {
  if (/remote/i.test(listing.locationCity ?? '')) return false
  return listing.locationMode === 'on-site-nl' || listing.locationMode === 'nl-flexible'
}

const BAND_WEIGHT: Record<Band, number> = { vetted: 3, routes: 2, dutch: 1 }

export type Pick = {
  listing: ListingView
  band: Band
  score: number
  /** Why it scored as it did, for the preview. */
  reasons: string[]
}

export type Skip = { listing: ListingView; reason: string }

export type Selection = {
  postAt: Date
  picks: Pick[]
  /** Eligible roles that lost out to the limits, best first, for the preview. */
  runnersUp: Pick[]
  /** Roles ruled out entirely, with why. */
  skipped: Skip[]
  /** False when fewer than `min` roles qualify: post nothing rather than pad. */
  enough: boolean
  /** Whether a role done in the Netherlands made it in; false when none was eligible. */
  hasLocal: boolean
  theme: ThemeKey
  /** Set when the week's theme couldn't fill a post and this is the mixed fallback. */
  fallbackFrom: ThemeKey | null
}

function time(value: string | null): number | null {
  if (!value) return null
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? null : t
}

/** Why a listing can't be featured at all, or null when it can. */
function ineligible(listing: ListingView, postAt: number, recentlyFeatured: ReadonlySet<string>): string | null {
  if (!listing.employer) return 'No organisation on the listing'
  if (listing.leverage === 'earning-to-give') return 'Earning to give'
  if (NOT_AN_OPENING.test(listing.title)) return 'Expression of interest, not an opening'
  if (recentlyFeatured.has(listing.id)) return `Featured in the last ${SELECTION.repeatWeeks} weeks`
  const deadline = time(listing.deadlineAt)
  if (deadline !== null && deadline < postAt + SELECTION.deadlineMarginDays * DAY) {
    return 'Closes too soon after posting'
  }
  const expires = time(listing.expiresAt)
  if (expires !== null && expires < postAt) return 'Expires before posting'
  return null
}

function score(listing: ListingView, postAt: number): Pick {
  const band = bandOf(listing)
  const reasons: string[] = [
    band === 'vetted' ? 'Vetted organisation' : band === 'routes' ? 'Way in' : 'Dutch institution',
  ]
  let total = BAND_WEIGHT[band]

  if (isLocal(listing)) reasons.push('In the Netherlands')
  if (isFundingCall(listing.title)) reasons.push('Funding call')

  const posted = time(listing.postedAt)
  if (posted !== null && posted >= postAt - SELECTION.freshDays * DAY) {
    total += 2
    reasons.push('Posted this week')
  }
  const deadline = time(listing.deadlineAt)
  if (deadline !== null && deadline <= postAt + SELECTION.closingSoonDays * DAY) {
    total += 2
    reasons.push('Closes within two weeks')
  }
  // The posts are in English; a role that needs Dutch still belongs on them,
  // since the audience lives here, but shouldn't lead.
  if (listing.languageRequirement === 'dutch-required') {
    total -= 2
    reasons.push('Dutch required')
  }
  return { listing, band, score: total, reasons }
}

export function selectWeeklyJobs(
  listings: ListingView[],
  opts: { postAt: Date; recentlyFeatured?: ReadonlySet<string>; theme?: ThemeKey },
): Selection {
  const postAt = opts.postAt.getTime()
  const recent = opts.recentlyFeatured ?? new Set<string>()
  const theme = THEMES[opts.theme ?? 'mixed']
  // Inside a one-cause theme the per-cause cap means nothing; inside "ways in"
  // neither do the way-in limits.
  const limits = { ...SELECTION, ...theme.limits }

  const skipped: Skip[] = []
  const candidates: Pick[] = []
  for (const listing of listings) {
    const reason = ineligible(listing, postAt, recent)
    if (reason) {
      skipped.push({ listing, reason })
      continue
    }
    const scored = score(listing, postAt)
    // Outside this week's theme isn't a fault in the listing, so it isn't "ruled out".
    if (theme.matches(listing, scored.band, isLocal(listing))) candidates.push(scored)
  }

  // Best first; among equals the newest, then the title, so a rerun picks the same.
  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      (time(b.listing.postedAt) ?? 0) - (time(a.listing.postedAt) ?? 0) ||
      a.listing.title.localeCompare(b.listing.title),
  )

  const picks: Pick[] = []
  const runnersUp: Pick[] = []
  const employers = new Set<string>()
  const perCause = new Map<string, number>()
  let routes = 0
  let funding = 0

  // The reserved places go first, so the limits below can't crowd them out:
  // the best local role, then the best way in unless the local role is one.
  const local = candidates.filter((c) => isLocal(c.listing)).slice(0, SELECTION.minLocal)
  const routesStillNeeded = Math.max(0, limits.minRoutes - local.filter((c) => c.band === 'routes').length)
  const route = candidates.filter((c) => c.band === 'routes' && !local.includes(c)).slice(0, routesStillNeeded)
  const reserved = [...local, ...route]
  const seen = new Set<string>()

  for (const candidate of [...reserved, ...candidates]) {
    const { listing, band } = candidate
    if (seen.has(listing.id)) continue
    seen.add(listing.id)
    const cause = listing.primaryCause ?? 'none'
    const fits =
      picks.length < SELECTION.max &&
      !employers.has(organisationKey(listing)) &&
      (perCause.get(cause) ?? 0) < limits.maxPerCause &&
      (band !== 'routes' || routes < limits.maxRoutes) &&
      (!isFundingCall(listing.title) || funding < SELECTION.maxFunding)
    if (!fits) {
      runnersUp.push(candidate)
      continue
    }
    picks.push(candidate)
    employers.add(organisationKey(listing))
    perCause.set(cause, (perCause.get(cause) ?? 0) + 1)
    if (band === 'routes') routes++
    if (isFundingCall(listing.title)) funding++
  }

  // Slide order is best first, reserved or not.
  picks.sort((a, b) => candidates.indexOf(a) - candidates.indexOf(b))

  return {
    postAt: opts.postAt,
    picks,
    runnersUp,
    skipped,
    enough: picks.length >= SELECTION.min,
    hasLocal: picks.some((p) => isLocal(p.listing)),
    theme: theme.key,
    fallbackFrom: null,
  }
}

/**
 * The week's post: its theme (the rotation's, unless one is given), or the
 * mixed post when the theme can't fill `MIN_THEMED` roles.
 */
export function selectForWeek(
  listings: ListingView[],
  opts: { postAt: Date; recentlyFeatured?: ReadonlySet<string>; theme?: ThemeKey },
): Selection {
  const theme = opts.theme ?? themeForWeek(opts.postAt)
  const themed = selectWeeklyJobs(listings, { ...opts, theme })
  if (theme === 'mixed' || themed.picks.length >= MIN_THEMED) return themed
  return { ...selectWeeklyJobs(listings, { ...opts, theme: 'mixed' }), fallbackFrom: theme }
}

/**
 * The next Tuesday at 09:00 in Amsterdam, as a UTC instant: when the post goes
 * out. On a Tuesday before nine it is that same morning.
 */
export function nextPostTime(now = new Date()): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Amsterdam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  let days = (2 - weekday + 7) % 7
  if (days === 0 && Number(parts.hour) >= 9) days = 7

  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + days, 9))
  // 09:00 Amsterdam is 08:00 UTC in winter and 07:00 in summer.
  const offsetHours =
    Number(
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hourCycle: 'h23' }).format(
        date,
      ),
    ) - 9
  return new Date(date.getTime() - offsetHours * 36e5)
}
