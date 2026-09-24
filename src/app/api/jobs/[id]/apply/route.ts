/**
 * Outbound click tracking — spec §9.7.
 *
 * Logged server-side via a redirect rather than client-side analytics: it
 * survives ad blockers, and click-through per listing is the primary engagement
 * metric. It is the only engagement signal a link-out board gets, and the thing
 * you will want when deciding whether to continue (§3).
 *
 * GDPR is largely moot here — job ads are corporate, not personal, data — but
 * the click log deliberately does not retain IP addresses (§10). We keep the
 * referrer host only, which is enough for the traffic-source split that acts as
 * a rough proxy for newcomer versus community reader (§3).
 */

import { after, NextResponse } from 'next/server'
import { getDb } from '@jobboard/db/client'
import { getListingById } from '@jobboard/sanity/queries'
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@jobboard/content/i18n'
// SITE_URL, not the request's own host: served through the main site, this
// route sees the deployment's *.vercel.app address, which readers should
// never be sent to.
import { SITE_URL } from '@jobboard/lib/seo'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const url = new URL(request.url)
  const localeParam = url.searchParams.get('locale')
  const locale: Locale = LOCALES.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : DEFAULT_LOCALE

  const listing = await getListingById(id)
  if (!listing?.applyUrl) {
    return NextResponse.redirect(new URL(locale === 'nl' ? '/vacatures' : '/en/jobs', SITE_URL), 302)
  }

  // Only ever redirect to an absolute http(s) destination. An open redirect on
  // a job board is a phishing gift, and the apply URL is third-party data.
  let destination: URL
  try {
    destination = new URL(listing.applyUrl)
    if (destination.protocol !== 'https:' && destination.protocol !== 'http:') {
      throw new Error('unsupported protocol')
    }
  } catch {
    return NextResponse.redirect(new URL(locale === 'nl' ? '/vacatures' : '/en/jobs', SITE_URL), 302)
  }

  // Log without blocking the redirect: a database hiccup must never stop a
  // reader reaching the employer's page. `after()` rather than a bare
  // fire-and-forget promise: on serverless the instance can be frozen the
  // moment the response is sent, and the insert went with it — undercounting
  // the one engagement metric this board has.
  after(async () => {
    try {
      const db = await getDb()
      const referrer = request.headers.get('referer')
      let referrerHost: string | null = null
      if (referrer) {
        try {
          referrerHost = new URL(referrer).host
        } catch {
          referrerHost = null
        }
      }
      await db.query(
        `insert into apply_click (sanity_doc_id, listing_id, locale, referrer_host)
         values ($1, $2, $3, $4)`,
        // pipelineListingId joins the click back to the ingestion row, so
        // click-through can be reported per source as well as per listing.
        [id, listing.pipelineListingId, locale, referrerHost],
      )
    } catch {
      // Swallowed on purpose — see above.
    }
  })

  return NextResponse.redirect(destination.toString(), {
    status: 302,
    headers: {
      // Do not leak the board's URL, including any filter params, to the
      // employer's analytics.
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
    },
  })
}
