/**
 * The review dashboard — where the daily digest's link lands.
 *
 * Curator-facing and English, like the Studio. Not linked from anywhere on the
 * public board, not indexed, and useless without the session cookie that the
 * digest's signed link sets (review/auth.ts).
 */

import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { ReviewQueue } from '@jobboard/components/ReviewQueue'
import l from '@jobboard/components/layout.module.css'
import s from '@jobboard/components/review.module.css'
import u from '@jobboard/components/ui.module.css'
import { isReviewConfigured, issueToken, LINK_TTL_MS, SESSION_COOKIE, verifyToken } from '@jobboard/review/auth'
import { anchorFor } from '@jobboard/review/digest'
import { loadReviewQueue } from '@jobboard/review/queue'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Review queue',
  robots: { index: false, follow: false },
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="jb-root" lang="en">
      <main className={`${l.container} ${s.page}`}>
        <span className={l.eyebrow}>Vacaturebord review</span>
        {children}
      </main>
    </div>
  )
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>
}) {
  const { link } = await searchParams
  const jar = await cookies()
  const signedIn = verifyToken('session', jar.get(SESSION_COOKIE)?.value)

  if (!signedIn) {
    // Off Vercel with no secret configured, offer the link the digest would
    // have sent, so the dashboard can be tried locally without mail.
    const localLink =
      process.env.VERCEL !== '1' && isReviewConfigured()
        ? `/api/review/session?t=${issueToken('link', LINK_TTL_MS)}`
        : null
    return (
      <Frame>
        <h1 className={s.title}>
          {link === 'expired' ? 'That link has expired' : 'Open this from your daily email'}
        </h1>
        <p className={s.lead}>
          {link === 'expired'
            ? 'Review links last a week. The next daily email has a fresh one, or you can review in the Studio in the meantime.'
            : 'The review queue opens from the link in the daily digest, which signs you in for 30 days.'}
        </p>
        <p>
          {localLink ? (
            <a className={`${u.btn} ${u.btnSolid}`} href={localLink}>
              Sign in (local development only)
            </a>
          ) : (
            <a className={`${u.btn} ${u.btnSubtle}`} href="/studio">
              Go to the Studio
            </a>
          )}
        </p>
      </Frame>
    )
  }

  const items = await loadReviewQueue()

  return (
    <Frame>
      <h1 className={s.title}>
        {items.length === 0
          ? 'Nothing to review'
          : items.length === 1
            ? '1 role to review'
            : `${items.length} roles to review`}
      </h1>
      <p className={s.lead}>
        {items.length === 0
          ? 'The queue is clear. New roles arrive after the morning pipeline run, and you will get an email when they do.'
          : 'Read the note, fix it if it needs it, and publish. If a role does not belong, reject it — and if you say why, the classifier sees your reason on its next run.'}
      </p>
      {items.length ? (
        <ReviewQueue items={items} anchors={items.map(anchorFor)} />
      ) : (
        <p className={s.empty}>No roles waiting.</p>
      )}
    </Frame>
  )
}
