/**
 * Auto-unpublishes listings past their expiry, and link-checks crawl sources.
 *
 *   npm run expire
 *   npm run expire -- --dry-run
 *   npm run expire -- --linkcheck
 *
 * A job board full of dead links is worse than no job board, and this is the
 * most common way small boards rot (§7.8).
 */

import { getDb } from '../jobboard/db/client'
import { checkDeadLinks } from '../jobboard/ingest/run'
import { runExpiry } from '../jobboard/sanity/promote'
import { log, main, num, parseArgs, printReport } from './_cli'

void main(async () => {
  const args = parseArgs()

  if (args.flags.has('linkcheck')) {
    const report = await checkDeadLinks(num(args, 'limit', 100))
    printReport('Link check', report)
  } else {
    const report = await runExpiry({ dryRun: args.flags.has('dry-run'), onLog: log })
    printReport(args.flags.has('dry-run') ? 'Expiry (dry run)' : 'Expiry', report)
  }

  await (await getDb()).close()
})
