/**
 * Runs the two-stage classifier.
 *
 *   npm run classify
 *   npm run classify -- --limit=100
 *   npm run classify -- --skip-notes    # cheap: triage only, no note drafting
 *   npm run classify -- --force         # re-classify already-classified listings
 *   npm run classify -- --force --ids=61,74,78,79   # re-check specific listings only
 *
 * Requires ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, or an `ant auth login`
 * profile. Stage one costs nothing and runs regardless.
 */

import { runClassification } from '../jobboard/classify/run'
import { getDb } from '../jobboard/db/client'
import { DRAFTING_MODEL, TRIAGE_MODEL } from '../jobboard/lib/anthropic'
import { log, main, num, parseArgs, printReport } from './_cli'

void main(async () => {
  const args = parseArgs()
  console.log(`triage model:   ${TRIAGE_MODEL}`)
  console.log(`drafting model: ${DRAFTING_MODEL}\n`)

  const idsRaw = args.values.get('ids')
  const report = await runClassification({
    limit: num(args, 'limit', 200),
    force: args.flags.has('force'),
    ids: idsRaw ? idsRaw.split(',').map(Number) : undefined,
    skipNotes: args.flags.has('skip-notes'),
    budgetMs: num(args, 'budget', 900) * 1000,
    onLog: log,
  })

  printReport('Classification', {
    considered: report.considered,
    'dropped at stage 1': report.stage1Rejected,
    classified: report.classified,
    'above threshold': report.promotable,
    'near misses (score 3)': report.nearMisses,
    'gate violations stripped': report.gateViolations,
    'input tokens': report.usage.input,
    'output tokens': report.usage.output,
    'cache reads': report.usage.cacheRead,
    errors: report.errors.map((e) => `#${e.listingId}: ${e.message}`),
  })

  if (report.nearMisses > 0) {
    console.log(
      `${report.nearMisses} listing(s) scored exactly 3. Review the near-misses monthly — ` +
        'that is where threshold calibration actually happens (§8.3).\n',
    )
  }

  await (await getDb()).close()
})
