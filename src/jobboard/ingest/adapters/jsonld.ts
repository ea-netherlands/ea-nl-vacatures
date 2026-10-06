/**
 * schema.org/JobPosting JSON-LD extraction.
 *
 * Used by three sources: werkenvoornederland (CC-0, verified), the
 * AcademicTransfer crawl (SEO-mature Dutch job site — checking for JSON-LD is
 * an M0 item, and this is the parser it feeds), and Homerun-hosted career
 * pages, which have no public feed at all and must be scraped (§7.2).
 *
 * It also doubles as a generic fallback for any employer careers page that
 * emits JobPosting markup, which is most of them.
 */

import { fetchText } from '../../lib/http'
import { htmlToText, mentions30PercentRuling, parseSalaryText } from '../../lib/text'
import type { NormalisedListing, SourceAdapter } from '../types'

export type JobPosting = {
  '@type'?: string | string[]
  title?: string
  description?: string
  datePosted?: string
  validThrough?: string
  employmentType?: string | string[]
  directApply?: boolean
  hiringOrganization?: { name?: string; sameAs?: string } | string
  jobLocation?: unknown
  applicantLocationRequirements?: unknown
  jobLocationType?: string
  baseSalary?: {
    currency?: string
    value?: { minValue?: number; maxValue?: number; value?: number; unitText?: string }
  }
  identifier?: { value?: string } | string
  url?: string
}

/**
 * Pulls every JSON-LD node from a page.
 *
 * Nodes are flattened recursively rather than only at the top level, because
 * wrapping the posting inside a container is common and the shape varies by
 * site. AcademicTransfer, for example, publishes a full JobPosting nested under
 * `mainEntity` on a WebPage node (VERIFIED against a live vacancy) — a
 * top-level-only reader finds nothing there and wrongly concludes the site has
 * no structured data at all.
 */
export function extractJsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []

  /** Containers that legitimately wrap another entity. */
  const NESTED_KEYS = ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item']

  const collect = (node: unknown, depth: number): void => {
    if (!node || typeof node !== 'object' || depth > 6) return
    if (Array.isArray(node)) {
      for (const item of node) collect(item, depth + 1)
      return
    }
    const record = node as Record<string, unknown>
    out.push(record)
    for (const key of NESTED_KEYS) {
      if (key in record) collect(record[key], depth + 1)
    }
  }

  for (const m of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    // Some CMSs wrap the payload in a CDATA guard.
    const text = m[1].trim().replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '')
    try {
      collect(JSON.parse(text), 0)
    } catch {
      // Malformed blocks are common on marketing pages; skip rather than fail
      // the whole page.
    }
  }
  return out
}

export function findJobPosting(html: string): JobPosting | null {
  for (const node of extractJsonLd(html)) {
    const type = node['@type']
    const types = Array.isArray(type) ? type : [type]
    if (types.includes('JobPosting')) return node as JobPosting
  }
  return null
}

function locationString(loc: unknown): string | null {
  if (!loc) return null
  const items = Array.isArray(loc) ? loc : [loc]
  const parts: string[] = []
  for (const item of items) {
    if (typeof item === 'string') {
      parts.push(item)
      continue
    }
    const place = item as Record<string, any>
    const addr = place?.address ?? place
    const bits = [addr?.addressLocality, addr?.addressRegion, addr?.addressCountry]
      .map((b) => (typeof b === 'object' && b ? (b.name ?? b.addressCountry) : b))
      .filter((b) => typeof b === 'string' && b)
    if (bits.length) parts.push(bits.join(', '))
    else if (place?.name) parts.push(String(place.name))
  }
  return parts.length ? [...new Set(parts)].join(' · ') : null
}

function countryCode(loc: unknown): string | null {
  const items = Array.isArray(loc) ? loc : [loc]
  for (const item of items) {
    const addr = (item as Record<string, any>)?.address ?? item
    const c = addr?.addressCountry
    const code = typeof c === 'object' && c ? (c.name ?? c.identifier) : c
    if (typeof code === 'string') {
      const trimmed = code.trim()
      if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase()
      if (/^(the )?netherlands$|^nederland$/i.test(trimmed)) return 'NL'
    }
  }
  return null
}

/** JobPosting → NormalisedListing. */
export function normaliseJobPosting(
  posting: JobPosting,
  ctx: {
    externalId: string
    url: string
    employerId?: string | null
    employerNameFallback?: string | null
  },
): NormalisedListing {
  const org =
    typeof posting.hiringOrganization === 'string'
      ? posting.hiringOrganization
      : posting.hiringOrganization?.name
  const html = posting.description ?? null
  const description = htmlToText(html)
  const salary = posting.baseSalary?.value
  const parsed = parseSalaryText(description.slice(0, 4000))

  const remoteHint =
    posting.jobLocationType === 'TELECOMMUTE'
      ? locationString(posting.applicantLocationRequirements) ?? 'Remote'
      : null

  return {
    externalId: ctx.externalId,
    employerId: ctx.employerId ?? null,
    employerName: (org ?? ctx.employerNameFallback ?? '').trim(),
    title: htmlToText(posting.title ?? '').trim(),
    applyUrl: posting.url ?? ctx.url,
    description,
    descriptionHtml: html,
    locationRaw: remoteHint
      ? `Remote (${remoteHint})`
      : locationString(posting.jobLocation),
    country: countryCode(posting.jobLocation),
    postedAt: posting.datePosted ? safeDate(posting.datePosted) : null,
    deadlineAt: posting.validThrough ? safeDate(posting.validThrough) : null,
    salaryMin: salary?.minValue ?? salary?.value ?? parsed.min,
    salaryMax: salary?.maxValue ?? parsed.max,
    salaryCurrency: posting.baseSalary?.currency ?? parsed.currency,
    salaryPeriod: normalisePeriod(salary?.unitText) ?? parsed.period,
    mentions30PercentRuling: mentions30PercentRuling(`${posting.title ?? ''}\n${description}`),
  }
}

/**
 * Plain-page fallback for a careers page with no JobPosting markup at all.
 *
 * Most Dutch mission-driven organisations publish vacancies as ordinary web
 * pages — of thirty-one probed in August 2026, almost none emit structured
 * data — which left them as a curator's manual round that in practice nobody
 * did. De Geefrevolutie advertised two roles in October 2026 that the board
 * only found because someone happened to look.
 *
 * Opt-in per source, never a default: without markup we cannot tell a
 * vacancy from a blog post, so the source's `linkPattern` has to do that job
 * by pointing at an index that lists nothing but vacancies. Everything this
 * builds still goes through the classifier and a human review like any other
 * listing, so a wrong title costs a curator one edit, not a bad publication.
 */
export type PlainPageConfig = {
  /**
   * Regex run against the page's cleaned text; group 1 is the job title.
   * Falls back to the first <h1>, then <title>, when absent or unmatched.
   */
  titlePattern?: string
  /**
   * Regex marking where the vacancy ends and the site footer begins. Footers
   * carry postcodes and registration numbers that the salary parser happily
   * reads as a pay range, so cutting them off matters more than it looks.
   */
  stopPattern?: string
}

/**
 * The page's visible text, one paragraph per block, with the debris page
 * builders leave behind removed. Framer in particular renders every text node
 * once per breakpoint, so the same line arrives two or three times in a row.
 */
export function plainPageText(html: string): string {
  const lines = htmlToText(html)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => (l.match(/\p{L}/gu)?.length ?? 0) >= 2)
  const out: string[] = []
  for (const line of lines) if (line !== out[out.length - 1]) out.push(line)
  return out.join('\n\n')
}

const DUTCH_MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

/**
 * "De vacature sluit op 18 oktober 2026", "Reageren kan tot 3 november".
 *
 * Without a closing date the listing falls back to sixty days from first
 * sight, which on a three-week vacancy means six weeks of a dead link — so
 * this is worth the regex. A missing year is read as this year, unless that
 * puts the date more than half a year in the past, in which case the ad means
 * next year (a December ad closing "15 januari").
 */
export function parseDutchClosingDate(text: string, now = new Date()): Date | null {
  const m = text.match(
    new RegExp(
      `(?:sluit|deadline|reageren kan tot|solliciteren kan tot)[^\\d\\n]{0,30}?(\\d{1,2})\\s+(${DUTCH_MONTHS.join('|')})(?:\\s+(\\d{4}))?`,
      'i',
    ),
  )
  if (!m) return null
  const day = Number(m[1])
  const month = DUTCH_MONTHS.indexOf(m[2].toLowerCase())
  let year = m[3] ? Number(m[3]) : now.getUTCFullYear()
  // End of the closing day in the Netherlands, near enough either side of DST.
  let date = new Date(Date.UTC(year, month, day, 21, 59))
  if (!m[3] && date.getTime() < now.getTime() - 183 * 864e5) {
    year += 1
    date = new Date(Date.UTC(year, month, day, 21, 59))
  }
  return Number.isNaN(date.getTime()) ? null : date
}

/** A synthetic JobPosting built from a page with no markup, or null if it has no title. */
export function postingFromPlainPage(
  html: string,
  config: PlainPageConfig,
  now = new Date(),
): JobPosting | null {
  let text = plainPageText(html)
  let title: string | null = null
  if (config.titlePattern) {
    const m = text.match(new RegExp(config.titlePattern, 'm'))
    if (m?.[1]) {
      title = m[1].trim()
      // Everything above the title is navigation.
      text = text.slice(m.index ?? 0)
    }
  }
  if (config.stopPattern) {
    const stop = text.search(new RegExp(config.stopPattern, 'm'))
    if (stop > 0) text = text.slice(0, stop).trim()
  }
  title ??= htmlToText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '').trim() || null
  title ??= htmlToText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim() || null
  if (!title) return null

  // Read pay from the one line that states it, not the whole page: an ad also
  // mentions hours, dates and team sizes, any of which the parser can take for
  // a salary bound.
  const salaryLine = text.split('\n').find((l) => /€/.test(l) && /salaris|bruto|per maand|per jaar/i.test(l))
  const pay = parseSalaryText(salaryLine ?? null)
  const deadline = parseDutchClosingDate(text, now)
  return {
    '@type': 'JobPosting',
    title,
    description: text,
    validThrough: deadline?.toISOString(),
    baseSalary:
      pay.min || pay.max
        ? {
            currency: pay.currency ?? 'EUR',
            value: {
              minValue: pay.min ?? undefined,
              maxValue: pay.max ?? undefined,
              unitText: pay.period === 'month' ? 'MONTH' : pay.period === 'year' ? 'YEAR' : undefined,
            },
          }
        : undefined,
  }
}

function safeDate(v: string): Date | null {
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function normalisePeriod(unitText: string | undefined): string | null {
  if (!unitText) return null
  const u = unitText.toUpperCase()
  if (u === 'YEAR') return 'year'
  if (u === 'MONTH') return 'month'
  if (u === 'HOUR') return 'hour'
  if (u === 'WEEK') return 'week'
  return null
}

/**
 * Generic careers-page adapter. Give it a list of listing URLs (or an index
 * page plus a link pattern) and it reads JobPosting markup from each.
 *
 * This is the Homerun fallback: every Homerun API endpoint requires a Bearer
 * token and the docs state there are no public endpoints (§7.2), so the only
 * route is the career page's own markup.
 */
export const jsonldCareers: SourceAdapter = {
  id: 'jsonld-careers',
  async *fetch(config, ctx) {
    const explicit = (config.urls as string[] | undefined) ?? []
    const indexUrl = config.indexUrl as string | undefined
    const linkPattern = config.linkPattern as string | undefined

    let urls = [...explicit]
    if (indexUrl && linkPattern) {
      const html = await fetchText(indexUrl)
      const re = new RegExp(linkPattern, 'gi')
      const found = new Set<string>()
      for (const m of html.matchAll(re)) {
        const href = m[1] ?? m[0]
        try {
          found.add(new URL(href, indexUrl).toString())
        } catch {
          /* skip unparseable hrefs */
        }
      }
      urls = [...new Set([...urls, ...found])]
      ctx.log(`jsonld-careers: ${found.size} candidate links from ${indexUrl}`)
    }

    for (const url of urls) {
      if (Date.now() >= ctx.deadline) {
        ctx.log(`jsonld-careers: out of time, ${urls.length} urls remaining next run`)
        ctx.markIncomplete('jsonld-careers: deadline reached before every page was fetched')
        return
      }
      try {
        const html = await fetchText(url)
        const plain = config.plainPages as PlainPageConfig | undefined
        const posting = findJobPosting(html) ?? (plain ? postingFromPlainPage(html, plain) : null)
        if (!posting) {
          ctx.log(`jsonld-careers: no JobPosting markup at ${url}`)
          continue
        }
        yield { externalId: url, payload: { posting, url } }
      } catch (err) {
        ctx.log(`jsonld-careers: failed ${url}: ${(err as Error).message}`)
        ctx.markIncomplete(`jsonld-careers: ${url} failed to fetch`)
      }
    }
  },
  normalise(raw, config) {
    const { posting, url } = raw.payload as { posting: JobPosting; url: string }
    return normaliseJobPosting(posting, {
      externalId: raw.externalId,
      url,
      employerId: (config.employerId as string | undefined) ?? null,
      employerNameFallback: (config.employerName as string | undefined) ?? null,
    })
  },
}
