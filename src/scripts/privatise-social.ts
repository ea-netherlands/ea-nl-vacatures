/**
 * Moves the weekly jobs posts and explainers stored under public ids onto
 * private ones.
 *
 *   npm run privatise-social -- --dry   # list what would move
 *   npm run privatise-social
 *
 * A one-off for weeks written before the posts started using private ids; see
 * `../jobboard/social/private-ids` for the rule. Safe to run again.
 */

import { writeClient } from '../jobboard/sanity/client'
import { privatiseSocialPosts, type MoveClient } from '../jobboard/social/private-ids'
import { main, parseArgs, printReport } from './_cli'

void main(async () => {
  const dry = parseArgs().flags.has('dry')
  const report = await privatiseSocialPosts(writeClient() as unknown as MoveClient, { dryRun: dry })
  printReport(dry ? 'Social posts to move (dry run)' : 'Social posts moved', {
    found: report.found,
    'already private': report.alreadyPrivate,
    moved: report.moved,
    ids: report.ids,
  })
})
