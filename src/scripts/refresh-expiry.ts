/**
 * Re-dates listings that the old expiry rule retired too early.
 *
 * Until September 2026 the fallback expiry was `posted_at + 60 days`, measured
 * from the *employer's* posting date. ATS feeds routinely carry one months old,
 * so listings arrived in the review queue already expired: on 4 September every
 * one of the thirty-two drafts awaiting review had a date in the past, which
 * emptied the queue entirely once expired drafts were filtered out of it.
 *
 * `promote.ts` now measures from `first_seen_at`, so this cannot recur. This
 * script repairs the documents written before that.
 *
 * It does not simply push every date forward. A listing is only re-dated when
 * its apply URL still answers, because the whole point of an expiry date is to
 * keep dead vacancies off the board — reviving one that has closed would trade
 * an empty queue for a queue full of dead links, which is worse. Anything that
 * 404s keeps its date and stays out of the way.
 *
 *   npx tsx --env-file=.env.local src/scripts/refresh-expiry.ts --dry
 *   npx tsx --env-file=.env.local src/scripts/refresh-expiry.ts
 *
 * `--drafts` limits it to the review queue, which is the usual case.
 */

import { httpFetch } from '../jobboard/lib/http'
import { isSanityConfigured, writeClient } from '../jobboard/sanity/client'
import { log, main, num, parseArgs, printReport } from './_cli'

/** Same window promote.ts uses, so a repaired listing looks like a fresh one. */
const EXPIRY_DAYS = 60

type Row = {
  _id: string
  title: string
  applyUrl: string | null
  deadlineAt: string | null
  expiresAt: string | null
  firstSeen: string | null
}

void main(async () => {
  const args = parseArgs()
  const dry = args.flags.has('dry')
  const draftsOnly = args.flags.has('drafts')
  const limit = num(args, 'limit', Infinity)

  if (!isSanityConfigured) throw new Error('Sanity is not configured.')
  const client = writeClient()

  /*
    Only listings with no stated deadline are eligible.

    A real closing date came from the ad itself and is a fact about the vacancy;
    overriding it would be inventing one. Only the guessed dates are ours to
    correct.
  */
  const scope = draftsOnly ? '&& _id in path("drafts.**")' : ''
  const rows = await client.fetch<Row[]>(
    `*[_type == "jobListing" ${scope}
       && !defined(deadlineAt)
       && defined(expiresAt) && expiresAt < now()]{
         _id, title, applyUrl, deadlineAt, expiresAt
       }`,
  )

  const selected = Number.isFinite(limit) ? rows.slice(0, limit) : rows
  const report: Record<string, unknown> = {
    'mis-dated listings found': rows.length,
    checked: selected.length,
  }

  if (!selected.length) {
    printReport('Refresh expiry', { ...report, note: 'nothing to repair' })
    return
  }

  const fresh = new Date(Date.now() + EXPIRY_DAYS * 864e5).toISOString()
  const revived: string[] = []
  const leftAlone: string[] = []
  const unreachable: string[] = []

  for (const row of selected) {
    if (!row.applyUrl) {
      unreachable.push(`${row.title} (no apply URL)`)
      continue
    }
    let alive: boolean
    try {
      const res = await httpFetch(row.applyUrl, {
        method: 'HEAD',
        retries: 1,
        acceptStatuses: [404, 410, 403, 405],
      })
      alive = res.status !== 404 && res.status !== 410
    } catch {
      // Unreachable is not the same as closed; leave the date alone and say so
      // rather than reviving a listing on the strength of a network blip.
      unreachable.push(`${row.title} (fetch failed)`)
      continue
    }

    if (!alive) {
      leftAlone.push(row.title)
      continue
    }
    revived.push(row.title)
    if (!dry) await client.patch(row._id).set({ expiresAt: fresh }).commit()
  }

  printReport(dry ? 'Refresh expiry (dry run)' : 'Refresh expiry', {
    ...report,
    're-dated (still advertised)': revived.length,
    'left expired (404/410)': leftAlone.length,
    'could not check': unreachable.length,
    'new expiry': fresh.slice(0, 10),
  })

  for (const t of revived.slice(0, 30)) log(`  re-dated  ${t}`)
  for (const t of leftAlone.slice(0, 15)) log(`  dead      ${t}`)
  for (const t of unreachable.slice(0, 10)) log(`  unchecked ${t}`)
})
