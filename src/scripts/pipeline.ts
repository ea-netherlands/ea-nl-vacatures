/**
 * Runs the whole pipeline end to end: ingest → classify → promote.
 *
 *   npm run pipeline
 *   npm run pipeline -- --dry-run     # no Sanity writes
 *   npm run pipeline -- --skip-notes  # cheap pass, for threshold calibration
 *
 * Convenience for local runs and for M3, where the point is to get a week of
 * real ingested data through the classifier before wiring anything into Sanity.
 */

import { runClassification } from '../jobboard/classify/run'
import { getDb } from '../jobboard/db/client'
import { runIngest } from '../jobboard/ingest/run'
import { runPromotion } from '../jobboard/sanity/promote'
import { log, main, num, parseArgs, printReport } from './_cli'

void main(async () => {
  const args = parseArgs()

  const ingest = await runIngest({
    budgetMs: num(args, 'budget', 900) * 1000,
    discover: args.flags.has('discover'),
    onLog: log,
  })
  printReport('1/3 Ingest', {
    ...ingest.totals,
    failed: ingest.results.filter((r) => !r.ok).map((r) => `${r.sourceId}: ${r.error}`),
  })

  const classify = await runClassification({
    limit: num(args, 'limit', 200),
    skipNotes: args.flags.has('skip-notes'),
    onLog: log,
  })
  printReport('2/3 Classify', {
    considered: classify.considered,
    'dropped at stage 1': classify.stage1Rejected,
    classified: classify.classified,
    'above threshold': classify.promotable,
    'near misses': classify.nearMisses,
  })

  const promote = await runPromotion({ dryRun: args.flags.has('dry-run'), onLog: log })
  printReport('3/3 Promote', {
    considered: promote.considered,
    promoted: promote.promoted,
    'employers created': promote.employersCreated,
  })

  await (await getDb()).close()
})
