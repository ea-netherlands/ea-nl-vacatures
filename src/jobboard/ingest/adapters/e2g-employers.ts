/**
 * Earning-to-give employers without a standard ATS feed — October 2026.
 *
 * IMC, Flow Traders, Da Vinci and Adyen publish public Greenhouse boards and go
 * through the ordinary `greenhouse` adapter. These two do not:
 *
 * - **Optiver** runs its own site. Its Greenhouse board exists and is empty.
 *   The jobs page is fed by `/en/api/v1/jobs`, which takes the page's own
 *   filter ids (`location`, `department`, `level`) but ignores every paging
 *   parameter tried (page, pageNumber, offset, skip, take, pageSize): it always
 *   returns the first 16 and a `totalCount`. So this asks for one office and
 *   one department at a time, splits by level when a department overflows,
 *   and marks the fetch incomplete if a slice still does. The list carries
 *   no ad text and the detail page's JSON-LD has no description either; the
 *   body is the server-rendered `<main>`, cut before the "Open positions" list.
 * - **Booking.com** is on iCIMS with a Jibe front end, whose `/api/jobs`
 *   endpoint is public JSON and does page (`page`, `limit`).
 */

import { fetchJson, fetchText } from '../../lib/http'
import { decodeEntities, htmlToText, mentions30PercentRuling } from '../../lib/text'
import type { NormalisedListing, SourceAdapter } from '../types'

const OPTIVER_ORIGIN = 'https://www.optiver.com'
const OPTIVER_PAGE_SIZE = 16
const OPTIVER_LEVELS = ['early-careers', 'experienced', 'graduate', 'internship']
/** The departments whose titles the earning-to-give role test accepts. */
const OPTIVER_DEFAULT_DEPARTMENTS = [
  'trading',
  'quantitative-research-and-machine-learning',
  'technology',
]
/** Detail pages are re-read at most this often. */
const DETAIL_TTL_MS = 3 * 24 * 60 * 60 * 1000

type OptiverItem = { title: string; location: string; experience: string; domain: string; href: string }

type OptiverPayload = OptiverItem & { html: string | null }

/** The ad body from an Optiver job page: `<main>`, minus scripts and the related-jobs list. */
export function optiverBody(page: string): string | null {
  const start = page.indexOf('<main')
  const end = page.indexOf('</main>')
  if (start < 0 || end < 0) return null
  let main = page.slice(start, end).replace(/<script[\s\S]*?<\/script>/g, '')
  const related = main.search(/>\s*Open positions\s*</)
  if (related > 0) main = main.slice(0, related)
  // The first paragraph is the start of the ad; everything above it is
  // breadcrumbs, the title and the apply buttons.
  const firstParagraph = main.indexOf('<p')
  return firstParagraph > 0 ? main.slice(firstParagraph) : main
}

export const optiverJobs: SourceAdapter = {
  id: 'optiver-jobs',
  async *fetch(config, ctx) {
    const office = (config.office as string | undefined) ?? 'amsterdam'
    const departments = (config.departments as string[] | undefined) ?? OPTIVER_DEFAULT_DEPARTMENTS

    const query = async (params: Record<string, string>) => {
      const qs = new URLSearchParams({ location: office, ...params }).toString()
      return fetchJson<{ items?: OptiverItem[]; totalCount?: number }>(
        `${OPTIVER_ORIGIN}/en/api/v1/jobs?${qs}`,
      )
    }

    const items = new Map<string, OptiverItem>()
    for (const department of departments) {
      const all = await query({ department })
      if ((all.totalCount ?? 0) <= OPTIVER_PAGE_SIZE) {
        for (const item of all.items ?? []) items.set(item.href, item)
        continue
      }
      for (const level of OPTIVER_LEVELS) {
        const slice = await query({ department, level })
        if ((slice.totalCount ?? 0) > (slice.items?.length ?? 0)) {
          ctx.markIncomplete(`optiver: ${department}/${level} has more roles than one page returns`)
        }
        for (const item of slice.items ?? []) items.set(item.href, item)
      }
    }
    ctx.log(`optiver: ${items.size} roles in ${office}`)

    for (const item of items.values()) {
      if (Date.now() >= ctx.deadline) {
        ctx.markIncomplete('optiver: deadline reached before every job page was read')
        return
      }
      const cacheKey = `optiver:page:${item.href}`
      const cached = await ctx.cache.get<{ html: string | null; fetchedAt: number }>(cacheKey)
      let html = cached && Date.now() - cached.fetchedAt < DETAIL_TTL_MS ? cached.html : null
      if (!html) {
        try {
          html = optiverBody(await fetchText(`${OPTIVER_ORIGIN}${item.href}`))
          await ctx.cache.set(cacheKey, { html, fetchedAt: Date.now() })
        } catch (err) {
          ctx.log(`optiver: could not read ${item.href}: ${(err as Error).message}`)
          html = cached?.html ?? null
        }
      }
      yield { externalId: item.href, payload: { ...item, html } satisfies OptiverPayload }
    }
  },
  normalise(raw, config): NormalisedListing | null {
    const p = raw.payload as OptiverPayload
    const title = decodeEntities(p.title ?? '').trim()
    if (!title) return null
    const description = htmlToText(p.html)
    return {
      externalId: raw.externalId,
      employerId: (config.employerId as string | undefined) ?? 'optiver',
      employerName: (config.employerName as string | undefined) ?? 'Optiver',
      title,
      applyUrl: `${OPTIVER_ORIGIN}${p.href}`,
      description,
      descriptionHtml: p.html,
      locationRaw: p.location ?? null,
      country: p.location === 'Amsterdam' ? 'NL' : null,
      postedAt: null,
      deadlineAt: null,
      // Neither firm publishes pay; the gate presumes it for these employers.
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      mentions30PercentRuling: mentions30PercentRuling(`${title}\n${description ?? ''}`),
    }
  },
}

// ---------------------------------------------------------------------------
// Booking.com — iCIMS behind a Jibe front end
// ---------------------------------------------------------------------------

const BOOKING_ORIGIN = 'https://jobs.booking.com'
const BOOKING_PAGE_SIZE = 100

type BookingJob = {
  slug: string
  req_id: string
  title: string
  description?: string
  full_location?: string
  city?: string
  country?: string
  country_code?: string
  posted_date?: string
}

export const bookingJobs: SourceAdapter = {
  id: 'booking-jobs',
  async *fetch(config, ctx) {
    const location = (config.location as string | undefined) ?? 'Amsterdam'
    let seen = 0
    for (let page = 1; ; page++) {
      const qs = new URLSearchParams({ location, limit: String(BOOKING_PAGE_SIZE), page: String(page) })
      const data = await fetchJson<{ jobs?: { data: BookingJob }[]; totalCount?: number }>(
        `${BOOKING_ORIGIN}/api/jobs?${qs}`,
      )
      const jobs = data.jobs ?? []
      for (const { data: job } of jobs) yield { externalId: String(job.req_id ?? job.slug), payload: job }
      seen += jobs.length
      if (!jobs.length || seen >= (data.totalCount ?? 0)) break
      if (Date.now() >= ctx.deadline) {
        ctx.markIncomplete('booking: deadline reached before every page was read')
        return
      }
    }
  },
  normalise(raw, config): NormalisedListing | null {
    const j = raw.payload as BookingJob
    const title = decodeEntities(j.title ?? '').trim()
    if (!title) return null
    const html = j.description ?? null
    const description = htmlToText(html)
    const posted = j.posted_date ? new Date(j.posted_date) : null
    return {
      externalId: raw.externalId,
      employerId: (config.employerId as string | undefined) ?? 'booking',
      employerName: (config.employerName as string | undefined) ?? 'Booking.com',
      title,
      // The listed apply_url is an iCIMS sign-in page; the public ad links to it.
      applyUrl: `${BOOKING_ORIGIN}/booking/jobs/${j.slug}`,
      description,
      descriptionHtml: html,
      locationRaw: j.full_location ?? j.city ?? null,
      country: j.country_code ?? null,
      postedAt: posted && !Number.isNaN(posted.getTime()) ? posted : null,
      deadlineAt: null,
      // Neither firm publishes pay; the gate presumes it for these employers.
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      mentions30PercentRuling: mentions30PercentRuling(`${title}\n${description ?? ''}`),
    }
  },
}
