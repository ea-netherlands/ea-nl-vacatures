/**
 * Promotes the shortlist into Sanity as drafts.
 *
 *   npm run promote -- --dry-run    # see what would be promoted, no writes
 *   npm run promote
 *
 * Every promoted listing lands as a draft in the review queue with
 * whyThisMattersNl pre-filled, except roles 80,000 Hours or Probably Good
 * already list, which are published straight away (autoPublishes).
 */

import { getDb } from '../jobboard/db/client'
import { runPromotion } from '../jobboard/sanity/promote'
import { log, main, num, parseArgs, printReport } from './_cli'

void main(async () => {
  const args = parseArgs()
  const report = await runPromotion({
    limit: num(args, 'limit', 50),
    dryRun: args.flags.has('dry-run'),
    onLog: log,
  })

  printReport(report.dryRun ? 'Promotion (dry run)' : 'Promotion', {
    considered: report.considered,
    promoted: report.promoted,
    'auto-published': report.autoPublished,
    'below threshold on recheck': report.skippedBelowThreshold,
    'employers created': report.employersCreated,
    errors: report.errors.map((e) => `#${e.listingId}: ${e.message}`),
  })

  if (!report.dryRun && report.promoted > 0) {
    console.log('Review them at /studio → Job board → Review\n')
  }

  await (await getDb()).close()
})
