/**
 * ATS adapters — the backbone (spec §7.2).
 *
 * Most of the watchlist resolves to one of a handful of applicant tracking
 * systems with public, unauthenticated JSON endpoints. This is the
 * highest-value, lowest-effort part of the build.
 *
 * Every implementation gotcha the spec calls out is handled here and marked,
 * because each one otherwise costs an hour.
 */

import { fetchJson, fetchJsonOptional, fetchText, httpFetch } from '../../lib/http'
import {
  decodeEntities,
  htmlToText,
  mentions30PercentRuling,
  parseSalaryText,
} from '../../lib/text'
import type { AdapterContext, NormalisedListing, RawListing, SourceAdapter } from '../types'

type Cfg = Record<string, unknown>
const str = (c: Cfg, k: string): string => {
  const v = c[k]
  if (typeof v !== 'string' || !v) throw new Error(`adapter config missing "${k}"`)
  return v
}
const optStr = (c: Cfg, k: string): string | null =>
  typeof c[k] === 'string' && c[k] ? (c[k] as string) : null

const toDate = (v: unknown): Date | null => {
  if (typeof v === 'number') return new Date(v > 1e12 ? v : v * 1000)
  if (typeof v === 'string' && v) {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

/** Shared normalisation tail: salary parsing and the 30%-ruling flag. */
function finish(
  base: Omit<
    NormalisedListing,
    'salaryMin' | 'salaryMax' | 'salaryCurrency' | 'salaryPeriod' | 'mentions30PercentRuling'
  >,
  salaryText: string | null,
  explicit?: Partial<
    Pick<NormalisedListing, 'salaryMin' | 'salaryMax' | 'salaryCurrency' | 'salaryPeriod'>
  >,
): NormalisedListing {
  const parsed = parseSalaryText(salaryText)
  const haystack = `${base.title}\n${base.description ?? ''}\n${salaryText ?? ''}`
  return {
    ...base,
    salaryMin: explicit?.salaryMin ?? parsed.min,
    salaryMax: explicit?.salaryMax ?? parsed.max,
    salaryCurrency: explicit?.salaryCurrency ?? parsed.currency,
    salaryPeriod: explicit?.salaryPeriod ?? parsed.period,
    mentions30PercentRuling: mentions30PercentRuling(haystack),
  }
}

// ---------------------------------------------------------------------------
// Greenhouse — LIVE-VERIFIED
// ---------------------------------------------------------------------------

export const greenhouse: SourceAdapter = {
  id: 'greenhouse',
  async *fetch(config) {
    const token = str(config, 'token')
    const data = await fetchJson<{ jobs?: Record<string, unknown>[] }>(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`,
    )
    for (const job of data.jobs ?? []) {
      yield { externalId: String(job.id), payload: job }
    }
  },
  normalise(raw, config) {
    const j = raw.payload as Record<string, any>
    // GOTCHA: Greenhouse returns `content` HTML-entity-encoded — the HTML
    // tags themselves arrive as &lt;p&gt;. Decode before parsing, or the
    // description comes through as visible markup. Most common Greenhouse bug.
    const html = j.content ? decodeEntities(String(j.content)) : null
    const meta: Record<string, string> = {}
    for (const m of j.metadata ?? []) {
      if (m?.name && m?.value != null) meta[String(m.name)] = String(m.value)
    }
    const salaryText =
      meta['Salary'] ?? meta['Compensation'] ?? j.pay_input_ranges?.[0]?.title ?? null

    return finish(
      {
        externalId: raw.externalId,
        employerId: optStr(config, 'employerId'),
        employerName: optStr(config, 'employerName') ?? String(j.company_name ?? ''),
        title: String(j.title ?? '').trim(),
        applyUrl: String(j.absolute_url ?? ''),
        description: htmlToText(html),
        descriptionHtml: html,
        locationRaw: j.location?.name ?? null,
        country: null,
        postedAt: toDate(j.updated_at ?? j.first_published),
        deadlineAt: null,
      },
      salaryText,
    )
  },
}

// ---------------------------------------------------------------------------
// Ashby — LIVE-VERIFIED
// ---------------------------------------------------------------------------

export const ashby: SourceAdapter = {
  id: 'ashby',
  async *fetch(config) {
    // GOTCHA: board names are case-sensitive.
    const name = str(config, 'boardName')
    const data = await fetchJson<{ jobs?: Record<string, unknown>[] }>(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(name)}?includeCompensation=true`,
    )
    for (const job of data.jobs ?? []) {
      // GOTCHA: filter on isListed — unlisted postings are drafts or internal.
      if (job.isListed === false) continue
      yield { externalId: String(job.id), payload: job }
    }
  },
  normalise(raw, config) {
    const j = raw.payload as Record<string, any>
    const html = j.descriptionHtml ?? null
    const comp = j.compensation ?? {}
    const summary: string | null = comp.compensationTierSummary ?? comp.summary ?? null
    return finish(
      {
        externalId: raw.externalId,
        employerId: optStr(config, 'employerId'),
        employerName: optStr(config, 'employerName') ?? '',
        title: String(j.title ?? '').trim(),
        applyUrl: String(j.jobUrl ?? j.applyUrl ?? ''),
        description: j.descriptionPlain ? String(j.descriptionPlain) : htmlToText(html),
        descriptionHtml: html,
        locationRaw: j.location ?? j.secondaryLocations?.[0]?.location ?? null,
        country: null,
        postedAt: toDate(j.publishedAt ?? j.updatedAt),
        deadlineAt: null,
      },
      summary,
    )
  },
}

// ---------------------------------------------------------------------------
// Lever — LIVE-VERIFIED
// ---------------------------------------------------------------------------

export const lever: SourceAdapter = {
  id: 'lever',
  async *fetch(config, ctx) {
    const site = str(config, 'site')
    // GOTCHA: Lever has an EU data-residency host. If the global host 404s for
    // a Dutch employer, try api.eu.lever.co before concluding they aren't on
    // Lever at all.
    const hosts = ['https://api.lever.co', 'https://api.eu.lever.co']
    for (const host of hosts) {
      const data = await fetchJsonOptional<Record<string, unknown>[]>(
        `${host}/v0/postings/${encodeURIComponent(site)}?mode=json`,
      )
      if (!data) {
        ctx.log(`lever: no board at ${host}, trying next host`)
        continue
      }
      for (const job of data) yield { externalId: String(job.id), payload: job }
      return
    }
    ctx.log(`lever: site "${site}" not found on either the global or EU host`)
  },
  normalise(raw, config) {
    const j = raw.payload as Record<string, any>
    // GOTCHA: Lever splits the description across `description`, `lists` and
    // `additional`. Using `description` alone silently loses most of the text.
    const listsHtml = (j.lists ?? [])
      .map((l: any) => `<h3>${l.text ?? ''}</h3><ul>${l.content ?? ''}</ul>`)
      .join('\n')
    const html = [j.description ?? '', listsHtml, j.additional ?? '']
      .filter(Boolean)
      .join('\n')
    const categories = j.categories ?? {}
    return finish(
      {
        externalId: raw.externalId,
        employerId: optStr(config, 'employerId'),
        employerName: optStr(config, 'employerName') ?? '',
        title: String(j.text ?? '').trim(),
        applyUrl: String(j.hostedUrl ?? j.applyUrl ?? ''),
        description: htmlToText(html),
        descriptionHtml: html,
        locationRaw: categories.location ?? null,
        country: null,
        postedAt: toDate(j.createdAt),
        deadlineAt: null,
      },
      categories.compensation ?? j.salaryRange?.currency
        ? `${j.salaryRange?.min ?? ''} ${j.salaryRange?.max ?? ''} ${j.salaryRange?.currency ?? ''}`
        : null,
      j.salaryRange
        ? {
            salaryMin: j.salaryRange.min ?? null,
            salaryMax: j.salaryRange.max ?? null,
            salaryCurrency: j.salaryRange.currency ?? null,
            salaryPeriod: j.salaryRange.interval ?? null,
          }
        : undefined,
    )
  },
}

// ---------------------------------------------------------------------------
// Workable — envelope verified
// ---------------------------------------------------------------------------

export const workable: SourceAdapter = {
  id: 'workable',
  async *fetch(config) {
    const account = str(config, 'account')
    const data = await fetchJson<{ jobs?: Record<string, unknown>[] }>(
      `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(account)}?details=true`,
    )
    for (const job of data.jobs ?? []) {
      yield { externalId: String(job.shortcode ?? job.id), payload: job }
    }
  },
  normalise(raw, config) {
    const j = raw.payload as Record<string, any>
    const html = [j.description, j.requirements, j.benefits].filter(Boolean).join('\n')
    const loc = [j.city, j.state, j.country].filter(Boolean).join(', ')
    return finish(
      {
        externalId: raw.externalId,
        employerId: optStr(config, 'employerId'),
        employerName: optStr(config, 'employerName') ?? String(j.company ?? ''),
        title: String(j.title ?? '').trim(),
        applyUrl: String(j.url ?? j.application_url ?? ''),
        description: htmlToText(html),
        descriptionHtml: html || null,
        locationRaw: loc || null,
        country: typeof j.countryCode === 'string' ? j.countryCode.toUpperCase() : null,
        postedAt: toDate(j.published_on ?? j.created_at),
        deadlineAt: null,
      },
      null,
    )
  },
}

// ---------------------------------------------------------------------------
// Recruitee — LIVE-VERIFIED
// ---------------------------------------------------------------------------

export const recruitee: SourceAdapter = {
  id: 'recruitee',
  async *fetch(config) {
    const company = str(config, 'company')
    const data = await fetchJson<{ offers?: Record<string, unknown>[] }>(
      `https://${encodeURIComponent(company)}.recruitee.com/api/offers/`,
    )
    for (const job of data.offers ?? []) {
      yield { externalId: String(job.id), payload: job }
    }
  },
  normalise(raw, config) {
    const j = raw.payload as Record<string, any>
    const html = [j.description, j.requirements].filter(Boolean).join('\n')
    return finish(
      {
        externalId: raw.externalId,
        employerId: optStr(config, 'employerId'),
        employerName: optStr(config, 'employerName') ?? String(j.company_name ?? ''),
        title: String(j.title ?? '').trim(),
        applyUrl: String(j.careers_url ?? j.careers_apply_url ?? ''),
        description: htmlToText(html),
        descriptionHtml: html || null,
        locationRaw: [j.city, j.country].filter(Boolean).join(', ') || j.location || null,
        country: typeof j.country_code === 'string' ? j.country_code.toUpperCase() : null,
        postedAt: toDate(j.published_at ?? j.created_at),
        deadlineAt: null,
      },
      j.salary
        ? `${j.salary.min ?? ''} ${j.salary.max ?? ''} ${j.salary.currency ?? ''} per ${j.salary.period ?? ''}`
        : null,
    )
  },
}

// ---------------------------------------------------------------------------
// Personio — LIVE-VERIFIED
// ---------------------------------------------------------------------------

export const personio: SourceAdapter = {
  id: 'personio',
  async *fetch(config, ctx) {
    // GOTCHA: tenants live on either .de or .com — derive from the employer's
    // actual careers URL rather than assuming. GOTCHA: the `language` query
    // parameter is required. GOTCHA: use /xml, not /search.json — only the
    // former carries full descriptions.
    const tenant = str(config, 'tenant')
    const tld = optStr(config, 'tld') ?? 'de'
    const language = optStr(config, 'language') ?? 'nl'
    const xml = await fetchText(
      `https://${tenant}.jobs.personio.${tld}/xml?language=${language}`,
    )
    for (const m of xml.matchAll(/<position>([\s\S]*?)<\/position>/g)) {
      const block = m[1]
      const pick = (tag: string) =>
        block.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`))?.[1] ??
        null
      const id = pick('id')
      if (!id) continue
      yield {
        externalId: id.trim(),
        payload: {
          id: id.trim(),
          name: pick('name'),
          office: pick('office'),
          department: pick('department'),
          schedule: pick('schedule'),
          seniority: pick('seniority'),
          createdAt: pick('createdAt'),
          description: [...block.matchAll(/<value>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/value>/g)]
            .map((v) => v[1])
            .join('\n'),
        },
      }
    }
    if (!xml.includes('<position>')) ctx.log(`personio: no positions in ${tenant}.jobs.personio.${tld}`)
  },
  normalise(raw, config) {
    const j = raw.payload as Record<string, any>
    const tenant = str(config, 'tenant')
    const tld = optStr(config, 'tld') ?? 'de'
    return finish(
      {
        externalId: raw.externalId,
        employerId: optStr(config, 'employerId'),
        employerName: optStr(config, 'employerName') ?? '',
        title: String(j.name ?? '').trim(),
        applyUrl: `https://${tenant}.jobs.personio.${tld}/job/${raw.externalId}`,
        description: htmlToText(j.description),
        descriptionHtml: j.description ?? null,
        locationRaw: j.office ?? null,
        country: null,
        postedAt: toDate(j.createdAt),
        deadlineAt: null,
      },
      null,
    )
  },
}

// ---------------------------------------------------------------------------
// SmartRecruiters — documented, tier-dependent
// ---------------------------------------------------------------------------

export const smartrecruiters: SourceAdapter = {
  id: 'smartrecruiters',
  async *fetch(config, ctx) {
    const companyId = str(config, 'companyId')
    let offset = 0
    const limit = 100
    for (;;) {
      // GOTCHA: the public postings feed is tier-dependent — not every
      // customer has it enabled, and there is no directory of who does.
      // 403/404 means "not available for this employer", not an error (§7.2).
      const page = await fetchJsonOptional<{ content?: Record<string, unknown>[]; totalFound?: number }>(
        `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(companyId)}/postings?limit=${limit}&offset=${offset}`,
      )
      if (!page) {
        ctx.log(`smartrecruiters: postings feed not enabled for ${companyId}`)
        return
      }
      const items = page.content ?? []
      for (const summary of items) {
        // GOTCHA: two-call pattern. The list endpoint returns summaries only;
        // full descriptions live in `jobAd.sections` on the detail endpoint.
        const detail = await fetchJsonOptional<Record<string, unknown>>(
          `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(companyId)}/postings/${String(summary.id)}`,
        )
        yield { externalId: String(summary.id), payload: { ...summary, detail } }
      }
      offset += limit
      if (items.length < limit || offset >= (page.totalFound ?? 0)) return
    }
  },
  normalise(raw, config) {
    const j = raw.payload as Record<string, any>
    const sections = j.detail?.jobAd?.sections ?? {}
    const html = ['companyDescription', 'jobDescription', 'qualifications', 'additionalInformation']
      .map((k) => sections[k]?.text)
      .filter(Boolean)
      .join('\n')
    const loc = j.location ?? {}
    return finish(
      {
        externalId: raw.externalId,
        employerId: optStr(config, 'employerId'),
        employerName: optStr(config, 'employerName') ?? String(j.company?.name ?? ''),
        title: String(j.name ?? '').trim(),
        applyUrl: String(j.applyUrl ?? j.ref ?? ''),
        description: htmlToText(html),
        descriptionHtml: html || null,
        locationRaw: [loc.city, loc.region, loc.country].filter(Boolean).join(', ') || null,
        country: typeof loc.country === 'string' ? loc.country.toUpperCase() : null,
        postedAt: toDate(j.releasedDate ?? j.createdOn),
        deadlineAt: null,
      },
      null,
    )
  },
}

// ---------------------------------------------------------------------------
// Teamtailor — RSS
// ---------------------------------------------------------------------------

export const teamtailor: SourceAdapter = {
  id: 'teamtailor',
  async *fetch(config) {
    // GOTCHA: Teamtailor uses regional hosts, numeric-suffixed subdomains and
    // customer custom domains. Append /jobs.rss to the *actual* career-site
    // host — naively constructing {slug}.teamtailor.com will break.
    // GOTCHA: default page size is 100, so paginate explicitly.
    const host = str(config, 'host')
    const perPage = 200
    for (let page = 1; page <= 20; page++) {
      const xml = await fetchText(`https://${host}/jobs.rss?per_page=${perPage}&page=${page}`)
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      for (const m of items) {
        const block = m[1]
        const pick = (tag: string) =>
          block.match(
            new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`),
          )?.[1] ?? null
        const link = pick('link')
        if (!link) continue
        yield {
          externalId: pick('guid') ?? link,
          payload: {
            link: link.trim(),
            title: pick('title'),
            description: pick('description'),
            pubDate: pick('pubDate'),
            location: pick('location') ?? pick('category'),
          },
        }
      }
      if (items.length < perPage) return
    }
  },
  normalise(raw, config) {
    const j = raw.payload as Record<string, any>
    return finish(
      {
        externalId: raw.externalId,
        employerId: optStr(config, 'employerId'),
        employerName: optStr(config, 'employerName') ?? '',
        title: String(j.title ?? '').trim(),
        applyUrl: String(j.link ?? ''),
        description: htmlToText(j.description),
        descriptionHtml: j.description ?? null,
        locationRaw: j.location ?? null,
        country: null,
        postedAt: toDate(j.pubDate),
        deadlineAt: null,
      },
      null,
    )
  },
}

// ---------------------------------------------------------------------------
// Breezy HR — needed for Clean Air Task Force
// ---------------------------------------------------------------------------

export const breezy: SourceAdapter = {
  id: 'breezy',
  async *fetch(config, ctx) {
    const company = str(config, 'company')
    const data = await fetchJsonOptional<Record<string, unknown>[]>(
      `https://${encodeURIComponent(company)}.breezy.hr/json`,
    )
    if (!data) {
      ctx.log(`breezy: no public feed for ${company}`)
      return
    }
    for (const job of data) {
      yield { externalId: String(job.id ?? job.friendly_id ?? job.url), payload: job }
    }
  },
  normalise(raw, config) {
    const j = raw.payload as Record<string, any>
    const loc = j.location ?? {}
    const locName =
      typeof loc === 'string'
        ? loc
        : [loc.city, loc.state?.name ?? loc.state, loc.country?.name ?? loc.country]
            .filter(Boolean)
            .join(', ')
    return finish(
      {
        externalId: raw.externalId,
        employerId: optStr(config, 'employerId'),
        employerName: optStr(config, 'employerName') ?? '',
        title: String(j.name ?? j.title ?? '').trim(),
        applyUrl: String(j.url ?? ''),
        description: htmlToText(j.description),
        descriptionHtml: j.description ?? null,
        locationRaw: locName || (loc.is_remote ? 'Remote' : null),
        country: null,
        postedAt: toDate(j.published_date ?? j.creation_date),
        deadlineAt: null,
      },
      null,
    )
  },
}

// ---------------------------------------------------------------------------
// Workday — POST-based, tenant-specific
// ---------------------------------------------------------------------------

export const workday: SourceAdapter = {
  id: 'workday',
  async *fetch(config, ctx) {
    const tenant = str(config, 'tenant')
    const site = str(config, 'site')
    const host = optStr(config, 'host') ?? `${tenant}.wd3.myworkdayjobs.com`
    const limit = 20
    for (let offset = 0; offset < 400; offset += limit) {
      const res = await httpFetch(
        `https://${host}/wday/cxs/${tenant}/${site}/jobs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appliedFacets: {}, limit, offset, searchText: '' }),
          acceptStatuses: [404, 403],
        },
      )
      if (!res.ok) {
        ctx.log(`workday: ${res.status} for ${host}/${tenant}/${site} — check tenant/site/host`)
        return
      }
      const data = (await res.json()) as {
        // Workday returns the requisition id in bulletFields, which is the only
        // stable external id on the list endpoint.
        jobPostings?: { externalPath?: string; bulletFields?: string[] }[]
        total?: number
      }
      const postings = data.jobPostings ?? []
      for (const p of postings) {
        const path = String(p.externalPath ?? '')
        const detail = await fetchJsonOptional<Record<string, unknown>>(
          `https://${host}/wday/cxs/${tenant}/${site}${path}`,
        )
        yield {
          externalId: String(p.bulletFields?.[0] ?? path),
          payload: { ...p, detail, host, tenant, site },
        }
      }
      if (postings.length < limit || offset + limit >= (data.total ?? 0)) return
    }
  },
  normalise(raw, config) {
    const j = raw.payload as Record<string, any>
    const info = j.detail?.jobPostingInfo ?? {}
    const html = info.jobDescription ?? null
    return finish(
      {
        externalId: raw.externalId,
        employerId: optStr(config, 'employerId'),
        employerName: optStr(config, 'employerName') ?? '',
        title: String(info.title ?? j.title ?? '').trim(),
        applyUrl: String(
          info.externalUrl ?? `https://${j.host}/${j.site}${String(j.externalPath ?? '')}`,
        ),
        description: htmlToText(html),
        descriptionHtml: html,
        locationRaw: info.location ?? j.locationsText ?? null,
        country: null,
        postedAt: toDate(info.startDate ?? j.postedOn),
        deadlineAt: toDate(info.endDate),
      },
      null,
    )
  },
}

// ---------------------------------------------------------------------------
// BambooHR
// ---------------------------------------------------------------------------

export const bamboohr: SourceAdapter = {
  id: 'bamboohr',
  async *fetch(config, ctx) {
    const company = str(config, 'company')
    const data = await fetchJsonOptional<{ result?: Record<string, unknown>[] }>(
      `https://${encodeURIComponent(company)}.bamboohr.com/careers/list`,
    )
    if (!data?.result) {
      ctx.log(`bamboohr: no public list for ${company}`)
      return
    }
    for (const job of data.result) {
      const id = String(job.id)
      const detail = await fetchJsonOptional<Record<string, unknown>>(
        `https://${encodeURIComponent(company)}.bamboohr.com/careers/${id}/detail`,
      )
      yield { externalId: id, payload: { ...job, detail, company } }
    }
  },
  normalise(raw, config) {
    const j = raw.payload as Record<string, any>
    const d = j.detail?.result ?? j.detail ?? {}
    const html = d.jobOpeningDescription ?? null
    return finish(
      {
        externalId: raw.externalId,
        employerId: optStr(config, 'employerId'),
        employerName: optStr(config, 'employerName') ?? '',
        title: String(j.jobOpeningName ?? d.jobOpeningName ?? '').trim(),
        applyUrl: `https://${j.company}.bamboohr.com/careers/${raw.externalId}`,
        description: htmlToText(html),
        descriptionHtml: html,
        locationRaw:
          [j.location?.city, j.location?.state, j.location?.country].filter(Boolean).join(', ') ||
          null,
        country: null,
        postedAt: toDate(d.datePosted ?? j.datePosted),
        deadlineAt: null,
      },
      d.compensation ?? null,
    )
  },
}

export const ATS_ADAPTERS = [
  greenhouse,
  ashby,
  lever,
  workable,
  recruitee,
  personio,
  smartrecruiters,
  teamtailor,
  breezy,
  workday,
  bamboohr,
]
