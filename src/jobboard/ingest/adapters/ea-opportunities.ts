/**
 * The EA Opportunities board — effectivealtruism.org/opportunities, added
 * October 2026.
 *
 * CEA's board is the one EA board that lists programmes as first-class
 * entries: every record carries `opportunityTypes`, and Fellowship sits next
 * to Full-time. That is why it is here. Generator Residency (Kairos ×
 * Constellation) is on it; Kairos's own Ashby board, which we already poll,
 * lists only the staff role that runs it.
 *
 * Access. The page ships its whole Airtable dataset to the browser — no API,
 * no key. EA NL's older static aggregator (ea-nl-jobboard/) read it from the
 * `__NEXT_DATA__` script tag. By October 2026 the site had moved to the Next.js
 * App Router and that tag is gone: the same array now arrives inside the React
 * Server Components stream, as `self.__next_f.push([1, "..."])` chunks. Two
 * quirks of that format matter here, both handled in `resolveFlight`:
 *
 * - A string value starting with `$` is escaped as `$$` ("$$90,000 – $110,000"
 *   is a salary of $90,000 – $110,000).
 * - A long string is not inlined. The value is `$337`, a reference to a
 *   separate text row `337:T<hex byte length>,<text>` elsewhere in the stream.
 *
 * The old `__NEXT_DATA__` path is still read first, so a rollback on their
 * side does not break us.
 */

import { fetchText } from '../../lib/http'
import { canonicaliseUrl, parseSalaryText } from '../../lib/text'
import type { ListingKind } from '../../taxonomy'
import type { NormalisedListing, SourceAdapter } from '../types'
import { monthlyStipend, programmePageText, withProgrammePage } from './programme-page'

export const EA_OPPORTUNITIES_URL = 'https://www.effectivealtruism.org/opportunities'

export type EaOpportunity = {
  id: string
  title: string
  organizations?: { name?: string; link?: string }[]
  organization?: string[] | string
  opportunityTypes?: string[]
  applicationLink?: string
  applicationDeadline?: string
  description?: string
  location?: string
  locationFilter?: string[]
  createdAt?: string
  salaryOriginal?: string
}

export type EaOpportunityPayload = EaOpportunity & { programmePage?: string | null }

// ---------------------------------------------------------------------------
// Reading the page
// ---------------------------------------------------------------------------

/** Every `self.__next_f.push([1, "…"])` string, joined: the RSC stream as the browser sees it. */
export function flightStream(html: string): string {
  let out = ''
  for (const m of html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g)) {
    try {
      const chunk = JSON.parse(m[1]) as unknown[]
      if (chunk[0] === 1 && typeof chunk[1] === 'string') out += chunk[1]
    } catch {
      // Not every push is a JSON array literal; the data chunks always are.
    }
  }
  return out
}

/** Takes `byteLength` UTF-8 bytes of `s` from `start`, returning the text and where it ended. */
function sliceUtf8(s: string, start: number, byteLength: number): string {
  let bytes = 0
  let i = start
  while (i < s.length && bytes < byteLength) {
    const cp = s.codePointAt(i)!
    bytes += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4
    i += cp > 0xffff ? 2 : 1
  }
  return s.slice(start, i)
}

/** Text rows (`id:T<hex length>,<text>`), which long strings are moved out into. */
export function flightTextRows(stream: string): Map<string, string> {
  const rows = new Map<string, string>()
  for (const m of stream.matchAll(/(?:^|\n)([0-9a-f]+):T([0-9a-f]+),/g)) {
    const start = (m.index ?? 0) + m[0].length
    rows.set(m[1], sliceUtf8(stream, start, Number.parseInt(m[2], 16)))
  }
  return rows
}

/** Undoes the RSC string encoding throughout a parsed value. */
export function resolveFlight<T>(value: T, rows: Map<string, string>): T {
  if (typeof value === 'string') {
    if (value.startsWith('$$')) return value.slice(1) as T
    if (value === '$undefined') return undefined as T
    const ref = value.match(/^\$([0-9a-f]+)$/)
    if (ref) return (rows.get(ref[1]) ?? value) as T
    return value
  }
  if (Array.isArray(value)) return value.map((v) => resolveFlight(v, rows)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      const resolved = resolveFlight(v, rows)
      if (resolved !== undefined) out[k] = resolved
    }
    return out as T
  }
  return value
}

/** The end of the JSON array that opens at `start`, string-aware. */
function arrayEnd(s: string, start: number): number {
  let depth = 0
  let inString = false
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '[' || ch === '{') depth++
    else if (ch === ']' || ch === '}') {
      depth--
      if (depth === 0) return i + 1
    }
  }
  return -1
}

/** The opportunities array from the page, in either the App Router or the older Pages Router shape. */
export function eaOpportunities(html: string): EaOpportunity[] {
  const nextData = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (nextData) {
    const opps = JSON.parse(nextData[1])?.props?.pageProps?.opportunities
    if (Array.isArray(opps)) return opps
  }

  const stream = flightStream(html)
  const rows = flightTextRows(stream)
  let best: EaOpportunity[] = []
  for (const m of stream.matchAll(/"opportunities":\[/g)) {
    const start = (m.index ?? 0) + m[0].length - 1
    const end = arrayEnd(stream, start)
    if (end < 0) continue
    try {
      const parsed = JSON.parse(stream.slice(start, end)) as EaOpportunity[]
      if (parsed.length > best.length) best = parsed
    } catch {
      // A prop of the same name that is not the dataset; keep looking.
    }
  }
  if (!best.length) throw new Error('ea-opportunities: no opportunities array in the page')
  return resolveFlight(best, rows)
}

// ---------------------------------------------------------------------------
// Which records to take
// ---------------------------------------------------------------------------

/**
 * The board's types, by what we do with them.
 *
 * Internships stay jobs: an internship is usually a post in a team, and the
 * internship rule in ../../classify/prompt.ts already scores those properly. Courses are left out by default: on this
 * board they are almost all free online reading groups, which are not
 * openings, and as remote listings they would pass the location test and
 * reach the classifier. Funding, events, advising, contests and volunteering
 * are not openings either.
 */
const PROGRAMME_TYPES = new Set(['Fellowship'])
const JOB_TYPES = new Set(['Full-time', 'Part-time', 'Internship'])

export function listingKindOf(types: string[] | undefined): ListingKind | null {
  const t = types ?? []
  if (t.some((x) => PROGRAMME_TYPES.has(x))) return 'programme'
  if (t.some((x) => JOB_TYPES.has(x))) return 'job'
  return null
}

/** Location filters a Netherlands resident could hold a job under. Programmes skip this: they are judged by the short-programme rule. */
const NL_REACHABLE_FILTERS = new Set(['Netherlands', 'Remote', 'Europe (excluding UK)', 'Europe'])

/**
 * Whether a record is worth taking at all. Deliberately generous, like the
 * other EA-board adapters: stage one does the real filtering.
 */
export function wanted(o: EaOpportunity): boolean {
  const kind = listingKindOf(o.opportunityTypes)
  if (!kind || !o.applicationLink || !o.title) return false
  // Curated lists of other lists ("List of Recurring Fellowships…") are
  // pointers, not openings.
  if (/^list of\b/i.test(o.title.trim()) || /(^|\.)airtable\.com$/i.test(hostOf(o.applicationLink))) {
    return false
  }
  if (kind === 'programme') return true
  return (o.locationFilter ?? []).some((f) => NL_REACHABLE_FILTERS.has(f))
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

/** Country names the board uses, for the ones stage one needs a code for. */
const COUNTRY_CODES: Record<string, string> = {
  Netherlands: 'NL',
  USA: 'US',
  UK: 'GB',
  Canada: 'CA',
  Germany: 'DE',
  France: 'FR',
  Belgium: 'BE',
  Sweden: 'SE',
  Switzerland: 'CH',
  Spain: 'ES',
  Italy: 'IT',
  Singapore: 'SG',
  India: 'IN',
  Australia: 'AU',
}

/** Every record ends with the same AI-disclosure line, which is about the board, not the role. */
function cleanDescription(text: string | undefined): string | null {
  const t = (text ?? '').replace(/\n*\*This text was generated by AI\.[\s\S]*$/, '').trim()
  return t || null
}

export const eaOpportunitiesBoard: SourceAdapter = {
  id: 'ea-opportunities',
  async *fetch(config, ctx) {
    const html = await fetchText((config.boardUrl as string) ?? EA_OPPORTUNITIES_URL)
    const all = eaOpportunities(html)
    const taken = all.filter(wanted)
    ctx.log(`ea-opportunities: ${all.length} records, ${taken.length} jobs and programmes taken`)

    for (const o of taken) {
      const payload: EaOpportunityPayload = { ...o }
      if (listingKindOf(o.opportunityTypes) === 'programme') {
        payload.programmePage = await programmePageText(canonicaliseUrl(o.applicationLink!), ctx)
      }
      yield { externalId: o.id, payload }
    }
  },
  normalise(raw): NormalisedListing | null {
    const o = raw.payload as EaOpportunityPayload
    const kind = listingKindOf(o.opportunityTypes)
    if (!kind || !o.applicationLink) return null

    const filters = o.locationFilter ?? []
    const location = o.location?.trim() ?? ''
    // The filters carry the "Remote" and the region that the free-text field
    // often leaves out, and stage one reads both.
    const filterText = filters.join(', ')
    const locationRaw =
      location && filterText && location !== filterText
        ? `${location} (${filterText})`
        : location || filterText || null
    const countries = [...new Set(filters.map((f) => COUNTRY_CODES[f]).filter(Boolean))]
    const country = filters.includes('Netherlands')
      ? 'NL'
      : !filters.includes('Remote') && countries.length === 1
        ? countries[0]
        : null

    const salary = parseSalaryText(o.salaryOriginal)
    const stipend = !salary.min && kind === 'programme' ? monthlyStipend(o.programmePage ?? null) : null
    const pay = stipend ?? salary

    const orgName =
      o.organizations?.[0]?.name ??
      (Array.isArray(o.organization) ? o.organization[0] : o.organization) ??
      ''

    return {
      externalId: raw.externalId,
      employerId: null,
      employerName: orgName.trim(),
      title: o.title.trim(),
      applyUrl: canonicaliseUrl(o.applicationLink),
      description: withProgrammePage(cleanDescription(o.description), o.programmePage ?? null),
      descriptionHtml: null,
      locationRaw,
      country,
      postedAt: o.createdAt ? new Date(o.createdAt) : null,
      // A bare date. Programmes close at the end of it, often Anywhere on Earth.
      deadlineAt: o.applicationDeadline ? new Date(`${o.applicationDeadline}T23:59:59Z`) : null,
      salaryMin: pay.min,
      salaryMax: pay.max,
      salaryCurrency: pay.min ? pay.currency : null,
      salaryPeriod: pay.min ? pay.period : null,
      mentions30PercentRuling: false,
      listingKind: kind,
    }
  },
}
