/**
 * Publishes the drafts already in the review queue that auto-publish now
 * covers: roles 80,000 Hours or Probably Good list, NL-eligible, above the
 * promotion threshold (publishTrustedDrafts in sanity/promote.ts).
 *
 *   npm run publish-trusted-drafts -- --dry-run    # list them, no writes
 *   npm run publish-trusted-drafts
 */

import { getDb } from '../jobboard/db/client'
import { publishTrustedDrafts } from '../jobboard/sanity/promote'
import { log, main, parseArgs, printReport } from './_cli'

void main(async () => {
  const args = parseArgs()
  const report = await publishTrustedDrafts({ dryRun: args.flags.has('dry-run'), onLog: log })

  printReport(report.dryRun ? 'Publish trusted drafts (dry run)' : 'Publish trusted drafts', {
    'drafts matching the rule': report.considered,
    published: report.published,
    'left in the queue': report.leftInQueue.map((l) => `#${l.listingId}: ${l.reason}`),
  })

  await (await getDb()).close()
})
