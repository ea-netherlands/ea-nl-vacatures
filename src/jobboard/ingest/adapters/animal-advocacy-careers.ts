/**
 * Animal Advocacy Careers (AAC) — job board, added November 2026.
 *
 * AAC curates roles at animal advocacy organisations, EA-aligned and not, the
 * way 80,000 Hours and Probably Good do for their cause areas. So it is an
 * `ea-board` source: a role it lists files under vetted organisations
 * (lib/bands.ts) and, like the other two curated boards, is auto-published
 * (sanity/promote.ts).
 *
 * The board is WordPress with WP Job Manager, which exposes the listings over
 * the core REST API at /wp-json/wp/v2/job-listings (checked November 2026: 136
 * open roles, 100 per page). Filled roles are dropped from it, so it returns a
 * complete set. The useful fields:
 *
 *   - `meta._company_website` is AAC's outbound link to the role itself (the
 *     employer's ATS, a Google Doc, ...), not the company homepage, despite the
 *     name. `meta._application` is nearly always empty.
 *   - Location and remote status are taxonomy terms, readable as slugs in
 *     `class_list` (`job_listing_location-netherlands`, `job_remote-remote`).
 *   - `job_type-internship` marks internships; there is no programme label.
 */

import { fetchJson } from '../../lib/http'
import { canonicaliseUrl, decodeEntities, htmlToText, parseSalaryText } from '../../lib/text'
import type { NormalisedListing, SourceAdapter } from '../types'

const DEFAULT_API_URL = 'https://animaladvocacycareers.org/wp-json/wp/v2/job-listings'
const PER_PAGE = 100
/** Safety stop; the board had two pages in November 2026. */
const MAX_PAGES = 10

export type AacJob = {
  id: number
  date_gmt?: string
  link?: string
  title?: { rendered?: string }
  content?: { rendered?: string }
  meta?: Record<string, unknown>
  class_list?: string[]
}

const EUROPE =
  /^(netherlands|europe|belgium|germany|france|united-kingdom|ireland|spain|portugal|italy|austria|switzerland|denmark|sweden|norway|finland|poland|czech-republic|lithuania|latvia|estonia|hungary|romania|bulgaria|greece|croatia|slovenia|slovakia|luxembourg)$/

function terms(job: AacJob, taxonomy: string): string[] {
  const prefix = `${taxonomy}-`
  return (job.class_list ?? []).filter((c) => c.startsWith(prefix)).map((c) => c.slice(prefix.length))
}

/**
 * Whether a Netherlands resident could plausibly take the role. Deliberately
 * generous, like the other EA boards: the classifier's NL-eligibility verdict
 * does the real filtering. In: roles in the Netherlands, roles open worldwide
 * or Europe-wide, and remote roles based in a European country. Out: on-site
 * and hybrid roles elsewhere, and remote roles tied to a country outside
 * Europe (mostly US-only remote).
 */
export function aacMayBeNlEligible(job: AacJob): boolean {
  const places = terms(job, 'job_listing_location')
  if (places.some((p) => p === 'netherlands' || p === 'worldwide' || p === 'europe')) return true
  const remote = terms(job, 'job_remote').includes('remote')
  return remote && places.some((p) => EUROPE.test(p))
}

function outboundUrl(job: AacJob): string | null {
  for (const v of [job.meta?._application, job.meta?._company_website, job.link]) {
    if (typeof v === 'string' && /^https?:\/\//.test(v.trim())) return v.trim()
  }
  return null
}

export const animalAdvocacyCareers: SourceAdapter = {
  id: 'animal-advocacy-careers',
  async *fetch(config, ctx) {
    const apiUrl = (config.apiUrl as string) ?? DEFAULT_API_URL
    let total = 0
    let kept = 0
    for (let page = 1; page <= MAX_PAGES; page++) {
      const jobs = await fetchJson<AacJob[]>(
        `${apiUrl}?per_page=${PER_PAGE}&page=${page}&_fields=id,date_gmt,link,title,content,meta,class_list`,
      )
      total += jobs.length
      for (const job of jobs) {
        if (!aacMayBeNlEligible(job)) continue
        kept++
        yield { externalId: String(job.id), payload: job }
      }
      if (jobs.length < PER_PAGE) break
      if (page === MAX_PAGES) ctx.markIncomplete(`stopped after ${MAX_PAGES} pages`)
    }
    ctx.log(`animal-advocacy-careers: ${kept} of ${total} roles may be NL-eligible`)
  },
  normalise(raw): NormalisedListing | null {
    const job = raw.payload as AacJob
    const applyUrl = outboundUrl(job)
    const title = decodeEntities(job.title?.rendered ?? '').trim()
    if (!applyUrl || !title) return null
    const meta = job.meta ?? {}
    const location = typeof meta._job_location === 'string' ? meta._job_location.trim() : ''
    const remote = terms(job, 'job_remote')
    const salary = parseSalaryText(typeof meta._job_salary === 'string' ? meta._job_salary : null)
    const html = job.content?.rendered ?? null
    return {
      externalId: raw.externalId,
      employerId: null,
      employerName: decodeEntities(String(meta._company_name ?? '')).trim(),
      title,
      // Canonicalising strips tracking parameters, so a role AAC links to an
      // ATS we already poll dedups against that copy.
      applyUrl: canonicaliseUrl(applyUrl),
      description: html ? htmlToText(html) : null,
      descriptionHtml: html,
      locationRaw:
        [location, remote.includes('remote') ? 'Remote' : remote.includes('hybrid') ? 'Hybrid' : '']
          .filter(Boolean)
          .join(', ') || null,
      country: terms(job, 'job_listing_location').includes('netherlands') ? 'NL' : null,
      postedAt: job.date_gmt ? new Date(`${job.date_gmt}Z`) : null,
      // AAC publishes no closing date; closure detection and expiry cover it.
      deadlineAt: null,
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.min ? salary.currency : null,
      salaryPeriod: salary.min ? salary.period : null,
      mentions30PercentRuling: false,
    }
  },
}
