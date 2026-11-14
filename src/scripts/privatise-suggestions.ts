/**
 * Moves reader feedback stored under public ids onto private ones.
 *
 *   npm run privatise-suggestions -- --dry   # list what would move
 *   npm run privatise-suggestions
 *
 * A one-off for suggestions written before `/api/suggest` started using private
 * ids; see `../jobboard/sanity/suggestions` for the rule. Safe to run again.
 */

import { writeClient } from '../jobboard/sanity/client'
import { privatiseSuggestions, type MoveClient } from '../jobboard/sanity/suggestions'
import { main, parseArgs, printReport } from './_cli'

void main(async () => {
  const dry = parseArgs().flags.has('dry')
  const report = await privatiseSuggestions(writeClient() as unknown as MoveClient, { dryRun: dry })
  printReport(dry ? 'Suggestions to move (dry run)' : 'Suggestions moved', {
    found: report.found,
    'already private': report.alreadyPrivate,
    moved: report.moved,
    ids: report.ids,
  })
})
