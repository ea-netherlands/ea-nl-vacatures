/**
 * Sets `listedByEaBoard` on every jobListing document, drafts included, from
 * the pipeline: true when 80,000 Hours, Probably Good or EA Opportunities
 * lists any copy of the role (same dedup key). Promotion writes the field on
 * new listings; this covers the ones promoted before November 2026, when the
 * field decided nothing. See lib/bands.ts for why it now files a role under
 * vetted organisations.
 *
 * Safe to rerun: it only patches documents whose value would change.
 *
 *   npx tsx --env-file=<checkout>/.env.local src/scripts/backfill-ea-board.ts --dry-run
 *   npx tsx --env-file=<checkout>/.env.local src/scripts/backfill-ea-board.ts
 */

import { getDb } from '../jobboard/db/client'
import { writeClient } from '../jobboard/sanity/client'
import { log, main, parseArgs, printReport } from './_cli'

void main(async () => {
  const dryRun = parseArgs().flags.has('dry-run')
  const client = writeClient()
  const db = await getDb()

  const docs = await client.fetch<{ _id: string; title: string; pipelineListingId: number; listedByEaBoard: boolean | null }[]>(
    '*[_type == "jobListing" && defined(pipelineListingId)]{_id, title, pipelineListingId, listedByEaBoard}',
  )
  const ids = [...new Set(docs.map((d) => d.pipelineListingId))]
  // Closed copies count too: the role was on an EA board, which is what says
  // the organisation is EA-vetted, whether or not that copy is still open.
  const { rows } = await db.query<{ id: number; listed: boolean }>(
    `select l.id,
            exists (select 1 from listing l2 join source s on s.id = l2.source_id
                     where l2.dedup_key = l.dedup_key and s.kind = 'ea-board') as listed
       from listing l
      where l.id = any($1::int[])`,
    [ids],
  )
  const listed = new Map(rows.map((r) => [Number(r.id), r.listed]))

  let patched = 0
  let unchanged = 0
  const missing: string[] = []
  let tx = client.transaction()
  for (const d of docs) {
    const value = listed.get(d.pipelineListingId)
    if (value === undefined) {
      missing.push(`${d._id} (#${d.pipelineListingId})`)
      continue
    }
    // GROQ returns null for a field never set, which already reads as false.
    if ((d.listedByEaBoard ?? false) === value) {
      unchanged++
      continue
    }
    patched++
    if (value) log(`${dryRun ? 'would mark' : 'marking'} ${d._id} — ${d.title}`)
    tx = tx.patch(d._id, (p) => p.set({ listedByEaBoard: value }))
  }
  if (!dryRun && patched) await tx.commit({ visibility: 'async' })

  printReport(dryRun ? 'Backfill listedByEaBoard (dry run)' : 'Backfill listedByEaBoard', {
    documents: docs.length,
    patched,
    unchanged,
    'no pipeline row': missing,
  })
  await db.close()
})
