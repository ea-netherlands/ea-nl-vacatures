/**
 * The coming Thursday's two explainers, one per account, each from its own
 * source, both in English: one for James's LinkedIn, one for EA Nederland's Instagram.
 * Each has its source, slides, caption and decision. The accounts are
 * connected on /review/social; this page uses the same ones.
 */

import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import l from '@jobboard/components/layout.module.css'
import s from '@jobboard/components/review.module.css'
import x from '@jobboard/components/social.module.css'
import u from '@jobboard/components/ui.module.css'
import { ExplainerEditor, ExplainerFirstDraft, type ExplainerItemView } from '@jobboard/components/ExplainerEditor'
import { isReviewConfigured, issueToken, LINK_TTL_MS, SESSION_COOKIE, verifyToken } from '@jobboard/review/auth'
import { explainerSlidePaths } from '@jobboard/social/explainer/slides'
import { ceaSourcesEnabled, sourceKey, type SourceRef } from '@jobboard/social/explainer/sources'
import {
  getExplainer,
  type ExplainerChannel,
  type ExplainerItem,
  type ExplainerPost,
} from '@jobboard/social/explainer/store'
import { EXPLAINER_CHANNELS, nextExplainerTime } from '@jobboard/social/explainer/weekly'
import { channelPostAt, postingEnabled } from '@jobboard/social/publish'
import { amsterdamDate, CHANNEL_LABEL } from '@jobboard/social/store'
import { trackFor, trackLabel } from '@jobboard/social/music'

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

const HEADING: Record<ExplainerChannel, string> = {
  linkedinPersonal: 'For your LinkedIn',
  instagram: 'For EA Netherlands’ Instagram',
}

function Strip({ post, channel }: { post: ExplainerPost; channel: ExplainerChannel }) {
  const paths = explainerSlidePaths(post, channel)
  if (!paths.length) return null
  return (
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
  )
}

const view = (src: SourceRef) => ({
  key: sourceKey(src),
  kind: src.kind,
  title: src.title,
  author: src.author,
  url: src.url,
})

function itemView(item: ExplainerItem | null): ExplainerItemView | null {
  if (!item) return null
  return {
    status: item.status,
    source: item.source ? view(item.source) : null,
    topic: item.topic,
    suggestions: (item.suggestions ?? []).map((sug) => ({ ...view(sug), reason: sug.reason })),
    slides: item.slides,
    caption: item.caption,
    flags: item.flags ?? [],
    error: item.error,
  }
}

function Result({ item }: { item: ExplainerItem | null }) {
  const r = item?.result
  if (!r || (item?.status !== 'approved' && item?.status !== 'posted')) return null
  return (
    <p className={x.pickMeta}>
      {r.id ? 'Posted' : r.error ? `Failed (${r.attempts ?? 1} of 3): ${r.error}` : 'Waiting'}
      {r.url ? (
        <>
          {' '}
          ·{' '}
          <a href={r.url} target="_blank" rel="noreferrer">
            View
          </a>
        </>
      ) : null}
    </p>
  )
}

const at = (date: string, c: ExplainerChannel) =>
  channelPostAt(date, c).toLocaleString('en-GB', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  })

function Account({ post, channel }: { post: ExplainerPost; channel: ExplainerChannel }) {
  const item = post[channel]
  return (
    <section className={x.section}>
      <h2 className={x.heading}>
        {HEADING[channel]} · {at(post.postDate, channel)}
      </h2>
      <Result item={item} />
      {channel === 'instagram' && item ? (
        <p className={x.pickMeta}>
          Music: once it’s posted, add {trackLabel(trackFor('content'))} in the Instagram app. You’ll get an email with the
          link.
        </p>
      ) : null}
      <ExplainerEditor
        key={`${channel}-${post._rev ?? ''}`}
        channel={channel}
        item={itemView(item)}
        postingTime={`on ${at(post.postDate, channel)}`}
      />
      <Strip post={post} channel={channel} />
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

  return (
    <Frame>
      {todays ? (
        <section className={x.section}>
          <h2 className={x.heading}>Today’s explainers</h2>
          {EXPLAINER_CHANNELS.map((c) => (
            <div key={c}>
              <p className={x.pickTitle}>
                {CHANNEL_LABEL[c]}: {todays[c]?.source?.title ?? 'nothing'} ({todays[c]?.status ?? 'not drafted'})
              </p>
              <Result item={todays[c]} />
            </div>
          ))}
        </section>
      ) : null}
      <h1 className={s.title}>The explainers for {day}</h1>
      <p className={s.lead}>
        Two explainers in English, each from its own source so nobody who follows both accounts sees the same one twice:
        one for your LinkedIn, one for EA Netherlands’ Instagram. Sources are curated EA Forum posts and the EA Handbook
        {ceaSourcesEnabled() ? ', plus the Centre for Effective Altruism’s Instagram' : ''}. Approve or skip each one
        on its own.
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
      ) : post ? (
        EXPLAINER_CHANNELS.map((c) => <Account key={c} post={post} channel={c} />)
      ) : (
        <ExplainerFirstDraft day={day} />
      )}
    </Frame>
  )
}
