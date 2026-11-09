/**
 * What each slide of the weekly post says, resolved from the image URL.
 *
 * Same rule as the share cards (../og/content): the URL never carries text. A
 * job slide is looked up by listing id, the cover takes only a count and a
 * date, and the closing slide takes nothing, so nobody can mint an EA
 * Nederland-branded slide saying whatever they like.
 *
 * English only, like the posts themselves (James, November 2026).
 */

import { t } from '../content/i18n'
import { bandOf, type Band } from '../lib/bands'
import type { IconName } from '../components/Icon'
import { salaryFor } from '../lib/note'
import { getListingById, type ListingView } from '../sanity/queries'
import { inEuros, getEurRates, type EurRates } from './currency'
import { isFundingCall } from './select'
import { isThemeKey, THEMES, type ThemeKey } from './themes'

export const SLIDE_ROUTE = '/vacatures/social/slide'

/** Instagram's portrait size, which LinkedIn shows uncropped as well. */
export const SLIDE_SIZE = { width: 1080, height: 1350 } as const

export const SITE = 'effectiefaltruisme.nl/en/jobs'
export const NEWSLETTER = 'effectiefaltruisme.nl/en/newsletter'

export type Fact = { icon: IconName; text: string }

export type SlideContent =
  | { kind: 'cover'; count: number; date: string; plain: string; marked: string; sub: string; funding: boolean }
  | {
      kind: 'job'
      index: number
      count: number
      band: Band
      /** A grant or funding round, labelled as such instead of by band. */
      funding: boolean
      employer: string
      title: string
      facts: Fact[]
    }
  | { kind: 'cta' }

export type SlideSpec =
  | { kind: 'cover'; count: number; date: string; theme: ThemeKey; funding: boolean }
  | { kind: 'job'; id: string; index: number; count: number }
  | { kind: 'cta' }

export function slidePath(spec: SlideSpec): string {
  const q = new URLSearchParams({ kind: spec.kind })
  if (spec.kind === 'cover') {
    q.set('n', String(spec.count))
    q.set('date', spec.date)
    if (spec.theme !== 'mixed') q.set('theme', spec.theme)
    if (spec.funding) q.set('f', '1')
  } else if (spec.kind === 'job') {
    q.set('id', spec.id)
    q.set('i', String(spec.index))
    q.set('n', String(spec.count))
  }
  return `${SLIDE_ROUTE}?${q}`
}

/** Every slide of one post, in order. `date` is the posting day, YYYY-MM-DD. */
export function postSlides(
  roles: Pick<ListingView, 'id' | 'title'>[],
  date: string,
  theme: ThemeKey = 'mixed',
): SlideSpec[] {
  const ids = roles.map((r) => r.id)
  const funding = roles.some((r) => isFundingCall(r.title))
  return [
    { kind: 'cover', count: ids.length, date, theme, funding },
    ...ids.map((id, i) => ({ kind: 'job' as const, id, index: i + 1, count: ids.length })),
    { kind: 'cta' },
  ]
}

function longDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Amsterdam',
  })
}

/**
 * Salaries are stored as the source wrote them, mostly Dutch: "USD 60.000" is
 * sixty thousand, which an English reader takes for sixty. A dot followed by
 * exactly three digits is a thousands separator (the board's own rule, see
 * ingest), so it becomes a comma.
 */
export function englishThousands(text: string): string {
  return text.replace(/(\d)\.(?=\d{3}(?!\d))/g, '$1,')
}

/** "4 weeks", or months from twelve weeks up: "3 months", "6 months". */
export function stint(weeks: number | null): string | null {
  if (!weeks || weeks <= 0) return null
  if (weeks < 12) return weeks === 1 ? '1 week' : `${weeks} weeks`
  const months = Math.round(weeks / 4.33)
  return months === 1 ? '1 month' : `${months} months`
}

/** The facts under a job's title, in the order a reader scans them. */
export function jobFacts(l: ListingView, rates: EurRates | null = null): Fact[] {
  const copy = t('en')
  const facts: Fact[] = []

  let where =
    l.locationMode === 'remote'
      ? copy.locationModes.remote
      : (l.locationCity ?? l.employer?.city ?? (l.locationMode ? copy.locationModes[l.locationMode] : null))
  // A fellowship in London reads as a move unless the slide says how long:
  // the board lists programmes abroad only when they're short and paid.
  if (l.locationMode === 'temporary-abroad') {
    const length = stint(l.programmeWeeks)
    where = `${where ?? copy.locationModes['temporary-abroad']}${length ? `, for ${length}` : ', temporarily'}`
  }
  if (where) facts.push({ icon: 'map-pin', text: where })

  // Euros where we can convert; otherwise as the employer wrote it.
  const converted = inEuros(l.salaryText, rates)
  const salary = converted
    ? salaryFor({ salaryText: converted.text, salaryPeriod: l.salaryPeriod ?? (converted.annual ? 'year' : null) }, copy)
    : salaryFor(l, copy)
  if (salary) facts.push({ icon: 'coin', text: englishThousands(salary) })

  if (l.deadlineAt) facts.push({ icon: 'calendar', text: `Apply by ${longDate(l.deadlineAt)}` })

  const problem = l.subArea ? copy.subAreas[l.subArea] : l.primaryCause ? copy.causeAreas[l.primaryCause] : null
  if (problem) facts.push({ icon: 'world', text: problem })

  if (l.languageRequirement === 'dutch-required') {
    facts.push({ icon: 'language', text: copy.languageRequirements['dutch-required'] })
  }
  return facts
}

const int = (value: string | null, min: number, max: number) => {
  const n = Number(value)
  return Number.isInteger(n) && n >= min && n <= max ? n : null
}

/** The slide for an image request, or null for a malformed or unknown one (404). */
export async function resolveSlide(params: URLSearchParams): Promise<SlideContent | null> {
  const kind = params.get('kind')

  if (kind === 'cta') return { kind: 'cta' }

  if (kind === 'cover') {
    const count = int(params.get('n'), 1, 9)
    const date = params.get('date')
    if (!count || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return null
    // A theme key, never text: the copy comes from themes.ts.
    const raw = params.get('theme') ?? 'mixed'
    if (!isThemeKey(raw)) return null
    const theme = THEMES[raw]
    const funding = params.get('f') === '1'
    return { kind: 'cover', count, date: longDate(date), ...theme.cover(count, funding), sub: theme.coverSub, funding }
  }

  if (kind === 'job') {
    const count = int(params.get('n'), 1, 9)
    const index = count ? int(params.get('i'), 1, count) : null
    const id = params.get('id')
    if (!count || !index || !id) return null
    const [listing, rates] = await Promise.all([getListingById(id), getEurRates()])
    if (!listing?.employer) return null
    return {
      kind: 'job',
      index,
      count,
      band: bandOf(listing),
      funding: isFundingCall(listing.title),
      employer: listing.employer.name,
      title: listing.title,
      facts: jobFacts(listing, rates),
    }
  }

  return null
}
