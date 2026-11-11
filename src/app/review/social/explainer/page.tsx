/**
 * The coming Thursday's explainer: its source, the slides in English and
 * Dutch, both captions, and James's decision. The accounts are connected on
 * /review/social; this page uses the same ones.
 */

import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import l from '@jobboard/components/layout.module.css'
import s from '@jobboard/components/review.module.css'
import x from '@jobboard/components/social.module.css'
import u from '@jobboard/components/ui.module.css'
import { ExplainerEditor, type ExplainerEditorPost } from '@jobboard/components/ExplainerEditor'
import { isReviewConfigured, issueToken, LINK_TTL_MS, SESSION_COOKIE, verifyToken } from '@jobboard/review/auth'
import { explainerSlidePaths } from '@jobboard/social/explainer/slides'
import { instagramSourceEnabled, sourceKey, type SourceRef } from '@jobboard/social/explainer/sources'
import { getExplainer, type ExplainerPost, type Lang } from '@jobboard/social/explainer/store'
import { EXPLAINER_CHANNELS, nextExplainerTime } from '@jobboard/social/explainer/weekly'
import { channelPostAt, postingEnabled } from '@jobboard/social/publish'
import { amsterdamDate, CHANNEL_LABEL } from '@jobboard/social/store'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Weekly explainer',
  robots: { index: false, follow: false },
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="jb-root" lang="en">
      <main className={`${l.container} ${s.page}`}>
        <span className={l.eyebrow}>Weekly social posts</span>
        <nav className={x.tabs} aria-label="Weekly posts">
          <a className={`${u.btn} ${u.btnGhost} ${u.btnSmall}`} href="/review/social">
            Jobs, Tuesdays
          </a>
          <a className={`${u.btn} ${u.btnSubtle} ${u.btnSmall}`} href="/review/social/explainer" aria-current="page">
            Explainer, Thursdays
          </a>
        </nav>
        {children}
      </main>
    </div>
  )
}

const LANG_HEADING: Record<Lang, string> = {
  en: 'English slides, for your LinkedIn',
  nl: 'Dutch slides, for Instagram',
}

function Strip({ post, lang }: { post: ExplainerPost; lang: Lang }) {
  const paths = explainerSlidePaths(post, lang)
  if (!paths.length) return null
  return (
    <section className={x.section}>
      <h2 className={x.heading}>{LANG_HEADING[lang]}</h2>
      <ol className={x.strip}>
        {paths.map((src, i) => (
          <li key={src} className={x.slide}>
            <a href={src} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- generated PNGs, shown as they will be posted */}
              <img src={src} alt={`Slide ${i + 1}`} loading="lazy" width={1080} height={1350} />
            </a>
            <span>
              {i + 1}. {i === 0 ? 'Cover' : i === paths.length - 1 ? 'Credit and sign-up' : 'Point'}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

const view = (src: SourceRef) => ({
  key: sourceKey(src),
  kind: src.kind,
  title: src.title,
  author: src.author,
  url: src.url,
})

function Posting({ post }: { post: ExplainerPost }) {
  if (post.status !== 'approved' && post.status !== 'posted') return null
  return (
    <section className={x.section}>
      <h2 className={x.heading}>Posting</h2>
      <ul className={x.picks}>
        {EXPLAINER_CHANNELS.map((c) => {
          const r = post.results?.[c]
          const at = channelPostAt(post.postDate, c).toLocaleString('en-GB', {
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Amsterdam',
          })
          return (
            <li key={c} className={x.account}>
              <div>
                <div className={x.pickTitle}>
                  {CHANNEL_LABEL[c]} · {at}
                </div>
                <div className={x.pickMeta}>
                  {r?.id ? 'Posted' : r?.error ? `Failed (${r.attempts ?? 1} of 3): ${r.error}` : 'Waiting'}
                  {r?.url ? (
                    <>
                      {' '}
                      ·{' '}
                      <a href={r.url} target="_blank" rel="noreferrer">
                        View
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default async function ExplainerPage() {
  const jar = await cookies()
  if (!verifyToken('session', jar.get(SESSION_COOKIE)?.value)) {
    const localLink =
      process.env.VERCEL !== '1' && isReviewConfigured()
        ? `/api/review/session?t=${issueToken('link', LINK_TTL_MS)}&next=explainer`
        : null
    return (
      <Frame>
        <h1 className={s.title}>Sign in first</h1>
        <p className={s.lead}>
          This page uses the same sign-in as the review queue. Open the link in the latest email, then come back.
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

  const postAt = nextExplainerTime()
  const date = amsterdamDate(postAt)
  const day = postAt.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Amsterdam',
  })
  // Today's explainer stays on the page through posting day, after "next Thursday" has moved on.
  const today = amsterdamDate(new Date())
  let post: ExplainerPost | null = null
  let todays: ExplainerPost | null = null
  let storeError: string | null = null
  try {
    ;[post, todays] = await Promise.all([getExplainer(date), today === date ? null : getExplainer(today)])
  } catch (err) {
    storeError = (err as Error).message
  }

  const editorPost: ExplainerEditorPost | null = post
    ? {
        status: post.status,
        source: post.source ? view(post.source) : null,
        topic: post.topic,
        suggestions: (post.suggestions ?? []).map((sug) => ({ ...view(sug), reason: sug.reason })),
        slides: post.slides,
        captions: post.captions,
        flags: post.flags ?? [],
        error: post.error,
      }
    : null

  const times = `${hhmm(channelPostAt(date, 'linkedinPersonal'))} on your LinkedIn, ${hhmm(channelPostAt(date, 'instagram'))} on Instagram`

  return (
    <Frame>
      {todays && (todays.status === 'approved' || todays.status === 'posted') ? <Posting post={todays} /> : null}
      <h1 className={s.title}>The explainer for {day}</h1>
      <p className={s.lead}>
        One idea from a curated EA Forum post
        {instagramSourceEnabled() ? ' or a Centre for Effective Altruism post' : ''}, in English for your LinkedIn and
        in Dutch for EA Netherlands’ Instagram. Check both, especially the Dutch, then approve it. It goes out at {times}.
      </p>
      {!postingEnabled() ? (
        <div className={x.warning} role="status">
          Posting is switched off (<code>SOCIAL_POSTING</code>), so an approved explainer won’t go out.
        </div>
      ) : null}
      {storeError ? (
        <div className={x.warning} role="status">
          Can’t read or save explainers: {storeError}
        </div>
      ) : (
        <ExplainerEditor key={post?._rev ?? 'none'} post={editorPost} day={day} />
      )}
      {post ? (
        <>
          <Strip post={post} lang="en" />
          <Strip post={post} lang="nl" />
          <Posting post={post} />
        </>
      ) : null}
    </Frame>
  )
}

function hhmm(at: Date) {
  return at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })
}
