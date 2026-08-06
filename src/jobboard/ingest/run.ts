/**
 * The ingestion runner — spec §7, §7.8.
 *
 * Drives adapters, writes raw_listing and listing, then applies closure
 * detection. Adapters stay pure; every side effect happens here.
 *
 * Runs the same way from the CLI (`npm run ingest`) and from the Vercel Cron
 * route handler, with a wall-clock deadline so long crawls stop cleanly inside
 * a serverless timeout and resume from their cursor next run.
 */

import type { Db } from '../db/client'
import { getDb } from '../db/client'
import { sha256 } from '../lib/text'
import { computeDedupKey } from './dedup'
import { getAdapter } from './registry'
import type {
  AdapterCache,
  AdapterContext,
  EmployerDiscovery,
  NormalisedListing,
  SourceRecord,
} from './types'

export type IngestOptions = {
  /** Restrict to these source ids. Empty means all enabled sources. */
  sourceIds?: string[]
  /** Wall-clock budget in ms. Vercel's default cron timeout is 300s. */
  budgetMs?: number
  /** Skip closure detection — useful when running one source in isolation. */
  skipClosure?: boolean
  /** Also harvest employer/ATS discovery from sources that support it. */
  discover?: boolean
  onLog?: (line: string) => void
}

export type SourceResult = {
  sourceId: string
  ok: boolean
  fetched: number
  inserted: number
  updated: number
  closed: number
  skipped: number
  error?: string
  logs: string[]
}

export type IngestReport = {
  startedAt: string
  finishedAt: string
  results: SourceResult[]
  discovered: EmployerDiscovery[]
  totals: { fetched: number; inserted: number; updated: number; closed: number }
}

/** Adapter cache backed by a table-free jsonb row per source. */
function makeCache(db: Db, sourceId: string): AdapterCache {
  return {
    async get<T>(key: string) {
      const { rows } = await db.query<{ config: Record<string, unknown> }>(
        'select config from source where id = $1',
        [sourceId],
      )
      const store = (rows[0]?.config?.__cache ?? {}) as Record<string, unknown>
      return (store[key] as T) ?? null
    },
    async set(key: string, value: unknown) {
      await db.query(
        `update source
            set config = jsonb_set(
              coalesce(config, '{}'::jsonb),
              array['__cache', $2],
              $3::jsonb,
              true
            )
          where id = $1`,
        [sourceId, key, JSON.stringify(value ?? null)],
      )
    },
  }
}

export async function runIngest(options: IngestOptions = {}): Promise<IngestReport> {
  const db = await getDb()
  const startedAt = new Date().toISOString()
  const budgetMs = options.budgetMs ?? 240_000
  const deadline = Date.now() + budgetMs

  const { rows: sources } = await db.query<SourceRecord>(
    options.sourceIds?.length
      ? 'select * from source where enabled and id = any($1) order by id'
      : 'select * from source where enabled order by id',
    options.sourceIds?.length ? [options.sourceIds] : [],
  )

  const results: SourceResult[] = []
  const discovered: EmployerDiscovery[] = []

  for (const source of sources) {
    if (Date.now() >= deadline) {
      results.push({
        sourceId: source.id,
        ok: true,
        fetched: 0,
        inserted: 0,
        updated: 0,
        closed: 0,
        skipped: 1,
        logs: ['skipped: run budget exhausted, will pick up next run'],
      })
      continue
    }
    const result = await runSource(db, source, { ...options, deadline })
    results.push(result)

    if (options.discover) {
      const adapter = getAdapter(source.adapter)
      if (adapter.discoverEmployers) {
        try {
          const found = await adapter.discoverEmployers(source.config, {
            source,
            deadline,
            log: (m) => result.logs.push(m),
            cache: makeCache(db, source.id),
          })
          discovered.push(...found)
        } catch (err) {
          result.logs.push(`discovery failed: ${(err as Error).message}`)
        }
      }
    }
  }

  if (options.discover && discovered.length) {
    await recordDiscoveries(db, discovered)
  }

  const totals = results.reduce(
    (acc, r) => ({
      fetched: acc.fetched + r.fetched,
      inserted: acc.inserted + r.inserted,
      updated: acc.updated + r.updated,
      closed: acc.closed + r.closed,
    }),
    { fetched: 0, inserted: 0, updated: 0, closed: 0 },
  )

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    results,
    discovered,
    totals,
  }
}

async function runSource(
  db: Db,
  source: SourceRecord,
  options: IngestOptions & { deadline: number },
): Promise<SourceResult> {
  const logs: string[] = []
  const log = (message: string) => {
    logs.push(message)
    options.onLog?.(`[${source.id}] ${message}`)
  }

  const result: SourceResult = {
    sourceId: source.id,
    ok: false,
    fetched: 0,
    inserted: 0,
    updated: 0,
    closed: 0,
    skipped: 0,
    logs,
  }

  const ctx: AdapterContext = {
    source,
    log,
    deadline: options.deadline,
    cache: makeCache(db, source.id),
  }

  const seenExternalIds: string[] = []

  try {
    const adapter = getAdapter(source.adapter)

    for await (const raw of adapter.fetch(source.config, ctx)) {
      result.fetched++
      seenExternalIds.push(raw.externalId)

      const contentHash = sha256(JSON.stringify(raw.payload))
      // raw_listing is append-only and unique on (source, external_id, hash),
      // so an unchanged re-serve is a no-op and a genuine edit is a new row.
      await db.query(
        `insert into raw_listing (source_id, external_id, payload, content_hash)
         values ($1, $2, $3::jsonb, $4)
         on conflict (source_id, external_id, content_hash) do nothing`,
        [source.id, raw.externalId, JSON.stringify(raw.payload), contentHash],
      )

      let normalised: NormalisedListing | null
      try {
        normalised = adapter.normalise(raw, source.config)
      } catch (err) {
        log(`normalise failed for ${raw.externalId}: ${(err as Error).message}`)
        result.skipped++
        continue
      }

      // A null normalise means "seen, but nothing new to write" — used by the
      // wvn crawler for unchanged pages. The external id still counts as seen,
      // so closure detection does not mark it closed.
      if (!normalised) {
        result.skipped++
        continue
      }
      if (!normalised.title || !normalised.applyUrl) {
        log(`skipping ${raw.externalId}: missing title or apply url`)
        result.skipped++
        continue
      }

      const wrote = await upsertListing(db, source, normalised)
      if (wrote === 'inserted') result.inserted++
      else result.updated++
    }

    // Closure detection (§7.8) — only for sources that return a complete set.
    // All the ATS APIs do; a partial crawl does not, and marking listings
    // closed from a truncated crawl would silently empty the board.
    if (!options.skipClosure && source.returns_complete_set && result.fetched > 0) {
      const { rows } = await db.query<{ count: string }>(
        `update listing
            set closed_at = now()
          where source_id = $1
            and closed_at is null
            and not (external_id = any($2))
          returning 1 as count`,
        [source.id, seenExternalIds],
      )
      result.closed = rows.length
      if (result.closed) log(`marked ${result.closed} listings closed (absent from this fetch)`)
    } else if (!source.returns_complete_set) {
      log('closure detection skipped: source does not return a complete set')
    }

    result.ok = true
    await db.query(
      `update source
          set last_run_at = now(), last_ok_at = now(),
              consecutive_failures = 0, last_error = null
        where id = $1`,
      [source.id],
    )
  } catch (err) {
    const message = (err as Error).message
    result.error = message
    log(`FAILED: ${message}`)
    await db.query(
      `update source
          set last_run_at = now(),
              consecutive_failures = consecutive_failures + 1,
              last_error = $2
        where id = $1`,
      [source.id, message.slice(0, 1000)],
    )
  }

  return result
}

async function upsertListing(
  db: Db,
  source: SourceRecord,
  n: NormalisedListing,
): Promise<'inserted' | 'updated'> {
  const employerId = n.employerId ?? source.employer_id ?? null
  const dedupKey = computeDedupKey({
    applyUrl: n.applyUrl,
    title: n.title,
    employerId,
    employerName: n.employerName,
  })

  const { rows } = await db.query<{ inserted: boolean }>(
    `insert into listing (
       source_id, external_id, employer_id, employer_name, title, apply_url,
       description, description_html, location_raw, country, posted_at,
       deadline_at, salary_min, salary_max, salary_currency, salary_period,
       mentions_30_percent_ruling, dedup_key
     ) values (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
     )
     on conflict (source_id, external_id) do update set
       employer_id      = coalesce(excluded.employer_id, listing.employer_id),
       employer_name    = excluded.employer_name,
       title            = excluded.title,
       apply_url        = excluded.apply_url,
       -- Never overwrite a real description with a null one: 80k and Probably
       -- Good carry no body text, and they must not blank out what the ATS
       -- adapter already supplied for the same role.
       description      = coalesce(excluded.description, listing.description),
       description_html = coalesce(excluded.description_html, listing.description_html),
       location_raw     = coalesce(excluded.location_raw, listing.location_raw),
       country          = coalesce(excluded.country, listing.country),
       posted_at        = coalesce(excluded.posted_at, listing.posted_at),
       deadline_at      = coalesce(excluded.deadline_at, listing.deadline_at),
       salary_min       = coalesce(excluded.salary_min, listing.salary_min),
       salary_max       = coalesce(excluded.salary_max, listing.salary_max),
       salary_currency  = coalesce(excluded.salary_currency, listing.salary_currency),
       salary_period    = coalesce(excluded.salary_period, listing.salary_period),
       mentions_30_percent_ruling =
         listing.mentions_30_percent_ruling or excluded.mentions_30_percent_ruling,
       dedup_key        = excluded.dedup_key,
       last_seen_at     = now(),
       -- A role that reappears in the feed is open again.
       closed_at        = null
     returning (xmax = 0) as inserted`,
    [
      source.id,
      n.externalId,
      employerId,
      n.employerName,
      n.title,
      n.applyUrl,
      n.description,
      n.descriptionHtml,
      n.locationRaw,
      n.country,
      n.postedAt,
      n.deadlineAt,
      n.salaryMin,
      n.salaryMax,
      n.salaryCurrency,
      n.salaryPeriod,
      n.mentions30PercentRuling,
      dedupKey,
    ],
  )
  // PGlite does not expose xmax, so fall back to treating an absent flag as an
  // update; the distinction is only used for run reporting.
  return rows[0]?.inserted ? 'inserted' : 'updated'
}

/**
 * Records organisations harvested from the EA boards. These land inactive with
 * watchlist_tier 3 so they never silently start being polled — a curator
 * promotes them deliberately, which is the point of a curated watchlist.
 */
async function recordDiscoveries(db: Db, discovered: EmployerDiscovery[]): Promise<void> {
  const { slugify } = await import('../lib/text')
  for (const d of discovered) {
    if (!d.name) continue
    await db.query(
      `insert into employer (id, name, website, careers_url, ats, ats_token,
                             watchlist_tier, active, notes)
       values ($1,$2,$3,$4,$5,$6,3,false,$7)
       on conflict (id) do update set
         -- Only fill gaps; never overwrite curator-entered detail.
         website     = coalesce(employer.website, excluded.website),
         careers_url = coalesce(employer.careers_url, excluded.careers_url),
         ats         = coalesce(employer.ats, excluded.ats),
         ats_token   = coalesce(employer.ats_token, excluded.ats_token)`,
      [
        slugify(d.name),
        d.name,
        d.website,
        d.careersUrl,
        d.ats,
        d.atsToken,
        `discovered via ${d.foundVia}; inactive until a curator reviews it`,
      ],
    )
  }
}

/**
 * Weekly link check for crawl-based sources, which cannot use set-difference
 * closure detection (§7.8). A job board full of dead links is worse than no
 * job board, and this is the most common way small boards rot.
 */
export async function checkDeadLinks(limit = 100): Promise<{ checked: number; closed: number }> {
  const db = await getDb()
  const { httpFetch } = await import('../lib/http')
  const { rows } = await db.query<{ id: number; apply_url: string }>(
    `select l.id, l.apply_url
       from listing l
       join source s on s.id = l.source_id
      where l.closed_at is null
        and not s.returns_complete_set
      order by l.last_seen_at asc
      limit $1`,
    [limit],
  )

  let closed = 0
  for (const row of rows) {
    try {
      const res = await httpFetch(row.apply_url, {
        method: 'HEAD',
        retries: 1,
        acceptStatuses: [404, 410, 403, 405],
      })
      // 405 means HEAD is unsupported, not that the role is gone.
      if (res.status === 404 || res.status === 410) {
        await db.query('update listing set closed_at = now() where id = $1', [row.id])
        closed++
      } else {
        await db.query('update listing set last_seen_at = now() where id = $1', [row.id])
      }
    } catch {
      // Network noise is not evidence a role has closed; leave it alone.
    }
  }
  return { checked: rows.length, closed }
}
