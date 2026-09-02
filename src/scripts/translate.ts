/**
 * Machine-translates the Dutch editorial fields into English.
 *
 *   npm run translate -- --dry            # what would be written, no calls
 *   npm run translate
 *   npm run translate -- --force --limit=5
 *
 * Idempotent: a field whose English value is already filled is skipped unless
 * `--force`, which is what a curator wants after editing a Dutch note.
 *
 * The same work runs nightly at /api/cron/translate. See
 * `../jobboard/sanity/translate` for why it is a cron rather than a step in the
 * promotion pipeline.
 */

import { runTranslation } from '../jobboard/sanity/translate'
import { log, main, num, parseArgs, printReport } from './_cli'

void main(async () => {
  const args = parseArgs()
  const dry = args.flags.has('dry')

  const report = await runTranslation({
    dryRun: dry,
    force: args.flags.has('force'),
    limit: num(args, 'limit', Infinity),
    batchSize: num(args, 'batch', 8),
    onLog: log,
  })

  printReport(dry ? 'Translate (dry run)' : 'Translate', {
    'listings scanned': report.listingsScanned,
    'employers scanned': report.employersScanned,
    'fields pending': report.pending,
    'fields translated': report.translated,
    'documents patched': report.documentsPatched,
    errors: report.errors,
  })

  for (const row of report.preview.slice(0, 40)) {
    log(`  ${row.field.padEnd(18)} ${row.label}`)
  }
  if (report.preview.length > 40) log(`  … and ${report.preview.length - 40} more`)
})
