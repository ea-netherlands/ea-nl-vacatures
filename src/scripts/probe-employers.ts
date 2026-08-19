/**
 * Probe candidate employers for a machine-readable careers feed.
 *
 * Extending the watchlist is the single highest-value thing a curator does —
 * "the watchlist is the asset, not the code" (Appendix A) — but adding an
 * employer is only half the job. An entry with no ATS is an entry the pipeline
 * cannot poll, so it sits in the seed looking like coverage while contributing
 * nothing. This tells you which candidates are wired up and which need a crawl
 * adapter or a relationship before they are worth adding.
 *
 * It fetches each careers page and looks for the fingerprints an applicant
 * tracking system leaves behind: an embedded widget, a redirect, or an outbound
 * apply link on a known host. Read-only, one request per candidate, and it
 * writes nothing — the output is a table you paste decisions from.
 *
 *   npx tsx src/scripts/probe-employers.ts            # the built-in candidate list
 *   npx tsx src/scripts/probe-employers.ts --url=https://example.org/jobs
 */

import { detectAts } from '../jobboard/ingest/adapters/ea-boards'
import { findJobPosting } from '../jobboard/ingest/adapters/jsonld'
import { fetchText } from '../jobboard/lib/http'
import { log, main, parseArgs, printReport } from './_cli'

/**
 * Host fragments that identify an ATS even when it is embedded in the page
 * rather than linked to. `detectAts` works on an apply URL; these catch the
 * common case where the careers page iframes or fetches its board instead.
 */
const EMBED_SIGNATURES: { pattern: RegExp; ats: string }[] = [
  { pattern: /boards\.greenhouse\.io\/embed\/job_board\?for=([a-z0-9_-]+)/i, ats: 'greenhouse' },
  { pattern: /(?:job-boards|boards)\.greenhouse\.io\/([a-z0-9_-]+)/i, ats: 'greenhouse' },
  { pattern: /jobs\.ashbyhq\.com\/([a-z0-9_.-]+)/i, ats: 'ashby' },
  { pattern: /jobs\.lever\.co\/([a-z0-9_-]+)/i, ats: 'lever' },
  { pattern: /apply\.workable\.com\/([a-z0-9_-]+)/i, ats: 'workable' },
  { pattern: /([a-z0-9-]+)\.recruitee\.com/i, ats: 'recruitee' },
  { pattern: /([a-z0-9-]+)\.homerun\.co/i, ats: 'homerun' },
  { pattern: /([a-z0-9-]+)\.teamtailor\.com/i, ats: 'teamtailor' },
  { pattern: /([a-z0-9-]+)\.jobs\.personio\.(?:de|com)/i, ats: 'personio' },
  { pattern: /jobs\.smartrecruiters\.com\/([a-z0-9_-]+)/i, ats: 'smartrecruiters' },
  { pattern: /([a-z0-9-]+)\.bamboohr\.com/i, ats: 'bamboohr' },
  { pattern: /([a-z0-9-]+)\.myworkdayjobs\.com/i, ats: 'workday' },
  { pattern: /([a-z0-9-]+)\.breezy\.hr/i, ats: 'breezy' },
]

/**
 * Structured-data and feed fingerprints. An employer with JSON-LD JobPostings
 * needs no ATS integration at all — the generic jsonld adapter can read it —
 * which makes this as valuable a result as finding a supported ATS.
 */
function detectFeeds(html: string): string[] {
  const found: string[] = []
  if (/"@type"\s*:\s*"JobPosting"/i.test(html)) found.push('json-ld JobPosting')
  if (/application\/ld\+json/i.test(html)) found.push('json-ld present')
  if (/<link[^>]+type="application\/(rss|atom)\+xml"/i.test(html)) found.push('rss/atom')
  return found
}

type Candidate = { id: string; name: string; careersUrl: string; home: string }

/**
 * Finds an organisation's careers page from its homepage.
 *
 * The first version of this script guessed URLs from common patterns
 * (`/vacatures`, `/careers`, `/jobs`) and nineteen of thirty-one came back 404.
 * Guessing is the wrong instrument: every site words it differently — "werken
 * bij", "kom bij ons werken", "join us", "over ons/vacatures" — and a 404 is
 * indistinguishable from an organisation that simply has no openings. Reading
 * the homepage's own navigation finds the page the organisation actually uses.
 */
async function findCareersUrl(home: string): Promise<string | null> {
  let html: string
  try {
    html = await fetchText(home)
  } catch {
    return null
  }

  const scored: { url: string; score: number }[] = []
  for (const m of html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,120}?)<\/a>/gi)) {
    const [, href, label] = m
    const text = label.replace(/<[^>]+>/g, ' ').toLowerCase()
    let url: URL
    try {
      url = new URL(href, home)
    } catch {
      continue
    }
    const path = url.pathname.toLowerCase()

    // Link text is the stronger signal — a nav item reading "werken bij" is a
    // careers page even when the path is /over-ons/1234 — but path words catch
    // the sites whose nav is rendered by script.
    let score = 0
    if (/\b(vacature|vacancies|vacancy|careers?|jobs?)\b/.test(text)) score += 3
    if (/werken bij|kom bij ons|join (us|our team)|work (with|for) us|word collega/.test(text))
      score += 3
    if (/\/(vacature|vacancies|vacancy|careers?|jobs?|werken-bij|work-with-us)/.test(path))
      score += 2
    if (url.hostname !== new URL(home).hostname) score -= 1
    if (score > 0) scored.push({ url: url.toString(), score })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.url ?? null
}

/**
 * Candidates found by sweeping the Dutch landscape against the five cause
 * areas. Deliberately includes organisations we may decide not to list: the
 * point of the probe is to learn what is *pollable*, and the judgement about
 * whether a role there belongs on the board is made per listing by the
 * classifier, not here.
 */
const CANDIDATES: Candidate[] = [
  // --- movement building (the thinnest area: 2 seeded) ---
  { id: 'school-for-moral-ambition', name: 'School for Moral Ambition', careersUrl: '', home: 'https://www.moralambition.org' },
  { id: 'giving-what-we-can', name: 'Giving What We Can', careersUrl: '', home: 'https://www.givingwhatwecan.org' },
  { id: 'ea-nederland', name: 'Effectief Altruïsme Nederland', careersUrl: '', home: 'https://effectiefaltruisme.nl' },
  { id: 'probably-good', name: 'Probably Good', careersUrl: '', home: 'https://probablygood.org' },

  // --- better futures (7 seeded) ---
  { id: 'bits-of-freedom', name: 'Bits of Freedom', careersUrl: '', home: 'https://www.bitsoffreedom.nl' },
  { id: 'algorithm-audit', name: 'Algorithm Audit', careersUrl: '', home: 'https://algorithmaudit.eu' },
  { id: 'waag', name: 'Waag Futurelab', careersUrl: '', home: 'https://waag.org' },
  { id: 'open-state-foundation', name: 'Open State Foundation', careersUrl: '', home: 'https://openstate.eu' },
  { id: 'college-rechten-mens', name: 'College voor de Rechten van de Mens', careersUrl: '', home: 'https://www.mensenrechten.nl' },
  { id: 'tilburg-tilt', name: 'Tilburg University — TILT', careersUrl: '', home: 'https://www.tilburguniversity.edu' },

  // --- global catastrophic risks (27 seeded, but thin on nuclear) ---
  { id: 'pax', name: 'PAX voor Vrede', careersUrl: '', home: 'https://paxvoorvrede.nl' },
  { id: 'asser-instituut', name: 'T.M.C. Asser Instituut', careersUrl: '', home: 'https://www.asser.nl' },
  { id: 'leiden-isga', name: 'Universiteit Leiden — ISGA', careersUrl: '', home: 'https://www.universiteitleiden.nl' },
  { id: 'nctv', name: 'NCTV — Nationaal Coördinator Terrorismebestrijding', careersUrl: '', home: 'https://www.werkenvoornederland.nl' },

  // --- global health and wellbeing (24 seeded) ---
  { id: 'access-to-medicine', name: 'Access to Medicine Foundation', careersUrl: '', home: 'https://accesstomedicinefoundation.org' },
  { id: 'kncv-tuberculosefonds', name: 'KNCV Tuberculosefonds', careersUrl: '', home: 'https://www.kncvtbc.org' },
  { id: 'wemos', name: 'Wemos', careersUrl: '', home: 'https://www.wemos.org' },
  { id: 'simavi', name: 'Simavi', careersUrl: '', home: 'https://simavi.org' },
  { id: 'rutgers', name: 'Rutgers', careersUrl: '', home: 'https://rutgers.international' },
  { id: 'amref-nederland', name: 'Amref Flying Doctors Nederland', careersUrl: '', home: 'https://www.amref.nl' },
  { id: 'oxfam-novib', name: 'Oxfam Novib', careersUrl: '', home: 'https://www.oxfamnovib.nl' },
  { id: 'war-child', name: 'War Child', careersUrl: '', home: 'https://www.warchild.nl' },
  { id: 'light-for-the-world', name: 'Light for the World', careersUrl: '', home: 'https://www.light-for-the-world.org' },

  // --- farmed animal welfare (20 seeded, missing most Dutch alt-protein) ---
  { id: 'meatable', name: 'Meatable', careersUrl: '', home: 'https://meatable.com' },
  { id: 'those-vegan-cowboys', name: 'Those Vegan Cowboys', careersUrl: '', home: 'https://thosevegancowboys.com' },
  { id: 'willicroft', name: 'Willicroft', careersUrl: '', home: 'https://www.willicroft.com' },
  { id: 'farmless', name: 'Farmless', careersUrl: '', home: 'https://www.farmless.bio' },
  { id: 'vivera', name: 'Vivera', careersUrl: '', home: 'https://www.vivera.com' },
  { id: 'varkens-in-nood', name: 'Varkens in Nood', careersUrl: '', home: 'https://www.varkensinnood.nl' },
  { id: 'eyes-on-animals', name: 'Eyes on Animals', careersUrl: '', home: 'https://www.eyesonanimals.com' },
  { id: 'animal-rights-nl', name: 'Animal Rights', careersUrl: '', home: 'https://www.animalrights.nl' },
]

async function probe() {
  const args = parseArgs()
  const one = args.values.get('url')
  const list: Candidate[] = one
    ? [{ id: 'ad-hoc', name: one, careersUrl: '', home: one }]
    : CANDIDATES

  const pollable: string[] = []
  const jsonLdOnly: string[] = []
  const needsWork: string[] = []
  const unreachable: string[] = []

  /*
    Infrastructure subdomains that match the shape of an ATS token without
    being one. Homerun and Teamtailor tokens are whole hostnames, so their
    asset and feed hosts — cdn.homerun.co, static.homerun.co, feed.homerun.co —
    look exactly like a customer board to a pattern match. Polling one finds
    nothing, forever, while the seed entry claims the employer is covered.
  */
  const GENERIC_SUBDOMAINS = new Set([
    'cdn',
    'www',
    'assets',
    'static',
    'media',
    'img',
    'feed',
    'feeds',
    'api',
    'app',
    'embed',
    'widget',
  ])

  for (const c of list) {
    try {
      const careersUrl = c.careersUrl || (await findCareersUrl(c.home))
      if (!careersUrl) {
        needsWork.push(`${c.id.padEnd(30)} no careers link found on ${c.home}`)
        continue
      }
      const html = await fetchText(careersUrl)

      let hit: { ats: string; token: string } | null = null
      for (const sig of EMBED_SIGNATURES) {
        const m = html.match(sig.pattern)
        // `cdn.homerun.co` is Homerun's asset host, not a board: a token like
        // "cdn" or "assets" means the pattern matched infrastructure rather
        // than the employer, and polling it would 404 forever.
        if (m && !GENERIC_SUBDOMAINS.has(m[1].toLowerCase())) {
          hit = { ats: sig.ats, token: m[1] }
          break
        }
      }
      // Fall back to reading outbound apply links, which catches the case where
      // the board is linked rather than embedded.
      if (!hit) {
        for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/gi)) {
          const found = detectAts(m[1])
          // Same guard as above: Homerun and Teamtailor tokens are whole
          // hostnames, so an asset host like static.homerun.co matches the
          // shape of a real board while pointing at nobody's jobs.
          if (found && !GENERIC_SUBDOMAINS.has(found.token.split('.')[0].toLowerCase())) {
            hit = found
            break
          }
        }
      }

      /*
        The real test for `jsonld-careers`.

        That adapter crawls an index page and reads JobPosting markup from each
        job's own page, so what matters is not whether the careers page has
        structured data — it usually has Organization or WebSite schema, which
        is useless here — but whether the individual listings do. Checking the
        index only would mark a workable employer as needing bespoke code.
      */
      let detailJobPosting: string | null = null
      const jobLinks = new Set<string>()
      const careersHost = new URL(careersUrl).hostname
      for (const m of html.matchAll(/href="([^"]+)"/gi)) {
        try {
          const u: URL = new URL(m[1], careersUrl)
          if (u.hostname !== careersHost) continue
          if (u.toString() === careersUrl) continue
          if (/\/(vacature|vacancies|vacancy|job|career|werken)[^/]*\/[^/]+/i.test(u.pathname)) {
            jobLinks.add(u.toString())
          }
        } catch {
          /* skip unparseable hrefs */
        }
      }
      for (const link of [...jobLinks].slice(0, 2)) {
        try {
          if (findJobPosting(await fetchText(link))) {
            detailJobPosting = link
            break
          }
        } catch {
          /* a dead link tells us nothing either way */
        }
      }

      const feeds = detectFeeds(html)
      if (hit) {
        pollable.push(`${c.id.padEnd(28)} ${hit.ats}:${hit.token}  ${careersUrl}`)
      } else if (detailJobPosting || feeds.includes('json-ld JobPosting')) {
        jsonLdOnly.push(
          `${c.id.padEnd(28)} ${careersUrl}${detailJobPosting ? `  [detail ok: ${detailJobPosting.slice(0, 60)}]` : ''}`,
        )
      } else {
        needsWork.push(
          `${c.id.padEnd(28)} ${careersUrl}${feeds.length ? ` (${feeds.join(', ')})` : ''}`,
        )
      }
    } catch (error) {
      unreachable.push(`${c.id.padEnd(30)} ${(error as Error).message.slice(0, 60)}`)
    }
  }

  printReport('Employer feed probe', {
    candidates: list.length,
    'ready to poll': pollable,
    'json-ld only (generic adapter)': jsonLdOnly,
    'needs a crawl adapter or contact': needsWork,
    unreachable,
  })
  log(
    '\nOnly the first two groups can be added with a working feed today. The third\n' +
      'is worth adding with ats: null ONLY if someone will chase a feed — otherwise\n' +
      'it is coverage on paper and nothing on the board.\n',
  )
}

void main(probe)
