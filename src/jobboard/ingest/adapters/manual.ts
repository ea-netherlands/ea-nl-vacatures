/**
 * Listings a curator adds by hand, from the page's URL — added October 2026.
 *
 * Every other source finds its listings itself. That leaves out anything no
 * source lists: SteadRise's Executive Catalyst, a three-month programme for
 * experienced operators moving into AI safety, was on none of 80,000 Hours,
 * Probably Good or EA Opportunities, so the board never saw it. This source is
 * a short list of URLs with the few facts a page does not reliably state (its
 * title, who runs it, where it is held), and everything after the fetch is the
 * normal pipeline: stage one, the classifier, the review queue.
 *
 * The list lives in the seed (../../seed/manual-listings.ts), and
 * `src/scripts/add-listing.ts` adds to it in the database without a deploy.
 * The source never returns a complete set — dropping an entry from the list
 * means "stop refreshing it", not "the programme closed" — so closure
 * detection never runs on it. A listing leaves the board the usual way, by
 * its deadline or by the curator.
 */

import { htmlToText, mentions30PercentRuling, canonicaliseUrl, parseSalaryText } from '../../lib/text'
import { LISTING_KINDS, type ListingKind } from '../../taxonomy'
import type { NormalisedListing, SourceAdapter } from '../types'
import { monthlyStipend, programmePageText, withProgrammePage } from './programme-page'

export type ManualListing = {
  /** The page to read. Also the apply link, unless `applyUrl` says otherwise. */
  url: string
  title: string
  employerName: string
  /** Watchlist id, when the employer is on it. Otherwise the runner matches the name. */
  employerId?: string
  /** Left out, the runner reads the title (`looksLikeProgramme`), as for any unlabelled source. */
  kind?: ListingKind
  applyUrl?: string
  /** Free text, as an ad would put it: "Remote", "Berkeley, CA", "Amsterdam". */
  location?: string
  /** ISO 3166-1 alpha-2. */
  country?: string
  /** YYYY-MM-DD; the listing closes at the end of that day. */
  deadline?: string
  /**
   * Pay as the page states it, e.g. "$8,500 per month". Never read from the
   * page as a whole: programme pages quote alumni salaries and illustrative
   * roles, and a wrong figure on the listing is worse than none.
   */
  pay?: string
  /** The curator's own line about it, shown to the classifier above the page text. */
  summary?: string
  /** YYYY-MM-DD the curator added it; stands in for a posting date. */
  addedOn?: string
}

type ManualPayload = ManualListing & { page: string | null }

/** The source's entries, with anything malformed reported rather than thrown. */
export function manualEntries(config: Record<string, unknown>): {
  entries: ManualListing[]
  problems: string[]
} {
  const raw = Array.isArray(config.listings) ? (config.listings as unknown[]) : []
  const entries: ManualListing[] = []
  const problems: string[] = []
  for (const [i, item] of raw.entries()) {
    const problem = manualEntryProblem(item)
    if (problem) problems.push(`entry ${i}: ${problem}`)
    else entries.push(item as ManualListing)
  }
  return { entries, problems }
}

/** What is wrong with one entry, or null when it can be ingested. */
export function manualEntryProblem(item: unknown): string | null {
  if (!item || typeof item !== 'object') return 'not an object'
  const e = item as Partial<ManualListing>
  for (const key of ['url', 'title', 'employerName'] as const) {
    if (typeof e[key] !== 'string' || !e[key]!.trim()) return `${key} is required`
  }
  for (const key of ['url', 'applyUrl'] as const) {
    if (e[key] === undefined) continue
    try {
      const { protocol } = new URL(e[key]!)
      if (protocol !== 'https:' && protocol !== 'http:') return `${key} is not a web address`
    } catch {
      return `${key} is not a valid URL`
    }
  }
  if (e.kind !== undefined && !(LISTING_KINDS as readonly string[]).includes(e.kind)) {
    return `kind must be one of ${LISTING_KINDS.join(', ')}`
  }
  for (const key of ['deadline', 'addedOn'] as const) {
    if (e[key] !== undefined && !isIsoDate(e[key]!)) return `${key} must be YYYY-MM-DD`
  }
  if (e.country !== undefined && !/^[A-Z]{2}$/.test(e.country)) return 'country must be a two-letter code'
  return null
}

function isIsoDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime())
}

/** The external id: the page, canonicalised, so a re-pasted link with tracking tags is the same entry. */
export function manualExternalId(entry: Pick<ManualListing, 'url'>): string {
  return canonicaliseUrl(entry.url)
}

/**
 * Seeded entries plus any added in the database since, by URL; the seed wins
 * where both have one. `npm run seed` replaces a source's config wholesale,
 * which would otherwise silently drop every listing added with add-listing.ts.
 */
export function mergeManualListings(seeded: ManualListing[], existing: unknown): ManualListing[] {
  const seededIds = new Set(seeded.map(manualExternalId))
  const kept = (Array.isArray(existing) ? existing : []).filter(
    (e): e is ManualListing => !manualEntryProblem(e) && !seededIds.has(manualExternalId(e as ManualListing)),
  )
  return [...seeded, ...kept]
}

export function normaliseManual(entry: ManualListing, page: string | null): NormalisedListing {
  const statedPay = parseSalaryText(entry.pay ?? null)
  const pay = statedPay.min ? statedPay : entry.kind === 'programme' ? monthlyStipend(page) : null
  const description = withProgrammePage(entry.summary?.trim() || null, page)
  return {
    externalId: manualExternalId(entry),
    employerId: entry.employerId ?? null,
    employerName: entry.employerName.trim(),
    title: htmlToText(entry.title).trim(),
    applyUrl: canonicaliseUrl(entry.applyUrl ?? entry.url),
    description,
    descriptionHtml: null,
    locationRaw: entry.location?.trim() || null,
    country: entry.country ?? (/\b(netherlands|nederland)\b/i.test(entry.location ?? '') ? 'NL' : null),
    postedAt: entry.addedOn ? new Date(`${entry.addedOn}T00:00:00Z`) : null,
    deadlineAt: entry.deadline ? new Date(`${entry.deadline}T23:59:59Z`) : null,
    salaryMin: pay?.min ?? null,
    salaryMax: pay?.max ?? null,
    salaryCurrency: pay?.min ? pay.currency : null,
    salaryPeriod: pay?.min ? pay.period : null,
    mentions30PercentRuling: mentions30PercentRuling(`${entry.title}\n${description ?? ''}`),
    ...(entry.kind ? { listingKind: entry.kind } : {}),
  }
}

export const manualListings: SourceAdapter = {
  id: 'manual',
  async *fetch(config, ctx) {
    const { entries, problems } = manualEntries(config)
    for (const p of problems) ctx.log(`manual: skipped ${p}`)
    ctx.log(`manual: ${entries.length} listings`)

    for (const entry of entries) {
      if (entry.deadline && new Date(`${entry.deadline}T23:59:59Z`).getTime() < Date.now()) {
        ctx.log(`manual: ${entry.url} closed on ${entry.deadline}, not fetched`)
        continue
      }
      // Week-cached, and quiet on failure: a page that will not load leaves
      // the curator's title and summary, which is still worth reviewing.
      const page = await programmePageText(canonicaliseUrl(entry.url), ctx)
      if (!page) ctx.log(`manual: no page text for ${entry.url}`)
      const payload: ManualPayload = { ...entry, page }
      yield { externalId: manualExternalId(entry), payload }
    }
  },
  normalise(raw) {
    const { page, ...entry } = raw.payload as ManualPayload
    return normaliseManual(entry, page)
  },
}
