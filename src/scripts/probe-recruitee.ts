/**
 * Find which watchlist employers run Recruitee (or Homerun).
 *
 * Both are Amsterdam-built and dominant among exactly the employers this board
 * cares about — Dutch NGOs, foundations and mission-driven mid-size
 * organisations — and the board had *zero* Recruitee sources configured while
 * carrying an adapter for it. That is the cheapest coverage available: a public
 * JSON endpoint, no auth, no crawl delay.
 *
 * Slugs are guessed from each employer's name and website and then confirmed
 * against the live API, so a hit is proof rather than a hypothesis. Guessing is
 * acceptable here in a way it was not for careers pages, because the endpoint
 * either returns a job array or it does not — there is no ambiguous 404 that
 * might mean "no openings".
 *
 *   npx tsx src/scripts/probe-recruitee.ts
 *   npx tsx src/scripts/probe-recruitee.ts --slugs=wemos,partos
 */

import { SEED_EMPLOYERS } from '../jobboard/seed/employers'
import { fetchJsonOptional } from '../jobboard/lib/http'
import { log, main, parseArgs, printReport } from './_cli'

/** Slug candidates for one employer, most likely first. */
function candidateSlugs(name: string, website?: string): string[] {
  const out = new Set<string>()
  const clean = (v: string) =>
    v
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/&/g, 'en')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  // The registrable name is the best single guess: Recruitee subdomains are
  // almost always the organisation's own short name.
  if (website) {
    try {
      const host = new URL(website).hostname.replace(/^www\./, '')
      out.add(clean(host.split('.')[0]))
    } catch {
      /* ignore an unparseable website */
    }
  }

  const base = clean(name)
  out.add(base)
  out.add(base.replace(/-/g, ''))
  // Drop a trailing legal or descriptive suffix: "ProVeg Nederland" is
  // proveg on Recruitee, not proveg-nederland.
  const trimmed = base.replace(/-(nederland|netherlands|nl|europe|foundation|stichting)$/, '')
  if (trimmed !== base) out.add(trimmed)
  // And the leading article Dutch names often carry.
  out.add(base.replace(/^(de|het|the)-/, ''))

  return [...out].filter((s) => s.length >= 3 && s.length <= 40)
}

type Offer = { title?: string; status?: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Recruitee does rate-limit, contrary to its reputation.
 *
 * Probing slugs back to back earns a 429 within about sixty requests, and
 * `fetchJsonOptional` only swallows 403 and 404 — a 429 throws and killed the
 * whole run. Since this walks many candidate slugs per employer, most of which
 * do not exist, it is a burst-shaped workload and needs pacing.
 *
 * A 429 returns `undefined` rather than `null`: "I could not tell" is different
 * from "there is no board here", and reporting a throttled probe as a confirmed
 * absence would quietly write an employer off.
 */
async function probeRecruitee(slug: string): Promise<Offer[] | null | undefined> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const data = await fetchJsonOptional<{ offers?: Offer[] }>(
        `https://${slug}.recruitee.com/api/offers/`,
      )
      return data?.offers ?? null
    } catch (err) {
      if (!/HTTP 429/.test((err as Error).message)) return null
      await sleep(2000 * (attempt + 1))
    }
  }
  return undefined
}

async function run() {
  const args = parseArgs()
  const only = (args.values.get('slugs') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const targets = only.length
    ? only.map((slug) => ({ id: slug, name: slug, slugs: [slug] }))
    : SEED_EMPLOYERS
        // Only employers we have no feed for. An employer already on a working
        // ATS does not need a second source competing to supply the same jobs.
        .filter((e) => e.active !== false && !e.ats)
        .map((e) => ({ id: e.id, name: e.name, slugs: candidateSlugs(e.name, e.website) }))

  log(`probing ${targets.length} employer(s) with no configured feed…`)

  const found: string[] = []
  const empty: string[] = []
  const throttled: string[] = []

  for (const t of targets) {
    for (const slug of t.slugs) {
      await sleep(400)
      const offers = await probeRecruitee(slug)
      if (offers === undefined) {
        throttled.push(`${t.id} (${slug}) — throttled, unknown`)
        break
      }
      if (offers === null) continue
      const open = offers.filter((o) => (o.status ?? 'published') === 'published')
      const line = `${t.id.padEnd(30)} recruitee:${slug}  ${open.length} open`
      if (open.length > 0) {
        found.push(`${line}\n${open.slice(0, 3).map((o) => `      · ${o.title}`).join('\n')}`)
      } else {
        // A real board with nothing open today is still worth wiring: it will
        // have something next month, and confirming the slug now is the work.
        empty.push(line)
      }
      break
    }
  }

  printReport('Recruitee probe', {
    probed: targets.length,
    'boards with open roles': found,
    'boards confirmed but empty today': empty,
    'throttled — status unknown, rerun': throttled,
  })
}

void main(run)
