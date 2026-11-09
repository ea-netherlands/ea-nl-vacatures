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

export const SLIDE_ROUTE = '/vacatures/social/slide'

/** Instagram's portrait size, which LinkedIn shows uncropped as well. */
export const SLIDE_SIZE = { width: 1080, height: 1350 } as const

export const SITE = 'effectiefaltruisme.nl/en/jobs'
export const NEWSLETTER = 'effectiefaltruisme.nl/en/newsletter'

export type Fact = { icon: IconName; text: string }

export type SlideContent =
  | { kind: 'cover'; count: number; date: string }
  | { kind: 'job'; index: number; count: number; band: Band; employer: string; title: string; facts: Fact[] }
  | { kind: 'cta' }

export type SlideSpec =
  | { kind: 'cover'; count: number; date: string }
  | { kind: 'job'; id: string; index: number; count: number }
  | { kind: 'cta' }

export function slidePath(spec: SlideSpec): string {
  const q = new URLSearchParams({ kind: spec.kind })
  if (spec.kind === 'cover') {
    q.set('n', String(spec.count))
    q.set('date', spec.date)
  } else if (spec.kind === 'job') {
    q.set('id', spec.id)
    q.set('i', String(spec.index))
    q.set('n', String(spec.count))
  }
  return `${SLIDE_ROUTE}?${q}`
}

/** Every slide of one post, in order. `date` is the posting day, YYYY-MM-DD. */
export function postSlides(ids: string[], date: string): SlideSpec[] {
  return [
    { kind: 'cover', count: ids.length, date },
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

/** The facts under a job's title, in the order a reader scans them. */
export function jobFacts(l: ListingView): Fact[] {
  const copy = t('en')
  const facts: Fact[] = []

  const where =
    l.locationMode === 'remote'
      ? copy.locationModes.remote
      : (l.locationCity ?? l.employer?.city ?? (l.locationMode ? copy.locationModes[l.locationMode] : null))
  if (where) facts.push({ icon: 'map-pin', text: where })

  const salary = salaryFor(l, copy)
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
    return { kind: 'cover', count, date: longDate(date) }
  }

  if (kind === 'job') {
    const count = int(params.get('n'), 1, 9)
    const index = count ? int(params.get('i'), 1, count) : null
    const id = params.get('id')
    if (!count || !index || !id) return null
    const listing = await getListingById(id)
    if (!listing?.employer) return null
    return {
      kind: 'job',
      index,
      count,
      band: bandOf(listing),
      employer: listing.employer.name,
      title: listing.title,
      facts: jobFacts(listing),
    }
  }

  return null
}
