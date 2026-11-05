/**
 * Refreshes src/jobboard/content/site-chrome.snapshot.json from the live site.
 *
 * The snapshot is only the fallback for when the site can't be reached (see
 * content/site-chrome-live.ts), so this is occasional housekeeping, not a step
 * to run after every menu change.
 *
 *   npm run sync-site-chrome
 *   SITE_CHROME_URL=http://localhost:3000/api/site-chrome npm run sync-site-chrome
 */

import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  consentMismatch,
  fetchSiteChromePayload,
  parseSiteChrome,
  SITE_CHROME_URL,
} from '../jobboard/content/site-chrome-live'

async function main() {
  const payload = await fetchSiteChromePayload({ cache: 'no-store' })
  // Refuse to save something the board couldn't render.
  for (const locale of ['nl', 'en'] as const) {
    parseSiteChrome(payload, locale, (m) => console.warn(`${locale}: ${m}`))
  }
  const consent = consentMismatch(payload)
  if (consent) console.warn(`cookie consent differs from the site: ${consent}`)

  const file = path.join(process.cwd(), 'src/jobboard/content/site-chrome.snapshot.json')
  await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`saved ${SITE_CHROME_URL} to ${path.relative(process.cwd(), file)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
