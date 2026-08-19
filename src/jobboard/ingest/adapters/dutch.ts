/**
 * The Dutch sources — spec §7.3, §7.4, §7.5.
 *
 * werkenvoornederland is the most important single source: every ministry,
 * inspectorate, RIVM and the Autoriteit Persoonsgegevens flows through it, and
 * it is the backbone of the AI governance and biosecurity sections.
 */

import { fetchJson, fetchText, httpFetch, sleep } from '../../lib/http'
import { htmlToText } from '../../lib/text'
import { findJobPosting, normaliseJobPosting, type JobPosting } from './jsonld'
import type { AdapterContext, NormalisedListing, RawListing, SourceAdapter } from '../types'

// ---------------------------------------------------------------------------
// werkenvoornederland — sitemap crawl (§7.3)
//
// robots.txt explicitly permits crawling at 10 requests per second and
// publishes a dedicated sitemap-vacatures.xml (VERIFIED). Each vacancy page
// embeds schema.org JobPosting JSON-LD, and the underlying dataset is CC-0 —
// legally the cleanest source in the whole spec.
//
// Built regardless of whether CSO API credentials arrive, because it de-risks
// the whole source.
// ---------------------------------------------------------------------------

type SitemapEntry = { loc: string; lastmod: string }

function parseSitemap(xml: string): SitemapEntry[] {
  const out: SitemapEntry[] = []
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = m[1].match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim()
    const lastmod = m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() ?? ''
    if (loc) out.push({ loc, lastmod })
  }
  return out
}

/** Vacancy slugs end `-{ORGCODE}-{YYYY}-{NNNN}`, which identifies the org. */
export function orgCodeFromUrl(url: string): string | null {
  return url.match(/-([A-Za-z]+)-\d{4}-\d+\/?$/)?.[1]?.toUpperCase() ?? null
}

/**
 * The JSON-LD `description` on werkenvoornederland is a one-line summary, not
 * the ad body — VERIFIED against a live vacancy page. The real text sits in
 * anchored `<section>` elements, so we take the structured facts from the
 * markup and the body from the page.
 *
 * We take only the signal-bearing sections and deliberately drop the
 * application-procedure and related-vacancy tails, which is exactly the "long
 * boilerplate tail that carries no classification signal" the spec warns about
 * (§8.4). Doing it here rather than in the truncation step means the classifier
 * spends its 1,500-word budget on the parts that decide the score.
 */
const WVN_BODY_SECTIONS = [
  'dit_ga_je_doen', // what the role actually does — the core of the leverage judgement
  'dit_vragen_wij', // requirements: language, nationality, screening
  'hier_kom_je_te_werken', // team and organisation context
  'bijzonderheden', // where VOG / vertrouwensfunctie notes appear
]

/** Sections that are pure furniture on every vacancy, regardless of the role. */
const WVN_BODY_STOP_HEADINGS =
  /^(solliciteren|relevante vacatures|vragen en opmerkingen|over deze site|volg ons op|stel gerust je vraag|over de functiegroep)/i

export function extractWvnBody(html: string): string {
  const parts: string[] = []

  for (const id of WVN_BODY_SECTIONS) {
    const section = html.match(
      new RegExp(`<section[^>]*id="${id}_anchor"[^>]*>([\\s\\S]*?)</section>`, 'i'),
    )?.[1]
    if (section) parts.push(htmlToText(section))
  }

  // Fallback: if the anchored sections are gone (a template change), walk the
  // headings inside <main> and keep everything before the boilerplate tail,
  // so a redesign degrades the body rather than emptying it.
  if (parts.length === 0) {
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? ''
    const chunks = main.split(/(?=<h2[^>]*>)/i)
    for (const chunk of chunks) {
      const heading = htmlToText(chunk.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? '')
      if (WVN_BODY_STOP_HEADINGS.test(heading.trim())) break
      const text = htmlToText(chunk)
      if (text.length > 40) parts.push(text)
    }
  }

  return parts
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const wvnSitemap: SourceAdapter = {
  id: 'wvn-sitemap',
  async *fetch(config, ctx) {
    const sitemapUrl =
      (config.sitemapUrl as string) ?? 'https://www.werkenvoornederland.nl/sitemap-vacatures.xml'
    const alwaysInclude = new Set((config.alwaysIncludeOrgs as string[] | undefined) ?? [])
    const keywordGated = new Set((config.keywordGatedOrgs as string[] | undefined) ?? [])
    const keywords = ((config.keywords as string[] | undefined) ?? []).map((k) => k.toLowerCase())

    const xml = await fetchText(sitemapUrl)
    const entries = parseSitemap(xml)
    ctx.log(`wvn: sitemap lists ${entries.length} vacancies`)

    // Only fetch pages for organisations we care about. The slug carries
    // enough text to pre-filter the keyword-gated ministries before spending a
    // request on them.
    const wanted = entries.filter((e) => {
      const code = orgCodeFromUrl(e.loc)
      if (!code) return false
      if (alwaysInclude.has(code)) return true
      if (keywordGated.has(code)) {
        const slugText = (e.loc.split('/').pop() ?? '').replace(/-/g, ' ').toLowerCase()
        return keywords.some((k) => slugText.includes(k))
      }
      return false
    })

    const cacheKey = 'wvn:pages'
    const cache = (await ctx.cache.get<Record<string, { lastmod: string }>>(cacheKey)) ?? {}
    const live = new Set(wanted.map((e) => e.loc))
    for (const url of Object.keys(cache)) if (!live.has(url)) delete cache[url]

    let fetched = 0
    for (const entry of wanted) {
      // Unchanged pages are re-emitted from the sitemap alone so closure
      // detection still sees them as live, without re-fetching the body.
      if (cache[entry.loc]?.lastmod === entry.lastmod) {
        yield { externalId: entry.loc, payload: { url: entry.loc, unchanged: true } }
        continue
      }
      if (Date.now() >= ctx.deadline) {
        ctx.log(`wvn: out of time after ${fetched} page fetches; resuming next run`)
        break
      }
      try {
        const html = await fetchText(entry.loc)
        const posting = findJobPosting(html)
        cache[entry.loc] = { lastmod: entry.lastmod }
        fetched++
        if (!posting) {
          ctx.log(`wvn: no JobPosting markup at ${entry.loc}`)
          continue
        }
        // The markup's description is a one-liner, so carry the page body too.
        const body = extractWvnBody(html)
        if (!body) ctx.log(`wvn: no body sections found at ${entry.loc}`)
        yield { externalId: entry.loc, payload: { url: entry.loc, posting, body } }
      } catch (err) {
        ctx.log(`wvn: failed ${entry.loc}: ${(err as Error).message}`)
      }
    }

    await ctx.cache.set(cacheKey, cache)
    ctx.log(`wvn: ${wanted.length} relevant, ${fetched} pages fetched this run`)
  },
  normalise(raw, config) {
    const p = raw.payload as {
      url: string
      posting?: JobPosting
      body?: string
      unchanged?: boolean
    }
    // An unchanged page carries no body; the runner treats a null normalise as
    // "seen but nothing new", which is exactly right for closure detection.
    if (!p.posting) return null
    const orgNames = (config.orgNames as Record<string, string> | undefined) ?? {}
    const code = orgCodeFromUrl(p.url)
    const listing = normaliseJobPosting(p.posting, {
      externalId: raw.externalId,
      url: p.url,
      employerId: code ? ((config.employerIdByOrg as Record<string, string>)?.[code] ?? null) : null,
      employerNameFallback: code ? (orgNames[code] ?? code) : null,
    })
    // Prefer the page body over the markup's one-line summary; keep the summary
    // as a lead-in so the classifier still sees the framing sentence.
    const description = p.body
      ? [listing.description, p.body].filter(Boolean).join('\n\n')
      : listing.description
    return {
      ...listing,
      description,
      descriptionHtml: null,
      // Dutch government ads are almost always NL-located even when the markup
      // omits the country.
      country: listing.country ?? 'NL',
    }
  },
}

// ---------------------------------------------------------------------------
// CSO Vacature API — werkenvoornederland's own API (§7.3)
//
// Covers WerkenvoorNederland.nl, WerkenbijdeOverheid.nl and
// Mobiliteitsbank.nl. Quirks, all VERIFIED from the documentation:
//   • HTTP POST with a JSON body, not REST GET.
//   • Auth required; keys expire after 20 minutes and only ONE key exists per
//     account at a time — so the client must re-authenticate on a timer and
//     must never run concurrent key requests.
//   • Every JSON object needs an explicit __type__ field naming its class.
//
// Credentials are a lead-time item with no self-service signup
// (helpdesk@werkenvoornederland.nl). Absent credentials this adapter disables
// itself and the sitemap crawler above carries the source.
// ---------------------------------------------------------------------------

const CSO_KEY_TTL_MS = 18 * 60 * 1000 // re-auth at 18 min, ahead of the 20-min expiry

let csoKey: { key: string; obtainedAt: number } | null = null
let csoKeyInFlight: Promise<string> | null = null

async function csoApiKey(baseUrl: string, username: string, password: string): Promise<string> {
  if (csoKey && Date.now() - csoKey.obtainedAt < CSO_KEY_TTL_MS) return csoKey.key
  // Only one key exists per account at a time, so a concurrent second request
  // would invalidate the first. Share the in-flight promise instead.
  csoKeyInFlight ??= (async () => {
    try {
      const res = await fetchJson<{ apiKey?: string; ApiKey?: string; result?: string }>(
        `${baseUrl}getApiKey.json`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        },
      )
      const key = res.apiKey ?? res.ApiKey ?? res.result
      if (!key) throw new Error('CSO getApiKey returned no key')
      csoKey = { key, obtainedAt: Date.now() }
      return key
    } finally {
      csoKeyInFlight = null
    }
  })()
  return csoKeyInFlight
}

export const csoApi: SourceAdapter = {
  id: 'cso-api',
  async *fetch(config, ctx) {
    const baseUrl = (config.baseUrl as string) ?? 'https://api.cso20.net/v1/JobAPI/'
    const username = process.env.CSO_API_USERNAME
    const password = process.env.CSO_API_PASSWORD
    if (!username || !password) {
      ctx.log(
        'cso-api: CSO_API_USERNAME/CSO_API_PASSWORD not set — skipping. ' +
          'Request credentials from helpdesk@werkenvoornederland.nl (M0 lead-time item); ' +
          'the wvn-sitemap source covers this ground meanwhile.',
      )
      return
    }

    const pageSize = Number(config.pageSize ?? 100)
    for (let page = 0; page < 50; page++) {
      const apiKey = await csoApiKey(baseUrl, username, password)
      const body = {
        apiKey,
        // Every JSON object needs an explicit __type__ naming its class.
        filter: {
          __type__: 'RemoteJobFilter',
          ...(config.filter as Record<string, unknown> | undefined),
        },
        fieldSelection: {
          __type__: 'RemoteJobFieldselection',
          ...(config.fieldSelection as Record<string, unknown> | undefined),
        },
        offset: page * pageSize,
        limit: pageSize,
      }
      const res = await httpFetch(`${baseUrl}getJobs.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        acceptStatuses: [401, 403],
      })
      if (res.status === 401 || res.status === 403) {
        // Key expired mid-run, or another process claimed the single allowed
        // key. Drop it and let the next iteration re-authenticate.
        csoKey = null
        ctx.log('cso-api: key rejected, re-authenticating')
        await sleep(1000)
        continue
      }
      const data = (await res.json()) as { jobs?: Record<string, unknown>[]; Jobs?: unknown[] }
      const jobs = (data.jobs ?? (data.Jobs as Record<string, unknown>[]) ?? []) as Record<
        string,
        unknown
      >[]
      for (const job of jobs) {
        yield { externalId: String(job.id ?? job.Id ?? job.vacancyNumber), payload: job }
      }
      if (jobs.length < pageSize) return
      if (Date.now() >= ctx.deadline) {
        ctx.log('cso-api: out of time; resuming next run')
        return
      }
    }
  },
  normalise(raw, config) {
    const j = raw.payload as Record<string, any>
    const html = j.description ?? j.Description ?? j.jobDescription ?? null
    const orgName = j.organisation?.name ?? j.organisationName ?? j.OrganisationName ?? ''
    const url = j.url ?? j.applyUrl ?? j.vacancyUrl ?? ''
    return {
      externalId: raw.externalId,
      employerId:
        (config.employerIdByOrg as Record<string, string> | undefined)?.[String(orgName)] ?? null,
      employerName: String(orgName),
      title: String(j.title ?? j.Title ?? '').trim(),
      applyUrl: String(url),
      description: htmlToText(html),
      descriptionHtml: html,
      locationRaw: j.location ?? j.city ?? j.Location ?? null,
      country: 'NL',
      postedAt: j.publicationDate ? new Date(j.publicationDate) : null,
      deadlineAt: j.closingDate ? new Date(j.closingDate) : null,
      salaryMin: typeof j.salaryMin === 'number' ? j.salaryMin : null,
      salaryMax: typeof j.salaryMax === 'number' ? j.salaryMax : null,
      salaryCurrency: j.salaryMin ? 'EUR' : null,
      salaryPeriod: j.salaryPeriod ?? 'month',
      mentions30PercentRuling: false,
    }
  },
}

// ---------------------------------------------------------------------------
// AcademicTransfer — incremental crawl (§7.4)
//
// Around 534 live vacancies across WUR, Erasmus MC, UvA, TU Delft and KIT. No
// public API and no RSS feed. robots.txt is unusually thoughtful: it
// explicitly allows Claude-User and Claude-SearchBot while disallowing
// training crawlers, and sets Crawl-delay: 10 (VERIFIED).
//
// Ten seconds per request means a full crawl takes about 90 minutes, so we do
// NOT full-crawl. We walk the listing pages incrementally and fetch detail
// pages only for numeric IDs we have not seen. The numeric ID is a stable
// dedup key. The 10-second delay is enforced centrally in lib/http.ts.
// ---------------------------------------------------------------------------

export const academictransfer: SourceAdapter = {
  id: 'academictransfer',
  async *fetch(config, ctx) {
    const listingUrl =
      (config.listingUrl as string) ?? 'https://www.academictransfer.com/en/jobs/'
    const maxDetailFetches = Number(config.maxDetailFetches ?? 25)

    const seenKey = 'at:seen-ids'
    const seen = new Set((await ctx.cache.get<string[]>(seenKey)) ?? [])

    // Walk index pages until we stop finding new IDs.
    const ids: string[] = []
    for (let page = 1; page <= Number(config.maxIndexPages ?? 6); page++) {
      if (Date.now() >= ctx.deadline) break
      const url = page === 1 ? listingUrl : `${listingUrl}?page=${page}`
      const html = await fetchText(url)
      const found = [...html.matchAll(/\/en\/jobs\/(\d+)\/([a-z0-9-]+)\/?/gi)].map((m) => m[1])
      const unique = [...new Set(found)]
      if (unique.length === 0) break
      ids.push(...unique)
      // Stop paging once a whole page is already known — the index is
      // reverse-chronological, so everything beyond it is older still.
      if (unique.every((id) => seen.has(id))) {
        ctx.log(`academictransfer: page ${page} fully known, stopping index walk`)
        break
      }
    }

    const fresh = [...new Set(ids)].filter((id) => !seen.has(id))
    ctx.log(
      `academictransfer: ${ids.length} ids on index, ${fresh.length} new; ` +
        `fetching up to ${maxDetailFetches} detail pages this run (10s crawl-delay)`,
    )

    // Emit known IDs from cache so closure detection sees them as still live.
    const cachedPostings =
      (await ctx.cache.get<Record<string, { posting: JobPosting; url: string }>>('at:postings')) ??
      {}
    for (const id of ids) {
      if (fresh.includes(id)) continue
      const hit = cachedPostings[id]
      if (hit) yield { externalId: id, payload: hit }
    }

    let fetches = 0
    for (const id of fresh) {
      if (fetches >= maxDetailFetches || Date.now() >= ctx.deadline) {
        ctx.log(`academictransfer: budget reached at ${fetches} fetches; rest resume next run`)
        break
      }
      // The slug is not needed — the numeric ID resolves on its own.
      const url = `https://www.academictransfer.com/en/jobs/${id}/`
      try {
        const html = await fetchText(url)
        fetches++
        const posting = findJobPosting(html)
        seen.add(id)
        if (!posting) {
          // UNVERIFIED in the spec, so log loudly if the markup is absent —
          // it changes whether this source needs an HTML parser instead.
          ctx.log(`academictransfer: NO JSON-LD JobPosting at ${url} — parser fallback needed`)
          continue
        }
        cachedPostings[id] = { posting, url }
        yield { externalId: id, payload: { posting, url } }
      } catch (err) {
        ctx.log(`academictransfer: failed ${url}: ${(err as Error).message}`)
      }
    }

    await ctx.cache.set(seenKey, [...seen])
    await ctx.cache.set('at:postings', cachedPostings)
  },
  normalise(raw, config) {
    const { posting, url } = raw.payload as { posting: JobPosting; url: string }
    const listing = normaliseJobPosting(posting, {
      externalId: raw.externalId,
      url,
      employerId: null,
      employerNameFallback: (config.employerName as string | undefined) ?? null,
    })
    return { ...listing, country: listing.country ?? 'NL' }
  },
}

// ---------------------------------------------------------------------------
// EURAXESS — evaluated as an alternative to the AcademicTransfer crawl (§7.4)
//
// AcademicTransfer forwards all English scientific-staff jobs to EURAXESS,
// which publishes public XML exports. If a full jobs export exists it may
// deliver a large slice of Dutch academic vacancies with no crawling and no
// 10-second delay. Coverage and freshness are UNVERIFIED — this adapter
// reports what it finds so M0 can settle the question with real data.
// ---------------------------------------------------------------------------

export const euraxess: SourceAdapter = {
  id: 'euraxess',
  async *fetch(config, ctx) {
    const exportUrl = config.exportUrl as string | undefined
    if (!exportUrl) {
      ctx.log(
        'euraxess: no exportUrl configured. M0 item — inspect ' +
          'https://euraxess.ec.europa.eu/sites/default/files/exports/ for a full jobs export. ' +
          'If one exists it may replace the AcademicTransfer crawl entirely.',
      )
      return
    }
    const xml = await fetchText(exportUrl)
    const items = [...xml.matchAll(/<(?:item|job)>([\s\S]*?)<\/(?:item|job)>/g)]
    ctx.log(`euraxess: ${items.length} entries in export`)
    for (const m of items) {
      const block = m[1]
      const pick = (tag: string) =>
        block.match(
          new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'),
        )?.[1] ?? null
      const country = pick('country')
      // Only Dutch postings are relevant; the export is EU-wide.
      if (country && !/netherlands|nederland|\bNL\b/i.test(country)) continue
      const link = pick('link') ?? pick('url')
      if (!link) continue
      yield { externalId: link.trim(), payload: Object.fromEntries(
        ['title', 'link', 'url', 'description', 'organisation', 'city', 'country', 'deadline', 'pubDate'].map(
          (t) => [t, pick(t)],
        ),
      ) }
    }
  },
  normalise(raw) {
    const j = raw.payload as Record<string, string | null>
    return {
      externalId: raw.externalId,
      employerId: null,
      employerName: (j.organisation ?? '').trim(),
      title: htmlToText(j.title ?? '').trim(),
      applyUrl: (j.link ?? j.url ?? '').trim(),
      description: htmlToText(j.description),
      descriptionHtml: j.description ?? null,
      locationRaw: [j.city, j.country].filter(Boolean).join(', ') || null,
      country: 'NL',
      postedAt: j.pubDate ? new Date(j.pubDate) : null,
      deadlineAt: j.deadline ? new Date(j.deadline) : null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      mentions30PercentRuling: false,
    }
  },
}

// ---------------------------------------------------------------------------
// Partos — the Dutch trade association for international cooperation (§7.5)
//
// 100+ member organisations. The closest existing thing to a sector-wide Dutch
// impact job board and the best single feed for global health and development.
// Not effectiveness-filtered, so we lean on the classifier.
//
// Access method was UNVERIFIED in the spec, so this adapter tries JSON-LD
// first (most Dutch job pages have it) and falls back to link extraction.
// ---------------------------------------------------------------------------

/**
 * Partos publishes no JSON-LD on its vacancy pages (VERIFIED against live
 * pages), so the HTML fallback below is the real path rather than a safety net.
 *
 * The important detail: each Partos page links out to the member
 * organisation's own vacancy page. That outbound link is both the better
 * apply_url — it takes the reader to the employer rather than to the trade
 * association — and the only reliable way to identify the employer, which
 * matters because Partos's whole value is its 100+ members. Using it also means
 * a Partos listing dedups against the same role arriving from that employer's
 * own feed (§7.7).
 */
export function partosFacts(html: string): {
  applyUrl: string | null
  employerHost: string | null
  employerNameHint: string | null
  deadline: Date | null
  location: string | null
} {
  // Every Partos page carries the same header/footer social icons (Bluesky,
  // LinkedIn, Instagram...) outside the vacancy body itself. Scanning the
  // whole page for "the first outbound link" picks those up as the employer
  // whenever a vacancy has no genuine outbound link (e.g. a vacancy at
  // Partos itself, not a member organisation) — that's how listing id 65
  // got "employerHost: bsky.app". Restrict the scan to `<main id="main">`,
  // which holds only the vacancy content and excludes the shared chrome.
  const main = html.match(/<main id="main"[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html

  // Walk the outbound links once, keeping the best candidate of each kind:
  // a vacancy link is worth using as apply_url, while a bare homepage link
  // still identifies the employer even though it is not where you apply.
  let applyUrl: string | null = null
  let employerHost: string | null = null
  for (const m of main.matchAll(/<a[^>]+href="(https?:\/\/[^"]+)"/gi)) {
    try {
      const url = new URL(m[1])
      const host = url.hostname.replace(/^www\./, '')
      if (/partos\.nl$/.test(host)) continue
      // Defense in depth: even inside the vacancy body, don't let a share
      // button or embedded social link stand in for the employer's site.
      if (
        /(facebook|twitter|^x\.com$|linkedin|instagram|youtube|whatsapp|google|mailto|bsky\.app|threads\.net|tiktok\.com|pinterest)/.test(
          host,
        )
      )
        continue
      employerHost ??= host
      if (/vacature|vacancy|job|career|werken|sollicit/i.test(url.pathname)) {
        applyUrl = url.toString()
        employerHost = host
        break
      }
    } catch {
      /* skip unparseable hrefs */
    }
  }

  // Member organisations name themselves in a heading: "Over Dorcas",
  // "Wat biedt KIT?". Cheap, and it survives a page with no outbound link.
  let employerNameHint: string | null = null
  for (const m of html.matchAll(/<h[2-4][^>]*>([\s\S]{2,80}?)<\/h[2-4]>/gi)) {
    const heading = htmlToText(m[1]).trim()
    const over = heading.match(/^Over\s+(.{2,50})$/i)?.[1]
    const biedt = heading.match(/^Wat\s+biedt\s+(.{2,50}?)\??$/i)?.[1]
    const candidate = (over ?? biedt)?.trim()
    // "Over deze functie" / "Over ons" name the role or nobody, not the employer.
    if (candidate && !/^(deze|de|het|ons|onze|jou|wij|je)\b/i.test(candidate)) {
      employerNameHint = candidate
      break
    }
  }

  const text = htmlToText(html)
  const deadlineRaw = text.match(/Solliciteren voor:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i)
  const deadline = deadlineRaw
    ? new Date(
        Date.UTC(Number(deadlineRaw[3]), Number(deadlineRaw[2]) - 1, Number(deadlineRaw[1])),
      )
    : null
  const location = text.match(/Locatie:?\s*([^\n•]{2,60})/i)?.[1]?.trim() ?? null

  return { applyUrl, employerHost, employerNameHint, deadline, location }
}

export const partos: SourceAdapter = {
  id: 'partos',
  async *fetch(config, ctx) {
    const indexUrl = (config.indexUrl as string) ?? 'https://www.partos.nl/vacatures/'
    const html = await fetchText(indexUrl)

    const links = new Set<string>()
    for (const m of html.matchAll(/href="([^"]*\/vacature[s]?\/[^"#?]+)"/gi)) {
      try {
        const url = new URL(m[1], indexUrl).toString()
        if (url !== indexUrl.replace(/\/$/, '') && !url.endsWith('/vacatures/')) links.add(url)
      } catch {
        /* skip */
      }
    }
    ctx.log(`partos: ${links.size} vacancy links found`)

    for (const url of links) {
      if (Date.now() >= ctx.deadline) {
        ctx.log('partos: out of time; resuming next run')
        return
      }
      try {
        const page = await fetchText(url)
        const posting = findJobPosting(page)
        if (posting) {
          yield { externalId: url, payload: { posting, url } }
          continue
        }
        const title = page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? ''
        if (!title) continue
        // Keep only the vacancy body, not the site-wide footer blocks that
        // follow it ("Actueel", "Voor leden", "Meest bezocht", "Contact").
        const body = page.split(/<h2[^>]*>\s*(?:Actueel|Voor leden|Meest bezocht|Contact)\s*</i)[0]
        yield {
          externalId: url,
          payload: { url, title, html: body, facts: partosFacts(page) },
        }
      } catch (err) {
        ctx.log(`partos: failed ${url}: ${(err as Error).message}`)
      }
    }
  },
  normalise(raw, config) {
    const p = raw.payload as {
      url: string
      posting?: JobPosting
      title?: string
      html?: string
      facts?: ReturnType<typeof partosFacts>
    }
    if (p.posting) {
      const listing = normaliseJobPosting(p.posting, {
        externalId: raw.externalId,
        url: p.url,
      })
      return { ...listing, country: listing.country ?? 'NL' }
    }

    const facts = p.facts
    // Map the member organisation's domain onto the watchlist where we know it,
    // so a Partos listing inherits the employer's durable leverage note and its
    // gate flags rather than arriving anonymous.
    const domainMap =
      (config.domainToEmployer as Record<string, { id: string; name: string }> | undefined) ?? {}
    const known = facts?.employerHost ? domainMap[facts.employerHost] : undefined

    return {
      externalId: raw.externalId,
      employerId: known?.id ?? null,
      // Prefer the watchlist name, then the organisation's own heading, then the
      // bare hostname. The hostname fallback is deliberate: it is honest, and it
      // still tells the classifier which organisation this is.
      employerName: known?.name ?? facts?.employerNameHint ?? facts?.employerHost ?? '',
      title: htmlToText(p.title ?? '').trim(),
      // Link to the employer's own page, not to Partos.
      applyUrl: facts?.applyUrl ?? p.url,
      description: htmlToText(p.html),
      descriptionHtml: null,
      locationRaw: facts?.location ?? null,
      country: 'NL',
      postedAt: null,
      deadlineAt: facts?.deadline ?? null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      mentions30PercentRuling: false,
    }
  },
}

export const DUTCH_ADAPTERS = [wvnSitemap, csoApi, academictransfer, euraxess, partos]
