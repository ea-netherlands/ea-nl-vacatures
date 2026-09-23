/**
 * Mails the curator the daily review digest.
 *
 *   npm run review-digest -- --dry     # print the mail, send nothing
 *   npm run review-digest
 *
 * Runs daily at /api/cron/review-digest, after `promote`. Needs
 * REVIEW_DIGEST_TO and RESEND_API_KEY; without either it reports what is
 * waiting instead of failing. See `../jobboard/review/digest`.
 */

import { runReviewDigest } from '../jobboard/review/digest'
import { log, main, parseArgs, printReport } from './_cli'

void main(async () => {
  const args = parseArgs()
  const dry = args.flags.has('dry')

  const report = await runReviewDigest({ dryRun: dry, onLog: log })

  printReport(dry ? 'Review digest (dry run)' : 'Review digest', {
    'waiting for review': report.waiting,
    'new since the last digest': report.fresh,
    recipients: report.to.join(', ') || '(REVIEW_DIGEST_TO not set)',
    subject: report.subject ?? undefined,
    sent: report.sent,
    skipped: report.skippedReason ?? undefined,
  })

  if (report.preview) {
    console.log('─'.repeat(60))
    console.log(report.preview)
    console.log('─'.repeat(60))
  }
})
