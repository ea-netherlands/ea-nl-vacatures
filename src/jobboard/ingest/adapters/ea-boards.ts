/**
 * The EA boards — spec §7.6.
 *
 * Low volume, high signal. Worth ingesting despite yielding few NL roles —
 * but treated primarily as DISCOVERY sources for the watchlist rather than as
 * listings sources.
 *
 * The spec's most important finding is that filtering the existing EA boards
 * would produce an empty board: 80k lists 53 featured organisations and none
 * are Netherlands-based. So what these adapters are really for is harvesting
 * organisation names and ATS tokens, which then feed the §7.2 adapters and get
 * ingested properly.
 *
 * Both boards' access methods were UNVERIFIED in the spec ("needs devtools").
 * They are resolved here using the techniques already proven in EA NL's
 * existing static aggregator, and both read their credentials live on every
 * run so provider-side key rotation never breaks the fetcher.
 */

import { fetchJson, fetchText } from '../../lib/http'
import { canonicaliseUrl } from '../../lib/text'
import type {
  AdapterContext,
  EmployerDiscovery,
  NormalisedListing,
  SourceAdapter,
} from '../types'

/**
 * Facet values that could plausibly cover a Netherlands-resident candidate.
 * Deliberately generous — stage one of the classifier does the real filtering,
 * and a false positive here costs a few tokens while a false negative loses a
 * genuine NL-eligible role.
 */
const NL_ELIGIBLE_FACET = /netherlands|nederland|amsterdam|rotterdam|utrecht|the hague|den haag|eindhoven|delft|wageningen|leiden|groningen|maastricht|remote, global|remote, europe|remote \(europe\)|europe \(excluding uk\)|anywhere/i

function eligibleFacetValues(facets: Record<string, number> | undefined): string[] {
  if (!facets) return []
  return Object.keys(facets).filter((v) => NL_ELIGIBLE_FACET.test(v))
}

/** Recognises the ATS behind an outbound apply URL, for watchlist discovery. */
export function detectAts(applyUrl: string): { ats: string; token: string } | null {
  let url: URL
  try {
    url = new URL(applyUrl)
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase()
  const seg = url.pathname.split('/').filter(Boolean)

  if (/(^|\.)(boards|job-boards)\.greenhouse\.io$/.test(host) && seg[0])
    return { ats: 'greenhouse', token: seg[0] }
  if (/(^|\.)jobs\.ashbyhq\.com$/.test(host) && seg[0]) return { ats: 'ashby', token: seg[0] }
  if (/(^|\.)jobs\.lever\.co$/.test(host) && seg[0]) return { ats: 'lever', token: seg[0] }
  if (/(^|\.)apply\.workable\.com$/.test(host) && seg[0]) return { ats: 'workable', token: seg[0] }
  if (host.endsWith('.recruitee.com')) return { ats: 'recruitee', token: host.split('.')[0] }
  if (host.endsWith('.breezy.hr')) return { ats: 'breezy', token: host.split('.')[0] }
  if (/\.jobs\.personio\.(de|com)$/.test(host)) return { ats: 'personio', token: host.split('.')[0] }
  if (/(^|\.)jobs\.smartrecruiters\.com$/.test(host) && seg[0])
    return { ats: 'smartrecruiters', token: seg[0] }
  if (host.endsWith('.teamtailor.com')) return { ats: 'teamtailor', token: host }
  if (/myworkdayjobs\.com$/.test(host)) return { ats: 'workday', token: host.split('.')[0] }
  if (host.endsWith('.bamboohr.com')) return { ats: 'bamboohr', token: host.split('.')[0] }
  if (/(^|\.)homerun\.co$/.test(host)) return { ats: 'homerun', token: host }
  // SAP SuccessFactors career sites: the tenant is the whole hostname.
  if (/\.jobs\.hr\.cloud\.sap$/.test(host)) return { ats: 'successfactors', token: host }
  return null
}

// ---------------------------------------------------------------------------
// 80,000 Hours (§7.6)
//
// robots.txt is fully permissive with no crawl delay (VERIFIED). No API and no
// RSS — /api/jobs, /jobs.json, /feed and /rss all 404. The board is a Nuxt app
// backed by Algolia, and the search credentials are published in the page
// itself (window.__NUXT__.config), so we re-read them every run.
//
// The spec also notes a public Airtable of all roles; the Algolia index is the
// same data without Airtable's automated-fetcher blocking, so it is preferred.
// ---------------------------------------------------------------------------

type AlgoliaCreds = { appId: string; apiKey: string; index: string }

async function eightyKCreds(config: Record<string, unknown>, ctx: AdapterContext): Promise<AlgoliaCreds> {
  const boardUrl = (config.boardUrl as string) ?? 'https://jobs.80000hours.org/'
  try {
    const html = await fetchText(boardUrl)
    const appId = html.match(/algoliaApplicationId:"([^"]+)"/)?.[1]
    const apiKey = html.match(/algoliaApiKey:"([^"]+)"/)?.[1]
    const index = html.match(/algoliaJobsIndex:"([^"]+)"/)?.[1]
    if (appId && apiKey && index) return { appId, apiKey, index }
    ctx.log('80k: could not read Algolia config from the page, using configured fallback')
  } catch (err) {
    ctx.log(`80k: page fetch failed (${(err as Error).message}), using configured fallback`)
  }
  const fb = config.fallback as AlgoliaCreds | undefined
  if (!fb?.appId) throw new Error('80k: no live Algolia config and no fallback configured')
  return fb
}

async function algoliaQuery<T>(creds: AlgoliaCreds, body: unknown): Promise<T> {
  return fetchJson<T>(`https://${creds.appId}-dsn.algolia.net/1/indexes/${creds.index}/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-Application-Id': creds.appId,
      'X-Algolia-API-Key': creds.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

export const eightyThousandHours: SourceAdapter = {
  id: '80000hours',
  async *fetch(config, ctx) {
    const creds = await eightyKCreds(config, ctx)
    // Discover which country facet values currently cover NL/Europe/remote
    // rather than hardcoding a list that will drift.
    const facets = await algoliaQuery<{ facets?: Record<string, Record<string, number>> }>(creds, {
      query: '',
      hitsPerPage: 0,
      facets: ['tags_country'],
      maxValuesPerFacet: 300,
    })
    const countries = eligibleFacetValues(facets.facets?.tags_country)
    ctx.log(`80k: ${countries.length} NL-eligible country facet values`)

    const data = await algoliaQuery<{ hits?: Record<string, unknown>[] }>(creds, {
      query: '',
      hitsPerPage: 1000,
      facetFilters: countries.length ? [countries.map((c) => `tags_country:${c}`)] : undefined,
    })
    for (const hit of data.hits ?? []) {
      yield { externalId: String(hit.objectID), payload: hit }
    }
  },
  normalise(raw): NormalisedListing | null {
    const h = raw.payload as Record<string, any>
    // 80k links straight out to the employer's ATS URL with UTM tags. That is
    // the useful part: canonicalising strips the UTM and the result collides
    // with the ATS listing we already poll, so dedup merges them (§7.7).
    const applyUrl = h.url_external ?? h.company_career_page_url
    if (!applyUrl) return null
    const cities = (h.tags_city ?? []).join(', ')
    const countries = (h.tags_country ?? []).join(', ')
    return {
      externalId: raw.externalId,
      employerId: null,
      employerName: String(h.company_name ?? h.company?.name ?? '').trim(),
      title: String(h.title ?? '').trim(),
      applyUrl: canonicaliseUrl(String(applyUrl)),
      // 80k has no per-job detail pages, so there is no description to take.
      // The ATS adapter for the same employer supplies the body text.
      description: null,
      descriptionHtml: null,
      locationRaw: cities || countries || null,
      country: /netherlands|nederland/i.test(countries) ? 'NL' : null,
      postedAt: h.posted_at ? new Date(h.posted_at * 1000) : null,
      deadlineAt: h.closes_at ? new Date(h.closes_at * 1000) : null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      mentions30PercentRuling: false,
    }
  },
  async discoverEmployers(config, ctx) {
    const creds = await eightyKCreds(config, ctx)
    // Pull the whole index for discovery, not just the NL slice — the point is
    // to harvest organisations and ATS tokens, and an org with no NL role today
    // may post one next month.
    const data = await algoliaQuery<{ hits?: Record<string, any>[] }>(creds, {
      query: '',
      hitsPerPage: 1000,
      attributesToRetrieve: ['company_name', 'company', 'url_external', 'company_career_page_url'],
    })
    const byName = new Map<string, EmployerDiscovery>()
    for (const hit of data.hits ?? []) {
      const name = String(hit.company_name ?? hit.company?.name ?? '').trim()
      if (!name) continue
      const applyUrl = hit.url_external ?? hit.company_career_page_url ?? ''
      const ats = applyUrl ? detectAts(String(applyUrl)) : null
      const existing = byName.get(name)
      if (existing && !ats) continue
      byName.set(name, {
        name,
        website: hit.company?.homepage_url ?? null,
        careersUrl: hit.company_career_page_url ?? null,
        ats: ats?.ats ?? existing?.ats ?? null,
        atsToken: ats?.token ?? existing?.atsToken ?? null,
        foundVia: '80000hours',
      })
    }
    ctx.log(`80k: discovered ${byName.size} organisations for the watchlist`)
    return [...byName.values()]
  },
}

// ---------------------------------------------------------------------------
// Probably Good (§7.6)
//
// robots.txt fully permissive (VERIFIED). Runs on NeuronHub, a client-side SPA
// with catch-all routing — /api/jobs and /sitemap.xml both return the app
// shell, proving the data API lives on a third-party host.
//
// Resolved: the backend GraphQL endpoint accepts only whitelisted persisted
// queries, and one of them (`AlgoliaSearchKey`) hands every visitor a scoped,
// short-lived Algolia key. Replaying that query gets us a fresh key each run,
// so their key rotation never breaks us and we never hardcode a secret.
//
// We are spending Probably Good's paid search quota, so: poll at most daily,
// cache aggressively, and send a descriptive user agent (§7.6). An explicit
// arrangement beats a silent one — emailing them is an M0 item.
// ---------------------------------------------------------------------------

const PG_SEARCH_KEY_QUERY = `
    query AlgoliaSearchKey {
      algolia_search_key {
        api_key
        app_id
        index_name
        index_name_sorted_by_votes
        index_name_profiles
        index_name_jobs
        index_name_jobs_sorted_by_closes_at
      }
    }
  `

type PgKey = { api_key: string; app_id: string; index_name_jobs: string }

async function probablyGoodCreds(config: Record<string, unknown>): Promise<AlgoliaCreds> {
  const graphqlUrl =
    (config.graphqlUrl as string) ?? 'https://backend.jobs.probablygood.org/api/graphql'
  // The exact query string matters — the server matches persisted queries
  // byte-for-byte, whitespace included. Do not reformat PG_SEARCH_KEY_QUERY.
  const res = await fetchJson<{ data?: { algolia_search_key?: PgKey } }>(graphqlUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operationName: 'AlgoliaSearchKey',
      query: PG_SEARCH_KEY_QUERY,
      variables: {},
    }),
  })
  const key = res.data?.algolia_search_key
  if (!key) throw new Error('probablygood: no algolia_search_key in GraphQL response')
  return { appId: key.app_id, apiKey: key.api_key, index: key.index_name_jobs }
}

export const probablyGood: SourceAdapter = {
  id: 'probablygood',
  async *fetch(config, ctx) {
    const creds = await probablyGoodCreds(config)
    const facets = await algoliaQuery<{ facets?: Record<string, Record<string, number>> }>(creds, {
      query: '',
      hitsPerPage: 0,
      facets: ['locations.algolia_filter_name'],
      maxValuesPerFacet: 600,
    })
    const locations = eligibleFacetValues(facets.facets?.['locations.algolia_filter_name'])
    ctx.log(`probablygood: ${locations.length} NL-eligible location facet values`)

    const data = await algoliaQuery<{ hits?: Record<string, unknown>[] }>(creds, {
      query: '',
      hitsPerPage: 1000,
      facetFilters: locations.length
        ? [locations.map((l) => `locations.algolia_filter_name:${l}`)]
        : undefined,
    })
    for (const hit of data.hits ?? []) {
      yield { externalId: String(hit.objectID), payload: hit }
    }
  },
  normalise(raw): NormalisedListing | null {
    const h = raw.payload as Record<string, any>
    const applyUrl = h.url_external
    if (!applyUrl) return null
    const locations = (h.locations ?? [])
      .map((l: any) => l.algolia_filter_name ?? l.name ?? '')
      .filter(Boolean)
      .join(', ')
    return {
      externalId: raw.externalId,
      employerId: null,
      employerName: String(h.org?.name ?? '').trim(),
      title: String(h.title ?? '').trim(),
      applyUrl: canonicaliseUrl(String(applyUrl)),
      description: typeof h.description === 'string' ? h.description : null,
      descriptionHtml: null,
      // Facet names arrive prefixed, e.g. "[country] Netherlands".
      locationRaw: locations.replace(/\[[a-z]+\]\s*/g, '') || null,
      country: /netherlands|nederland/i.test(locations) ? 'NL' : null,
      postedAt: h.posted_at_unix ? new Date(h.posted_at_unix * 1000) : null,
      deadlineAt: h.closes_at_unix ? new Date(h.closes_at_unix * 1000) : null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      mentions30PercentRuling: false,
    }
  },
  async discoverEmployers(config, ctx) {
    const creds = await probablyGoodCreds(config)
    const data = await algoliaQuery<{ hits?: Record<string, any>[] }>(creds, {
      query: '',
      hitsPerPage: 1000,
      attributesToRetrieve: ['org', 'url_external'],
    })
    const byName = new Map<string, EmployerDiscovery>()
    for (const hit of data.hits ?? []) {
      const name = String(hit.org?.name ?? '').trim()
      if (!name) continue
      const ats = hit.url_external ? detectAts(String(hit.url_external)) : null
      const existing = byName.get(name)
      if (existing && !ats) continue
      byName.set(name, {
        name,
        website: hit.org?.homepage_url ?? null,
        careersUrl: hit.org?.career_page_url ?? null,
        ats: ats?.ats ?? existing?.ats ?? null,
        atsToken: ats?.token ?? existing?.atsToken ?? null,
        foundVia: 'probablygood',
      })
    }
    ctx.log(`probablygood: discovered ${byName.size} organisations for the watchlist`)
    return [...byName.values()]
  },
}

export const EA_BOARD_ADAPTERS = [eightyThousandHours, probablyGood]
