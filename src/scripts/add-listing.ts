/**
 * Puts one programme or job on the board from its URL, for listings no source
 * carries.
 *
 * Without --write it fetches the page and shows what would be ingested and
 * what stage one makes of it, writing nothing. With --write it adds the entry
 * to the `manual` source in the database and ingests that source, so the next
 * classify and promote runs take it to the review queue like any other
 * listing. To keep it in the code as well, copy the printed entry into
 * src/jobboard/seed/manual-listings.ts; `npm run seed` keeps database-only
 * entries either way.
 *
 *   npx tsx src/scripts/add-listing.ts --url=https://steadrise.org/executive-catalyst \
 *     --title="Executive Catalyst: Ops & Strategy" --employer=SteadRise --kind=programme --location=Remote
 *   npx tsx --env-file=.env.local src/scripts/add-listing.ts ... --write
 *
 * Optional: --apply-url, --employer-id, --country=NL, --deadline=YYYY-MM-DD,
 * --pay="$8,500 per month", --summary="One line for the classifier".
 */

import { stage1 } from '../jobboard/classify/stage1'
import { getDb } from '../jobboard/db/client'
import { manualEntryProblem, manualExternalId, manualListings, type ManualListing } from '../jobboard/ingest/adapters/manual'
import { runIngest } from '../jobboard/ingest/run'
import type { AdapterContext, NormalisedListing } from '../jobboard/ingest/types'
import { log, main, parseArgs, printReport } from './_cli'

const SOURCE_ID = 'manual'

void main(async () => {
  const args = parseArgs()
  const v = (key: string) => args.values.get(key)?.trim() || undefined
  const entry = Object.fromEntries(
    Object.entries({
      url: v('url'),
      title: v('title'),
      employerName: v('employer'),
      employerId: v('employer-id'),
      kind: v('kind'),
      applyUrl: v('apply-url'),
      location: v('location'),
      country: v('country')?.toUpperCase(),
      deadline: v('deadline'),
      pay: v('pay'),
      summary: v('summary'),
      addedOn: new Date().toISOString().slice(0, 10),
    }).filter(([, value]) => value !== undefined),
  ) as ManualListing
  const problem = manualEntryProblem(entry)
  if (problem) throw new Error(`${problem}. Usage: --url=… --title=… --employer=… [--kind=programme]`)

  // The same fetch and normalise the nightly run does, against this entry alone.
  const memory = new Map<string, unknown>()
  const config = { listings: [entry] }
  const ctx: AdapterContext = {
    source: {
      id: SOURCE_ID,
      kind: 'manual',
      adapter: 'manual',
      config,
      employer_id: null,
      employer_name: null,
      enabled: true,
      returns_complete_set: false,
      last_run_at: null,
    },
    log,
    deadline: Date.now() + 60_000,
    cache: {
      get: async <T>(key: string) => (memory.get(key) as T) ?? null,
      set: async (key, value) => void memory.set(key, value),
    },
    markIncomplete: () => {},
  }
  let listing: NormalisedListing | null = null
  for await (const raw of manualListings.fetch(config, ctx)) listing = manualListings.normalise(raw, config)
  if (!listing) throw new Error('nothing to ingest — is the deadline already past?')

  const verdict = stage1({
    id: 0,
    title: listing.title,
    employer_name: listing.employerName,
    location_raw: listing.locationRaw,
    country: listing.country,
    description: listing.description,
    salary_max: listing.salaryMax,
    salary_currency: listing.salaryCurrency,
    employer: null,
    listing_kind: listing.listingKind ?? 'job',
  })
  console.log(JSON.stringify({ entry, ...listing, description: undefined, descriptionChars: listing.description?.length ?? 0, stage1: verdict }, null, 2))

  if (!args.flags.has('write')) {
    console.log('\nPreview only, nothing written. Add --write to put it in the pipeline.\n')
    return
  }

  const db = await getDb()
  const { rows } = await db.query<{ config: Record<string, unknown> }>(
    'select config from source where id = $1',
    [SOURCE_ID],
  )
  if (!rows[0]) throw new Error(`no "${SOURCE_ID}" source in the database yet — run npm run seed first`)
  const id = manualExternalId(entry)
  const others = ((rows[0].config.listings as ManualListing[] | undefined) ?? []).filter(
    (e) => manualExternalId(e) !== id,
  )
  await db.query(
    `update source set config = config || jsonb_build_object('listings', $2::jsonb) where id = $1`,
    [SOURCE_ID, JSON.stringify([...others, entry])],
  )

  const report = await runIngest({ sourceIds: [SOURCE_ID], skipClosure: true, budgetMs: 120_000, onLog: log })
  printReport('Added', { ...report.totals, failed: report.results.filter((r) => !r.ok).map((r) => r.error) })
  console.log('Classify and promote take it from here (or run npm run classify, then npm run promote).\n')
  await db.close()
})
