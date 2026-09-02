/**
 * Mails a digest of untriaged feedback.
 *
 *   npm run notify -- --dry     # print the mail, send nothing
 *   npm run notify
 *
 * Runs weekly at /api/cron/notify. Nothing is sent when the queue is empty —
 * see `../jobboard/sanity/notify` for why that is deliberate, and for why a
 * missing RESEND_API_KEY reports itself instead of failing.
 */

import { runSuggestionDigest } from '../jobboard/sanity/notify'
import { log, main, parseArgs, printReport } from './_cli'

void main(async () => {
  const args = parseArgs()
  const dry = args.flags.has('dry')

  const report = await runSuggestionDigest({ dryRun: dry, onLog: log })

  printReport(dry ? 'Feedback digest (dry run)' : 'Feedback digest', {
    'untriaged suggestions': report.pending,
    recipient: report.to,
    sent: report.sent,
    skipped: report.skippedReason ?? undefined,
  })

  if (report.preview) {
    console.log('─'.repeat(60))
    console.log(report.preview)
    console.log('─'.repeat(60))
  }
})
