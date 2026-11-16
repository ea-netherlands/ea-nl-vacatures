/**
 * Which visits Vercel Web Analytics should not count.
 *
 * Two kinds. Our own: open any page once with ?internal=1 and this browser is
 * remembered as staff (?internal=0 undoes it). The flag is the website's
 * `ean-internal` localStorage key; the board is served from the same origin,
 * so one visit covers both. And automated ones: in the board's first eleven
 * days of analytics (5 to 15 November 2026), about three quarters of the
 * "visitors" to /vacatures/[slug] were desktop Linux browsers in the United
 * States with no referrer, which is crawlers, not job seekers.
 *
 * The automation check only catches browsers that give themselves away: the
 * webdriver flag every automation framework sets, a user agent that names a
 * bot or headless browser. A crawler that imitates an ordinary browser still
 * gets through. Window size was tried and dropped: embedded browsers (in-app
 * webviews) report a 0×0 outer window, and those are real people.
 *
 * Mirrors src/lib/analytics/internal.ts in the website repo: keep them in step.
 */

export const INTERNAL_FLAG = 'ean-internal'

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function storage(): Store | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null // Reading localStorage can itself throw when it is blocked
  }
}

export function isInternalVisit(url: string | undefined, store: Store | null = storage()): boolean {
  let param: string | null = null
  try {
    if (url) param = new URL(url, 'https://example.org').searchParams.get('internal')
  } catch {
    param = null
  }
  try {
    if (param === '1') store?.setItem(INTERNAL_FLAG, '1')
    if (param === '0') store?.removeItem(INTERNAL_FLAG)
    if (param === '1') return true
    if (param === '0') return false
    return store?.getItem(INTERNAL_FLAG) === '1'
  } catch {
    return param === '1'
  }
}

// "bot" only where a product token ends (Googlebot/2.1, AhrefsBot/7.0;), so a
// phone brand such as Cubot is still a person
const BOT_UA =
  /bot[/;)]|crawl|spider|slurp|headless|phantomjs|puppeteer|playwright|selenium|lighthouse|pagespeed|scrapy/i

export interface BrowserSignals {
  userAgent?: string
  webdriver?: boolean
}

function browserSignals(): BrowserSignals | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null
  return {
    userAgent: navigator.userAgent,
    webdriver: navigator.webdriver,
  }
}

export function isAutomatedVisit(signals: BrowserSignals | null = browserSignals()): boolean {
  if (!signals) return false
  if (signals.webdriver === true) return true
  if (signals.userAgent && BOT_UA.test(signals.userAgent)) return true
  return false
}

/** True when this page view or event should stay out of the analytics. */
export function skipAnalytics(url?: string): boolean {
  const href = url ?? (typeof window === 'undefined' ? undefined : window.location.href)
  return isInternalVisit(href) || isAutomatedVisit()
}
