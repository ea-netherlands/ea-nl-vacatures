/**
 * Runs the ingestion pipeline.
 *
 *   npm run ingest                          # all enabled sources
 *   npm run ingest -- --source=wvn-sitemap  # one source (repeatable)
 *   npm run ingest -- --discover            # also harvest employers from the EA boards
 *   npm run ingest -- --budget=600          # seconds of wall clock
 */

import { getDb } from '../jobboard/db/client'
import { runIngest } from '../jobboard/ingest/run'
import { adapterIds } from '../jobboard/ingest/registry'
import { log, main, num, parseArgs, printReport } from './_cli'

void main(async () => {
  const args = parseArgs()
  if (args.flags.has('list')) {
    console.log(`adapters: ${adapterIds().join(', ')}`)
    return
  }

  const sourceIds = [
    ...(args.values.get('source') ? [args.values.get('source')!] : []),
    ...args.positional,
  ]

  const report = await runIngest({
    sourceIds: sourceIds.length ? sourceIds : undefined,
    budgetMs: num(args, 'budget', 600) * 1000,
    discover: args.flags.has('discover'),
    onLog: log,
  })

  printReport('Ingest', {
    ...report.totals,
    sources: report.results.length,
    failed: report.results.filter((r) => !r.ok).map((r) => `${r.sourceId}: ${r.error}`),
    discovered: report.discovered.length,
  })

  for (const r of report.results) {
    console.log(
      `${r.ok ? ' ok ' : 'FAIL'}  ${r.sourceId.padEnd(28)} ` +
        `fetched ${String(r.fetched).padStart(4)}  new ${String(r.inserted).padStart(4)}  ` +
        `updated ${String(r.updated).padStart(4)}  closed ${String(r.closed).padStart(3)}`,
    )
  }
  console.log('')

  await (await getDb()).close()
})
