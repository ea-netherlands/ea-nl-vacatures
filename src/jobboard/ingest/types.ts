/**
 * Adapter interface — spec §7.1.
 *
 * Adapters are pure: fetch and normalise. No classification, no side effects
 * beyond what the runner writes to raw_listing and listing. That keeps every
 * source independently testable and means a broken adapter can never corrupt
 * the pipeline's own bookkeeping.
 */

export type RawListing = {
  /** Stable id from the source. Must survive re-serving of the same role. */
  externalId: string
  payload: unknown
}

export type NormalisedListing = {
  externalId: string
  employerId: string | null
  employerName: string
  title: string
  applyUrl: string
  description: string | null
  descriptionHtml: string | null
  locationRaw: string | null
  /** ISO 3166-1 alpha-2 where determinable, else null. */
  country: string | null
  postedAt: Date | null
  deadlineAt: Date | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  salaryPeriod: string | null
  mentions30PercentRuling: boolean
}

export type SourceRecord = {
  id: string
  kind: 'ats' | 'gov-api' | 'crawl' | 'ea-board' | 'manual'
  adapter: string
  config: Record<string, unknown>
  employer_id: string | null
  /**
   * The watchlist employer's canonical name, when the source is pinned to one
   * (single-tenant ATS boards). Some adapters' `normalise()` never learns the
   * employer's name from the payload itself — a single-company Lever/Ashby
   * board has no reason to repeat it on every job — so this is the fallback
   * that keeps a listing from surfacing with a blank employer.
   */
  employer_name: string | null
  enabled: boolean
  returns_complete_set: boolean
  /** Drives the ingest queue order — least-recently-run goes first. */
  last_run_at: string | null
}

/**
 * Some adapters (80k, Probably Good) are primarily discovery sources: they
 * yield organisation names and ATS tokens for the watchlist rather than
 * listings worth publishing directly (§7.6).
 */
export type EmployerDiscovery = {
  name: string
  website: string | null
  careersUrl: string | null
  ats: string | null
  atsToken: string | null
  foundVia: string
}

export interface SourceAdapter {
  /** Adapter module name, matched against `source.adapter`. */
  readonly id: string
  fetch(config: Record<string, unknown>, ctx: AdapterContext): AsyncIterable<RawListing>
  normalise(raw: RawListing, config: Record<string, unknown>): NormalisedListing | null
  /** Optional: organisations discovered while fetching, for the watchlist. */
  discoverEmployers?(
    config: Record<string, unknown>,
    ctx: AdapterContext,
  ): Promise<EmployerDiscovery[]>
}

export type AdapterContext = {
  source: SourceRecord
  log: (message: string, extra?: Record<string, unknown>) => void
  /**
   * Wall-clock budget for this run. Long crawls check it and stop cleanly so
   * they fit inside a serverless timeout, resuming next run from their cursor
   * (§7.4 — the AcademicTransfer crawl in particular).
   */
  deadline: number
  /** Small persistent key/value store for crawl cursors and page caches. */
  cache: AdapterCache
}

export interface AdapterCache {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown): Promise<void>
}

export function outOfTime(ctx: AdapterContext): boolean {
  return Date.now() >= ctx.deadline
}
