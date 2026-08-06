/**
 * Polite HTTP client for the crawlers — spec §7.2, §10.
 *
 *   • One descriptive user agent with contact details on every request.
 *   • Serialised per host with a configurable gap, so we never run concurrent
 *     requests against the same origin. AcademicTransfer's robots.txt asks for
 *     Crawl-delay: 10 and werkenvoornederland allows 10 req/s — both are
 *     expressed as per-host delays here rather than hardcoded in adapters.
 *   • Exponential backoff on 429/403/5xx.
 */

export const USER_AGENT =
  process.env.CRAWLER_USER_AGENT ??
  'EANetherlandsJobBoard/1.0 (+https://effectiefaltruisme.nl/vacatures; jobs@effectiefaltruisme.nl)'

/** Default gap between requests to the same host. */
const DEFAULT_HOST_DELAY_MS = 200

/** Per-host overrides, from robots.txt of each source. */
const HOST_DELAY_MS: Record<string, number> = {
  'www.academictransfer.com': 10_000, // Crawl-delay: 10 (VERIFIED)
  'academictransfer.com': 10_000,
  'www.werkenvoornederland.nl': 100, // robots.txt permits 10 req/s
  'api.cso20.net': 250,
  'jobs.80000hours.org': 500,
  'jobs.probablygood.org': 1_000, // their paid Algolia quota; poll gently
  'www.partos.nl': 1_000,
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    readonly body: string,
  ) {
    super(`HTTP ${status} for ${url}`)
    this.name = 'HttpError'
  }
}

const lastRequestAt = new Map<string, number>()
const hostQueue = new Map<string, Promise<unknown>>()

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function delayFor(host: string): number {
  return HOST_DELAY_MS[host] ?? DEFAULT_HOST_DELAY_MS
}

/**
 * Serialises work per host and enforces the inter-request gap. Every fetch
 * goes through here, so a burst of adapter calls against one ATS still
 * arrives one request at a time.
 */
async function withHostLock<T>(host: string, fn: () => Promise<T>): Promise<T> {
  const prior = hostQueue.get(host) ?? Promise.resolve()
  const run = prior.then(async () => {
    const gap = delayFor(host)
    const since = Date.now() - (lastRequestAt.get(host) ?? 0)
    if (since < gap) await sleep(gap - since)
    try {
      return await fn()
    } finally {
      lastRequestAt.set(host, Date.now())
    }
  })
  // Keep the chain alive even when a link rejects, so one failure does not
  // wedge the queue for that host.
  hostQueue.set(
    host,
    run.catch(() => undefined),
  )
  return run
}

export type FetchOptions = RequestInit & {
  /** Total attempts including the first. */
  retries?: number
  timeoutMs?: number
  /** Statuses to treat as a legitimate "not available here", not an error. */
  acceptStatuses?: number[]
}

export async function httpFetch(url: string, opts: FetchOptions = {}): Promise<Response> {
  const { retries = 3, timeoutMs = 30_000, acceptStatuses = [], ...init } = opts
  const host = new URL(url).host

  return withHostLock(host, async () => {
    let lastErr: unknown
    for (let attempt = 1; attempt <= retries; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const res = await fetch(url, {
          ...init,
          signal: controller.signal,
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/json, text/xml, text/html;q=0.9, */*;q=0.8',
            ...(init.headers ?? {}),
          },
        })
        if (res.ok || acceptStatuses.includes(res.status)) return res

        const retryable = res.status === 429 || res.status === 403 || res.status >= 500
        const body = await res.text().catch(() => '')
        if (!retryable || attempt === retries) throw new HttpError(res.status, url, body.slice(0, 500))

        const retryAfter = Number(res.headers.get('retry-after'))
        const backoff = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : delayFor(host) * 2 ** attempt
        await sleep(backoff)
      } catch (err) {
        lastErr = err
        if (err instanceof HttpError) throw err
        if (attempt === retries) break
        await sleep(delayFor(host) * 2 ** attempt)
      } finally {
        clearTimeout(timer)
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(`fetch failed for ${url}`)
  })
}

export async function fetchJson<T = unknown>(url: string, opts: FetchOptions = {}): Promise<T> {
  const res = await httpFetch(url, opts)
  return (await res.json()) as T
}

export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const res = await httpFetch(url, opts)
  return res.text()
}

/**
 * Fetch that returns null on 403/404 rather than throwing. Some public ATS
 * feeds are tier-dependent — SmartRecruiters in particular — and absence must
 * be read as "not available for this employer", not as a failure (§7.2).
 */
export async function fetchJsonOptional<T = unknown>(
  url: string,
  opts: FetchOptions = {},
): Promise<T | null> {
  const res = await httpFetch(url, { ...opts, acceptStatuses: [403, 404, 401] })
  if (res.status === 403 || res.status === 404 || res.status === 401) return null
  return (await res.json()) as T
}
