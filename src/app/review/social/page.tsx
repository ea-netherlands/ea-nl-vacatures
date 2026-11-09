/**
 * Preview of this week's social post — the jobs, in order, as the slides that
 * will be posted, plus why each was picked and what nearly made it.
 *
 * Phase 1 of the weekly post (jobboard/social): it previews only. Nothing is
 * stored or posted yet; captions, approval and publishing come next. Behind
 * the same session as the review queue, and English, like the posts.
 */

import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import l from '@jobboard/components/layout.module.css'
import s from '@jobboard/components/review.module.css'
import x from '@jobboard/components/social.module.css'
import u from '@jobboard/components/ui.module.css'
import { routes, t } from '@jobboard/content/i18n'
import { isReviewConfigured, issueToken, LINK_TTL_MS, SESSION_COOKIE, verifyToken } from '@jobboard/review/auth'
import { getLiveListings } from '@jobboard/sanity/queries'
import { postSlides, slidePath } from '@jobboard/social/content'
import { nextPostTime, SELECTION, selectWeeklyJobs, type Pick } from '@jobboard/social/select'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Weekly social post',
  robots: { index: false, follow: false },
}

const BAND_LABEL = { vetted: 'Vetted', routes: 'Way in', dutch: 'Dutch institution' } as const

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="jb-root" lang="en">
      <main className={`${l.container} ${s.page}`}>
        <span className={l.eyebrow}>Weekly social post</span>
        {children}
      </main>
    </div>
  )
}

function PickRow({ pick, number }: { pick: Pick; number?: number }) {
  const { listing } = pick
  const copy = t('en')
  const problem = listing.primaryCause ? copy.causeAreas[listing.primaryCause] : null
  return (
    <li className={x.pick}>
      <span className={x.pickNumber}>{number ?? ''}</span>
      <div>
        <a className={x.pickTitle} href={routes('en').detail(listing.slug)}>
          {listing.title}
        </a>
        <div className={x.pickMeta}>{[listing.employer?.name, problem].filter(Boolean).join(' · ')}</div>
        <div className={x.badges}>
          <span className={`${u.badge} ${u.badgeCause}`}>{BAND_LABEL[pick.band]}</span>
          {pick.reasons.slice(1).map((r) => (
            <span key={r} className={`${u.badge} ${u.badgeOutline}`}>
              {r}
            </span>
          ))}
        </div>
      </div>
    </li>
  )
}

export default async function SocialPreviewPage() {
  const jar = await cookies()
  if (!verifyToken('session', jar.get(SESSION_COOKIE)?.value)) {
    const localLink =
      process.env.VERCEL !== '1' && isReviewConfigured()
        ? `/api/review/session?t=${issueToken('link', LINK_TTL_MS)}`
        : null
    return (
      <Frame>
        <h1 className={s.title}>Sign in first</h1>
        <p className={s.lead}>
          This page uses the same sign-in as the review queue. Open the link in the daily review email, then come back.
        </p>
        {localLink ? (
          <p>
            <a className={`${u.btn} ${u.btnSolid}`} href={localLink}>
              Sign in (local development only)
            </a>
          </p>
        ) : null}
      </Frame>
    )
  }

  const postAt = nextPostTime()
  const listings = await getLiveListings({ excludeEarningToGive: true })
  // Phase 1 keeps no record of past posts, so nothing counts as featured yet.
  const selection = selectWeeklyJobs(listings, { postAt })
  const date = postAt.toLocaleDateString('en-CA', { timeZone: 'Europe/Amsterdam' })
  const day = postAt.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Amsterdam',
  })
  const slides = selection.enough ? postSlides(selection.picks.map((p) => p.listing.id), date) : []

  return (
    <Frame>
      <h1 className={s.title}>The post for {day}</h1>
      <p className={s.lead}>
        {selection.picks.length} of {listings.length} live roles picked, following the rules in{' '}
        <code>jobboard/social/select.ts</code>. This is a preview: nothing is posted yet.
      </p>

      {!selection.enough ? (
        <div className={x.warning} role="status">
          Only {selection.picks.length} roles qualify this week, fewer than the {SELECTION.min} a post needs. Skip
          this week, or add roles to the board first.
        </div>
      ) : null}

      {slides.length ? (
        <section className={x.section}>
          <h2 className={x.heading}>Slides</h2>
          <ol className={x.strip}>
            {slides.map((spec, i) => (
              <li key={i} className={x.slide}>
                <a href={slidePath(spec)} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- generated PNGs, shown as they will be posted */}
                  <img src={slidePath(spec)} alt={`Slide ${i + 1}`} loading="lazy" width={1080} height={1350} />
                </a>
                <span>
                  {i + 1}. {spec.kind === 'cover' ? 'Cover' : spec.kind === 'cta' ? 'Sign-up' : `Job ${spec.index}`}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className={x.section}>
        <h2 className={x.heading}>Picked</h2>
        <ol className={x.picks}>
          {selection.picks.map((pick, i) => (
            <PickRow key={pick.listing.id} pick={pick} number={i + 1} />
          ))}
        </ol>
      </section>

      {selection.runnersUp.length ? (
        <section className={x.section}>
          <h2 className={x.heading}>Nearly made it</h2>
          <p className={s.lead}>
            Eligible, but left out by the limits: {SELECTION.max} roles, one per organisation, at most{' '}
            {SELECTION.maxPerCause} per problem area and {SELECTION.maxRoutes} ways in.
          </p>
          <ul className={x.picks}>
            {selection.runnersUp.slice(0, 8).map((pick) => (
              <PickRow key={pick.listing.id} pick={pick} />
            ))}
          </ul>
        </section>
      ) : null}

      {selection.skipped.length ? (
        <section className={x.section}>
          <h2 className={x.heading}>Ruled out</h2>
          <ul className={x.picks}>
            {Object.entries(
              selection.skipped.reduce<Record<string, number>>((acc, { reason }) => {
                acc[reason] = (acc[reason] ?? 0) + 1
                return acc
              }, {}),
            ).map(([reason, count]) => (
              <li key={reason} className={x.pickMeta}>
                {reason}: {count}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Frame>
  )
}
