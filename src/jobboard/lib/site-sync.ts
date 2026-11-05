/**
 * The daily check that the board and the website still agree.
 *
 * The board reads the site's header and footer live (content/site-chrome-live.ts)
 * and quietly falls back to its saved snapshot when that fails, so a broken
 * endpoint would never show on the page: the menus would just stop updating.
 * Cookie consent is the other shared piece. The board's lib/consent.ts must use
 * the site's storage key, version and categories, or a visitor's choice on one
 * half of effectiefaltruisme.nl doesn't count on the other.
 *
 * This runs once a day and mails the review-digest recipients only when
 * something is wrong. A quiet inbox means everything matches.
 */

import { digestRecipients } from '../review/digest'
import {
  consentMismatch,
  fetchSiteChromePayload,
  parseSiteChrome,
  SITE_CHROME_URL,
} from '../content/site-chrome-live'
import { isMailConfigured, sendMail } from './mail'

export type SiteSyncReport = {
  ok: boolean
  problems: string[]
  sent: boolean
  skippedReason: string | null
}

export async function checkSiteSync(
  fetchPayload: () => Promise<unknown> = () => fetchSiteChromePayload({ cache: 'no-store' }),
): Promise<string[]> {
  const problems: string[] = []
  let payload: unknown
  try {
    payload = await fetchPayload()
  } catch (e) {
    return [`The board could not read ${SITE_CHROME_URL}: ${(e as Error).message}. It is showing its saved copy of the menus.`]
  }
  for (const locale of ['nl', 'en'] as const) {
    try {
      parseSiteChrome(payload, locale, (m) => problems.push(`${locale}: ${m}`))
    } catch (e) {
      problems.push(
        `The board can't read the site's ${locale} menus (${(e as Error).message}). It is showing its saved copy.`,
      )
    }
  }
  const consent = consentMismatch(payload)
  if (consent) {
    problems.push(
      `Cookie consent differs between the site and the board (${consent}). Update src/jobboard/lib/consent.ts in the board to match the site's src/lib/consent.ts.`,
    )
  }
  return [...new Set(problems)]
}

export async function runSiteSync(
  options: { dryRun?: boolean; onLog?: (line: string) => void } = {},
): Promise<SiteSyncReport> {
  const log = (line: string) => options.onLog?.(line)
  const problems = await checkSiteSync()
  const report: SiteSyncReport = { ok: !problems.length, problems, sent: false, skippedReason: null }

  if (!problems.length) {
    log('site and board agree — nothing sent')
    return report
  }
  for (const p of problems) log(`problem: ${p}`)

  const to = digestRecipients()
  const subject = `Vacaturebord: ${problems.length === 1 ? 'one thing differs' : `${problems.length} things differ`} from the website`
  const text = [
    'The daily check between the job board and effectiefaltruisme.nl found:',
    '',
    ...problems.map((p) => `- ${p}`),
    '',
    'The board keeps working in the meantime. See src/jobboard/lib/site-sync.ts in ea-nl-vacatures.',
  ].join('\n')

  if (options.dryRun) return { ...report, skippedReason: 'dry run' }
  if (!to.length) return { ...report, skippedReason: 'REVIEW_DIGEST_TO not set' }
  if (!isMailConfigured()) return { ...report, skippedReason: 'RESEND_API_KEY not set' }

  await sendMail({ to, subject, text })
  log(`sent "${subject}" to ${to.join(', ')}`)
  return { ...report, sent: true }
}
