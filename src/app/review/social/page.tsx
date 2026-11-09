/**
 * Next Tuesday's social post: the slides, the captions, and James's decision.
 *
 * Once the Monday cron (or the button here) has drafted the week, this shows
 * that stored post (jobboard/social/store.ts) with the editor: captions, removing
 * a role, approve or skip. Before that, it previews what the selection would
 * pick right now, with what nearly made it. Nothing is posted from here yet;
 * that is phase 3. Behind the same session as the review queue, and English,
 * like the posts.
 */

import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import l from '@jobboard/components/layout.module.css'
import s from '@jobboard/components/review.module.css'
import x from '@jobboard/components/social.module.css'
import u from '@jobboard/components/ui.module.css'
import { routes, t } from '@jobboard/content/i18n'
import { isReviewConfigured, issueToken, LINK_TTL_MS, SESSION_COOKIE, verifyToken } from '@jobboard/review/auth'
import { SocialEditor, type EditorPost } from '@jobboard/components/SocialEditor'
import { SocialConnections, SocialPostingDay } from '@jobboard/components/SocialPublishing'
import { linkedinConfigured } from '@jobboard/social/linkedin'
import { AUTO_CHANNELS, CHANNEL_TIME, channelPostAt, postingEnabled } from '@jobboard/social/publish'
import { CHANNEL_LABEL } from '@jobboard/social/store'
import { connectionInfo } from '@jobboard/social/tokens'
import { getListingsByIds, getLiveListings } from '@jobboard/sanity/queries'
import { postSlides, slidePath } from '@jobboard/social/content'
import { isLocal, nextPostTime, SELECTION, selectForWeek, type Pick } from '@jobboard/social/select'
import { THEME_KEYS, THEMES, themeForWeek } from '@jobboard/social/themes'
import { amsterdamDate, getPost, recentlyFeatured, type SocialPost } from '@jobboard/social/store'

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

function Slides({ slides }: { slides: ReturnType<typeof postSlides> }) {
  return (
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
  )
}

const LINKEDIN_NOTICE: Record<string, string> = {
  connected: 'LinkedIn is connected.',
  cancelled: 'LinkedIn wasn’t connected: you cancelled on LinkedIn’s screen.',
  refused: 'LinkedIn refused the connection. Check the app’s products and redirect URL.',
  expired: 'That took too long. Connect LinkedIn again.',
  failed: 'Connecting LinkedIn failed. Try again; if it keeps failing, check the app settings.',
  'not-configured': 'LinkedIn isn’t set up yet: add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET on Vercel.',
  'signed-out': 'Your session had expired. Sign in again, then connect LinkedIn.',
}

const hhmm = (t: { hour: number; minute: number }) => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`

/** The accounts, and the day's (or the approved week's) posting status with the by-hand bundle. */
async function Publishing({ upcoming, notice }: { upcoming: SocialPost | null; notice: string | null }) {
  const [instagram, linkedin] = await Promise.all([connectionInfo('instagram'), connectionInfo('linkedinPersonal')])
  const today = amsterdamDate(new Date())
  const todays = await getPost(today).catch(() => null)
  const target =
    todays && (todays.status === 'approved' || todays.status === 'posted')
      ? todays
      : upcoming?.status === 'approved' || upcoming?.status === 'posted'
        ? upcoming
        : null

  let posting: React.ReactNode = null
  if (target) {
    const roles = await getListingsByIds(target.listingIds)
    const at = (c: 'instagram' | 'linkedinPersonal' | 'linkedinOrg') =>
      channelPostAt(target.postDate, c).toLocaleString('en-GB', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Amsterdam',
      })
    posting = (
      <SocialPostingDay
        postDate={target.postDate}
        heading={target.postDate === today ? 'Today’s post' : `Approved for ${target.postDate}`}
        rows={[
          ...AUTO_CHANNELS.map((c) => ({ label: CHANNEL_LABEL[c], time: at(c), result: target.results?.[c] ?? null })),
          { label: CHANNEL_LABEL.linkedinOrg, time: at('linkedinOrg'), result: target.results?.linkedinOrg ?? null, manual: true },
        ]}
        bundle={{
          slides: postSlides(roles, target.postDate, target.theme ?? 'mixed').map((spec) => slidePath(spec)),
          caption: target.captions?.linkedinOrg ?? '',
          done: Boolean(target.results?.linkedinOrg?.id),
        }}
      />
    )
  }

  return (
    <>
      {posting}
      <SocialConnections
        instagram={instagram}
        linkedin={linkedin}
        linkedinConfigured={linkedinConfigured()}
        postingEnabled={postingEnabled()}
        times={{ instagram: hhmm(CHANNEL_TIME.instagram), linkedin: hhmm(CHANNEL_TIME.linkedinPersonal) }}
        notice={notice}
      />
    </>
  )
}

export default async function SocialPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ linkedin?: string }>
}) {
  const { linkedin: linkedinResult } = await searchParams
  const notice = linkedinResult ? (LINKEDIN_NOTICE[linkedinResult] ?? null) : null
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
  const date = amsterdamDate(postAt)
  const day = postAt.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Amsterdam',
  })

  // Without the Sanity write token (local development, say) there is no store;
  // the page still previews the selection.
  let stored: SocialPost | null = null
  let storeError: string | null = null
  let recent = new Set<string>()
  try {
    ;[stored, recent] = await Promise.all([getPost(date), recentlyFeatured(postAt)])
  } catch (err) {
    storeError = (err as Error).message
  }

  if (stored) {
    const roles = await getListingsByIds(stored.listingIds)
    const theme = stored.theme ?? 'mixed'
    const slides = roles.length ? postSlides(roles, date, theme) : []
    const editorPost: EditorPost = {
      theme,
      status: stored.status,
      captions: stored.captions,
      error: stored.error,
      roles: roles.map((r) => ({ id: r.id, title: r.title, employer: r.employer?.name ?? '' })),
    }
    return (
      <Frame>
        <h1 className={s.title}>The post for {day}</h1>
        <p className={s.lead}>
          <strong>{THEMES[theme].label}</strong>, {roles.length} roles. Check the slides and the captions, then approve
          it or skip the week. Approved posts go out on Tuesday: LinkedIn at {hhmm(CHANNEL_TIME.linkedinPersonal)},
          Instagram at {hhmm(CHANNEL_TIME.instagram)}.
        </p>
        {stored.fallbackFrom ? (
          <div className={x.warning} role="status">
            The rotation had {THEMES[stored.fallbackFrom].label} this week, but fewer than five roles qualified, so this
            is a mixed post.
          </div>
        ) : null}
        {roles.length && !roles.some(isLocal) ? (
          <div className={x.warning} role="status">
            No role this week is done in the Netherlands: they are all remote or abroad. Remove one and redraft, or add a local role to the board first.
          </div>
        ) : null}
        <SocialEditor
          key={stored._rev ?? stored.generatedAt}
          post={editorPost}
          minRoles={SELECTION.min}
          themes={THEME_KEYS.map((k) => ({ key: k, label: THEMES[k].label }))}
        />
        {slides.length ? <Slides slides={slides} /> : null}
        <Publishing upcoming={stored} notice={notice} />
      </Frame>
    )
  }

  const listings = await getLiveListings({ excludeEarningToGive: true })
  const selection = selectForWeek(listings, { postAt, recentlyFeatured: recent })
  const slides = selection.enough ? postSlides(
        selection.picks.map((p) => p.listing),
        date,
        selection.theme,
      ) : []
  const rotation = themeForWeek(postAt)

  return (
    <Frame>
      <h1 className={s.title}>The post for {day}</h1>
      <p className={s.lead}>
        This week’s theme: <strong>{THEMES[selection.theme].label}</strong>
        {selection.fallbackFrom ? ` (the rotation has ${THEMES[rotation].label}, but too few roles qualify)` : ''}.{' '}
        {selection.picks.length} of {listings.length} live roles would be picked right now, following the rules in{' '}
        <code>jobboard/social/select.ts</code>
        {recent.size ? `, leaving out ${recent.size} featured in the last ${SELECTION.repeatWeeks} weeks` : ''}.
      </p>

      {storeError ? (
        <div className={x.warning} role="status">
          Can’t read or save posts: {storeError}
        </div>
      ) : (
        <>
          <SocialEditor post={null} minRoles={SELECTION.min} themes={[]} />
          <Publishing upcoming={null} notice={notice} />
        </>
      )}

      {selection.enough && !selection.hasLocal ? (
        <div className={x.warning} role="status">
          No role this week is done in the Netherlands: they are all remote or abroad. Remove one and redraft, or add a local role to the board first.
        </div>
      ) : null}

      {!selection.enough ? (
        <div className={x.warning} role="status">
          Only {selection.picks.length} roles qualify this week, fewer than the {SELECTION.min} a post needs. Skip
          this week, or add roles to the board first.
        </div>
      ) : null}

      {slides.length ? <Slides slides={slides} /> : null}

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
