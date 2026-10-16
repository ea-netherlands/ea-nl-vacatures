/**
 * Reading a programme's own page — added October 2026.
 *
 * The EA boards describe a programme in three or four AI-written bullets, and
 * those are written to sell it, not to answer the questions the
 * short-programme rule asks (../../classify/programme.ts). For Generator
 * Residency, October 2026, the EA Opportunities summary says "three-month
 * residency" and nothing about pay; only the residency's own page states the
 * $8,500 monthly stipend (and that Kairos covers travel). Without the page the
 * rule cannot decide, and the listing has to go to the classifier — which, in
 * the dry run, missed facts that sat past its truncation point.
 *
 * So for programmes only — tens of pages, not hundreds — the adapters fetch the
 * apply link and append its text. Cached for a week: programme pages change
 * once a round, and every fetch is a request to a small organisation's site.
 */

import { fetchText } from '../../lib/http'
import { htmlToText, parseSalaryText } from '../../lib/text'
import type { AdapterContext } from '../types'

const PAGE_TTL_MS = 7 * 864e5
/** Enough for a long FAQ; the classifier truncates further, the stage-one rule reads all of it. */
const MAX_PAGE_CHARS = 20_000

/** Hosts whose pages say nothing about a programme: application forms and spreadsheets. */
const NO_INFORMATION_HOSTS =
  /(^|\.)(forms\.gle|docs\.google\.com|airtable\.com|tally\.so|typeform\.com|forms\.office\.com|jotform\.com)$/i

export async function programmePageText(url: string, ctx: AdapterContext): Promise<string | null> {
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return null
  }
  if (NO_INFORMATION_HOSTS.test(host)) return null

  const cacheKey = `programme-page:${url}`
  const cached = await ctx.cache.get<{ text: string; fetchedAt: number }>(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < PAGE_TTL_MS) return cached.text
  if (Date.now() >= ctx.deadline) return cached?.text ?? null

  try {
    const text = htmlToText(await fetchText(url, { retries: 1, timeoutMs: 15_000 })).slice(
      0,
      MAX_PAGE_CHARS,
    )
    await ctx.cache.set(cacheKey, { text, fetchedAt: Date.now() })
    return text
  } catch (err) {
    // A missing page leaves the board's own summary to go on, which is what
    // there was before. It is not a reason to fail the source.
    ctx.log(`programme page ${url} could not be read: ${(err as Error).message}`)
    return cached?.text ?? null
  }
}

/** The board's summary, then the programme's own words under a marker the classifier can see. */
export function withProgrammePage(summary: string | null, page: string | null): string | null {
  if (!page) return summary
  return [summary, `From the programme's own page:\n\n${page}`].filter(Boolean).join('\n\n')
}

const MONTHLY_STIPEND = /[$€£]\s?\d[\d,.]*\s*k?\b[^.\n]{0,30}\b(per month|a month|\/\s?month|monthly)\b/i

/**
 * A monthly stipend figure, when the board carried no salary at all.
 *
 * Narrow on purpose: only "<currency><number> … per month". A programme page
 * mentions project budgets, prize money and alumni salaries too, and a wrong
 * figure on the listing is worse than none.
 */
export function monthlyStipend(text: string | null): ReturnType<typeof parseSalaryText> | null {
  const snippet = text?.match(MONTHLY_STIPEND)?.[0]
  if (!snippet) return null
  const parsed = parseSalaryText(snippet)
  return parsed.min ? { ...parsed, period: 'month' } : null
}
