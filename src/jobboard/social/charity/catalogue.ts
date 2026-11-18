/**
 * Doneer Effectief's top charities, read from its site each time a deep dive
 * is drafted, so the series follows its list as charities are added and
 * dropped (doneereffectief.nl/toporganisaties, structure read 18 Nov 2026).
 *
 * The overview links to a page per cause; a cause page lists a fund and the
 * individual charities; a charity's page says who recommends it ("Aanbevolen
 * door GiveWell") and links the evaluator's report ("Onderzoeksrapport").
 * Only the individual charities get a deep dive: a fund has no single report
 * behind it. The site's REST API returns no content, so this reads the HTML.
 *
 * The evaluators' reports are their own work, not ours to adapt: a deep dive
 * summarises one in our own words, credits it and links to it, as with a
 * Forum linkpost (../explainer/sources.ts).
 *
 * `http` is injectable so the tests run without the site.
 */

import { htmlToText, type Candidate } from '../explainer/sources'
import { DE_TOP_CHARITIES } from './copy'

type Http = typeof fetch

export class CatalogueError extends Error {}

const ORIGIN = 'https://doneereffectief.nl'
// Says who is asking. (Doneer Effectief's server drops a "Mozilla/5.0 (compatible; …)" agent outright.)
const UA = 'ean-social (+https://effectiefaltruisme.nl)'

/** The evaluators Doneer Effectief relies on, by the host their reports are on. */
const EVALUATORS: [host: string, name: string][] = [
  ['givewell.org', 'GiveWell'],
  ['founderspledge.com', 'Founders Pledge'],
  ['givinggreen.earth', 'Giving Green'],
  ['animalcharityevaluators.org', 'Animal Charity Evaluators'],
  ['happierlivesinstitute.org', 'Happier Lives Institute'],
]

/** Doneer Effectief's causes in English; an unknown one keeps its Dutch name. */
const CAUSE_EN: Record<string, string> = {
  'armoede & gezondheid': 'Global health and poverty',
  klimaat: 'Climate',
  'dierenwelzijn & voedseltransitie': 'Animal welfare and food',
  vrouwenemancipatie: 'Women’s empowerment',
}

export type Report = { url: string; evaluator: string }

export type Charity = {
  /** The page's slug on doneereffectief.nl; the deep dive's source id. */
  slug: string
  name: string
  cause: string
  pageUrl: string
  /** "Aanbevolen door …" as the page says it, without those words. */
  recommendedBy: string | null
  /** Evaluators' pages about this charity, the linked research report first. */
  reports: Report[]
  /** What Doneer Effectief's own page says, in Dutch, for the drafter. */
  pageText: string
  /**
   * The charity's logo as Doneer Effectief's page shows it: the white version,
   * made for its coloured header, so the cover puts it on a teal panel
   * (./logo.ts). Null where the page has none.
   */
  logoUrl: string | null
}

const decode = (s: string) =>
  htmlToText(s)
    .replace(/&#0?38;/g, '&')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/\s+/g, ' ')
    .trim()

async function get(http: Http, url: string): Promise<string> {
  let res: Response
  try {
    res = await http(url, { headers: { 'user-agent': UA, accept: 'text/html' }, signal: AbortSignal.timeout(20_000) })
  } catch (err) {
    throw new CatalogueError(`Couldn’t reach ${new URL(url).host}: ${(err as Error).message}`)
  }
  if (!res.ok) throw new CatalogueError(`${new URL(url).host} answered ${res.status} for ${url}`)
  return res.text()
}

/** A page's <main>, without HTML comments (the theme leaves commented-out links in). */
function mainOf(html: string): string {
  const start = html.indexOf('<main')
  const end = start === -1 ? -1 : html.indexOf('</main>', start)
  return (start === -1 ? html : html.slice(start, end === -1 ? undefined : end)).replace(/<!--[\s\S]*?-->/g, '')
}

/**
 * A charity's or report's own content: its <main> without the news carousel,
 * whose links are about other things. On a charity's page the carousel sits
 * between the impact figure and the "Meer informatie" block with the report
 * buttons, so only the carousel is cut out.
 */
function body(html: string): string {
  const main = mainOf(html)
  const news = main.indexOf('news-slider-wrapper')
  if (news === -1) return main
  const after = main.indexOf('class="block more-information', news)
  return main.slice(0, news) + (after === -1 ? '' : `<div ${main.slice(after)}`)
}

/** The cause pages the overview links to. */
export function causeLinks(html: string): string[] {
  const out = new Set<string>()
  for (const m of mainOf(html).matchAll(/href="(?:https:\/\/doneereffectief\.nl)?(\/toporganisaties\/[a-z0-9-]+\/)"/g)) {
    out.add(`${ORIGIN}${m[1]}`)
  }
  return [...out]
}

/** The individual charities a cause page lists, in its order; its fund is left out. */
export function charityLinks(html: string): string[] {
  const out = new Set<string>()
  for (const m of mainOf(html).matchAll(/href="(?:https:\/\/doneereffectief\.nl)?(\/toporganisatie\/([a-z0-9-]+)\/)"/g)) {
    if (!m[2].startsWith('doneer-effectief')) out.add(`${ORIGIN}${m[1]}`)
  }
  return [...out]
}

const evaluatorOf = (url: URL) => EVALUATORS.find(([host]) => url.hostname === host || url.hostname.endsWith(`.${host}`))?.[1] ?? null

/**
 * A link as an evaluator's page about one charity, or null: not an evaluator,
 * its home page, its list of top charities, a spreadsheet or a PDF. Google's
 * redirect debris (`&sa=D&…`) and the fragment are dropped.
 */
export function reportFrom(href: string): Report | null {
  let url: URL
  try {
    url = new URL(href.trim().replace(/&(amp;)?sa=D.*$/, ''))
  } catch {
    return null
  }
  const evaluator = evaluatorOf(url)
  if (!evaluator) return null
  url.hash = ''
  url.protocol = 'https:'
  const path = url.pathname.replace(/\/+$/, '')
  if (!path || /\.pdf$/i.test(path) || /\/top-charities$/.test(path) || /^\/(funds|research)$/.test(path)) return null
  return { url: url.toString(), evaluator }
}

/** Only an upload on Doneer Effectief's own site is ever fetched as a logo. */
export const isLogoUrl = (url: unknown): url is string =>
  typeof url === 'string' && !url.includes('..') && /^https:\/\/doneereffectief\.nl\/wp-content\/uploads\/[\w\-./]+\.(png|svg)$/i.test(url)

/** One charity's page, read. Null if it isn't a charity's page at all (some old addresses answer with an empty page). */
export function parseCharity(html: string, pageUrl: string): Charity | null {
  const main = body(html)
  const name = decode(main.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '')
  if (!name) return null
  const causeNl = decode(main.match(/breadcrumb_last[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '')
  const label = decode(main.match(/class="rec-label[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '')
  const recommendedBy = label.replace(/^Aanbevolen door\s+/i, '').trim() || null

  const links = [...main.matchAll(/<a\s[^>]*?href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({
    report: reportFrom(m[1].replace(/&amp;/g, '&')),
    text: decode(m[2]),
  }))
  const logo = main.match(/<img\b[^>]*\bclass="logo"[^>]*>/)?.[0].match(/\bsrc="([^"]+)"/)?.[1] ?? ''
  const seen = new Set<string>()
  const reports = [
    // The button Doneer Effectief labels as the research report goes first.
    ...links.filter((l) => /onderzoeksrapport/i.test(l.text)),
    ...links,
  ]
    .map((l) => l.report)
    .filter((r): r is Report => !!r && !seen.has(r.url) && !!seen.add(r.url))

  return {
    slug: new URL(pageUrl).pathname.split('/').filter(Boolean).pop() ?? name,
    name,
    cause: CAUSE_EN[causeNl.toLowerCase()] ?? causeNl,
    pageUrl,
    recommendedBy,
    reports,
    pageText: htmlToText(main).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').slice(0, 12_000),
    logoUrl: isLogoUrl(logo) ? logo : null,
  }
}

/** Every individual charity Doneer Effectief currently recommends that has an evaluator's report to read. */
export async function topCharities(http: Http = fetch): Promise<{ charities: Charity[]; problems: string[] }> {
  const problems: string[] = []
  const causes = causeLinks(await get(http, DE_TOP_CHARITIES))
  if (!causes.length) throw new CatalogueError('Doneer Effectief’s overview lists no causes: its pages may have changed.')
  const pages: string[] = []
  for (const cause of causes) {
    try {
      for (const link of charityLinks(await get(http, cause))) if (!pages.includes(link)) pages.push(link)
    } catch (err) {
      problems.push((err as Error).message)
    }
  }
  const charities: Charity[] = []
  await Promise.all(
    pages.map(async (page, i) => {
      try {
        const charity = parseCharity(await get(http, page), page)
        if (!charity) return
        if (!charity.reports.length) problems.push(`${charity.name} has no evaluator’s report linked on its page, so it is left out.`)
        else charities[i] = charity
      } catch (err) {
        problems.push((err as Error).message)
      }
    }),
  )
  const found = charities.filter(Boolean)
  if (!found.length) throw new CatalogueError(['Found none of Doneer Effectief’s top charities.', ...problems].join(' '))
  return { charities: found, problems }
}

/** A charity as a deep dive's source: the charity is the title, the evaluator the author, the report the link. */
export function asCandidate(c: Charity, report: Report = c.reports[0], now = new Date()): Candidate {
  return {
    kind: 'charity',
    id: c.slug,
    url: report.url,
    title: c.name,
    author: report.evaluator,
    publishedAt: now.toISOString(),
    cause: c.cause,
    pageUrl: c.pageUrl,
    donateUrl: c.pageUrl,
    ...(c.logoUrl ? { logoUrl: c.logoUrl } : {}),
    score: 0,
    summary: '',
    topics: [c.cause],
  }
}

const MIN_REPORT = 2000

/**
 * The reports' text, for drafting: up to three of the evaluators' pages, each
 * cut at 45,000 characters. A page that can't be read (blocked, or drawn in
 * the browser) is skipped; with none readable there is nothing to summarise.
 */
export async function reportTexts(
  c: Charity,
  http: Http = fetch,
): Promise<{ read: (Report & { text: string })[]; problems: string[] }> {
  const problems: string[] = []
  const read: (Report & { text: string })[] = []
  for (const report of c.reports.slice(0, 5)) {
    if (read.length === 3) break
    try {
      const text = htmlToText(body(await get(http, report.url))).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n')
      if (text.length < MIN_REPORT) problems.push(`${report.url} came back almost empty, so it wasn’t used.`)
      else read.push({ ...report, text: text.slice(0, 45_000) })
    } catch (err) {
      problems.push((err as Error).message)
    }
  }
  if (!read.length) {
    throw new CatalogueError([`Couldn’t read any evaluator’s report on ${c.name}.`, ...problems].join(' '))
  }
  return { read, problems }
}
