/**
 * What goes on each share card, resolved from a slug or a page key.
 *
 * The image URL never carries the text itself. A `?title=` card would let
 * anyone mint an EA Nederland-branded image saying whatever they like, hosted
 * on our domain; looking the text up from the slug means the card can only
 * ever say what the page says.
 */

import { t, type Locale } from '../content/i18n'
import { CAUSE_AREAS, type CauseArea } from '../taxonomy'
import { getBoardStats, getEmployer, getEmployerListings, getListingBySlug, getLiveListings } from '../sanity/queries'
import type { CardContent } from './card'

export const OG_PAGES = ['index', 'method', 'employers', 'causes', 'earning-to-give', 'suggest'] as const
export type OgPage = (typeof OG_PAGES)[number]

export type OgSpec = { page: OgPage } | { listing: string } | { employer: string } | { cause: string }

export const OG_ROUTE = '/vacatures/og'

/** The size every platform's large card expects. */
export const OG_SIZE = { width: 1200, height: 630 } as const

export function ogImagePath(spec: OgSpec, locale: Locale): string {
  const [key, value] = Object.entries(spec)[0] as [string, string]
  return `${OG_ROUTE}?lang=${locale}&${key}=${encodeURIComponent(value)}`
}

const COPY = {
  nl: {
    listing: 'Vacature',
    programme: 'Programma',
    employer: 'Organisatie',
    cause: 'Probleemgebied',
    board: 'Vacaturebord',
    site: 'effectiefaltruisme.nl/vacatures',
    open: (n: number) => (n === 1 ? '1 open vacature' : `${n} open vacatures`),
    closes: (d: string) => `Sluit ${d}`,
    workAt: (name: string) => `Werken bij ${name}`,
    pages: {
      method: 'Waarom deze banen?',
      employers: 'Organisaties met open vacatures',
      causes: 'Probleemgebieden',
      'earning-to-give': 'Earning to give',
      suggest: 'Mis je een vacature? Laat het ons weten',
    },
  },
  en: {
    listing: 'Job',
    programme: 'Programme',
    employer: 'Organisation',
    cause: 'Problem area',
    board: 'Job board',
    site: 'effectiefaltruisme.nl/en/jobs',
    open: (n: number) => (n === 1 ? '1 open role' : `${n} open roles`),
    closes: (d: string) => `Closes ${d}`,
    workAt: (name: string) => `Working at ${name}`,
    pages: {
      method: 'Why these jobs?',
      employers: 'Organisations with open roles',
      causes: 'Problem areas',
      'earning-to-give': 'Earning to give',
      suggest: 'Missing a role? Tell us',
    },
  },
} as const

function formatDate(value: string | null, locale: Locale): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime()) || d.getTime() < Date.now()) return null
  return d.toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'long' })
}

/** The board's own card: what every page falls back to. */
async function boardCard(locale: Locale, headline?: string): Promise<CardContent> {
  const c = COPY[locale]
  const { live } = await getBoardStats()
  return {
    eyebrow: c.board,
    headline: headline ?? t(locale).heroTitle,
    facts: live ? [c.open(live)] : [],
    site: c.site,
  }
}

export async function resolveCard(params: URLSearchParams): Promise<CardContent> {
  const locale: Locale = params.get('lang') === 'en' ? 'en' : 'nl'
  const c = COPY[locale]
  const copy = t(locale)

  const listingSlug = params.get('listing')
  if (listingSlug) {
    const l = await getListingBySlug(listingSlug)
    if (l) {
      const where =
        l.locationMode === 'remote'
          ? copy.locationModes.remote
          : l.locationCity ?? l.employer?.city ?? (l.locationMode ? copy.locationModes[l.locationMode] : null)
      const problem = l.subArea ? copy.subAreas[l.subArea] : l.primaryCause ? copy.causeAreas[l.primaryCause] : null
      const closes = formatDate(l.deadlineAt, locale)
      return {
        eyebrow: l.listingKind === 'programme' ? c.programme : c.listing,
        kicker: l.employer?.name ?? null,
        headline: l.title,
        facts: [where, problem, closes ? c.closes(closes) : null].filter((f): f is string => Boolean(f)),
        site: c.site,
      }
    }
  }

  const employerSlug = params.get('employer')
  if (employerSlug) {
    const e = await getEmployer(employerSlug)
    if (e) {
      const roles = await getEmployerListings(e.id)
      return {
        eyebrow: c.employer,
        headline: c.workAt(e.name),
        facts: [e.city, roles.length ? c.open(roles.length) : null].filter((f): f is string => Boolean(f)),
        site: c.site,
      }
    }
  }

  const cause = params.get('cause') as CauseArea | null
  if (cause && CAUSE_AREAS.includes(cause)) {
    const live = await getLiveListings({ excludeEarningToGive: true })
    const n = live.filter((l) => l.primaryCause === cause || l.secondaryCauses.includes(cause)).length
    return {
      eyebrow: c.cause,
      headline: copy.causeAreas[cause],
      facts: n ? [c.open(n)] : [],
      site: c.site,
    }
  }

  const page = params.get('page') as OgPage | null
  if (page && page !== 'index' && OG_PAGES.includes(page)) return boardCard(locale, c.pages[page])
  return boardCard(locale)
}
