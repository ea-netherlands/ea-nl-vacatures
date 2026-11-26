/**
 * Is this request to `/api/jobs/[id]/apply` a person clicking the button?
 *
 * From 17 November 2026 the click log went from a handful a day to 300–1,100,
 * around the clock, across almost every listing, and mostly without a referrer:
 * crawlers that ignore robots.txt walking the apply links. Each logged hit woke
 * the Neon database, which then stayed up for its five-minute idle window, so
 * the bots kept it awake most of the day and used up the free plan's compute
 * allowance. They also made the click count, the board's one engagement
 * metric, mostly noise.
 *
 * The test is the one browsers make hard to fake by accident: on a navigation
 * the user started (a click, middle-click or "open in new tab"), Chrome,
 * Firefox, Edge and Safari 16.4+ send `Sec-Fetch-User: ?1`. Scripts, crawlers
 * and prefetchers do not. A self-declared bot user agent is refused as well,
 * for the headless browsers that do send it.
 *
 * Refused hits are still redirected. They just are not counted.
 */

const BOT_UA = /bot|crawl|spider|slurp|preview|fetch|headless|python|curl|wget|httpclient|go-http|axios|node-fetch|scrapy|lighthouse|monitor/i

export function isHumanClick(headers: Headers): boolean {
  if (headers.get('sec-fetch-user') !== '?1') return false
  const ua = headers.get('user-agent') ?? ''
  if (!ua || BOT_UA.test(ua)) return false
  return true
}
