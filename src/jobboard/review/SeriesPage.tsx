/**
 * The review page of a weekly carousel series: the essay explainers
 * (/review/social/explainer) or the charity deep dives (/review/social/charity).
 * The week's two posts, one per account, each from its own source, both in
 * English: one for James's LinkedIn, one for EA Nederland's Instagram. Each
 * has its source, slides, caption and decision. The accounts are connected on
 * /review/social; these pages use the same ones.
 */

import { cookies } from 'next/headers'
import l from '@jobboard/components/layout.module.css'
import s from '@jobboard/components/review.module.css'
import x from '@jobboard/components/social.module.css'
import u from '@jobboard/components/ui.module.css'
import { ExplainerEditor, ExplainerFirstDraft, type ExplainerItemView } from '@jobboard/components/ExplainerEditor'
import { isReviewConfigured, issueToken, SOCIAL_LINK_TTL_MS, SOCIAL_SESSION_COOKIE, socialSignedIn } from '@jobboard/review/auth'
import { explainerSlidePaths, explainerSlides } from '@jobboard/social/explainer/slides'
import { ceaSourcesEnabled, sourceKey, type SourceRef } from '@jobboard/social/explainer/sources'
import {
  getExplainer,
  type ExplainerChannel,
  type ExplainerItem,
  type ExplainerPost,
} from '@jobboard/social/explainer/store'
import { addDays, EXPLAINER_CHANNELS, explainerPostAt, nextExplainerTime } from '@jobboard/social/explainer/weekly'
import { postingEnabled } from '@jobboard/social/publish'
import { amsterdamDate, CHANNEL_LABEL } from '@jobboard/social/store'
import { EXPLAINER, type Series } from '@jobboard/social/explainer/series'
import { trackFor, trackLabel } from '@jobboard/social/music'

const TABS = [
  { href: '/review/social/week', label: 'This week', key: 'week' },
  { href: '/review/social', label: 'Jobs, Tuesdays', key: 'jobs' },
  { href: '/review/social/explainer', label: 'Explainers, Thu and Sun', key: 'explainer' },
  { href: '/review/social/charity', label: 'Charity deep dives, Mondays', key: 'charity' },
] as const

/** The three weekly posts, as tabs; also on the jobs page. */
export function SocialTabs({ current }: { current: (typeof TABS)[number]['key'] }) {
  return (
    <nav className={x.tabs} aria-label="Weekly posts">
      {TABS.map((tab) => (
        <a
          key={tab.key}
          className={`${u.btn} ${tab.key === current ? u.btnSubtle : u.btnGhost} ${u.btnSmall}`}
          href={tab.href}
          aria-current={tab.key === current ? 'page' : undefined}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  )
}

function Frame({ children, series }: { children: React.ReactNode; series: Series }) {
  return (
    <div className="jb-root" lang="en">
      <main className={`${l.container} ${s.page}`}>
        <span className={l.eyebrow}>Weekly social posts</span>
        <SocialTabs current={series.key} />
        {children}
      </main>
    </div>
  )
}

const HEADING: Record<ExplainerChannel, string> = {
  linkedinPersonal: 'For your LinkedIn',
  instagram: 'For EA Netherlands’ Instagram',
}

function Strip({ post, channel, series }: { post: ExplainerPost; channel: ExplainerChannel; series: Series }) {
  const paths = explainerSlidePaths(post, channel, 'png', series)
  const kinds = explainerSlides(post, channel).map((s) => s.kind)
  const LABEL =
    series.key === 'charity'
      ? ({ cover: 'Hook', about: 'About the series', point: 'Point', close: 'Give, pledge, sign up' } as const)
      : ({ cover: 'Hook', about: 'About the essay', point: 'Point', close: 'Credit and sign-up' } as const)
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
            {i + 1}. {LABEL[kinds[i]]}
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
    guidance: item.guidance ?? null,
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

const at = (date: string, c: ExplainerChannel, series: Series) =>
  explainerPostAt(date, c, series).toLocaleString('en-GB', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  })

function Account({ post, channel, series }: { post: ExplainerPost; channel: ExplainerChannel; series: Series }) {
  const item = post[channel]
  return (
    <section className={x.section}>
      <h2 className={x.heading}>
        {HEADING[channel]} · {at(post.postDate, channel, series)}
      </h2>
      <Result item={item} />
      {channel === 'instagram' && item ? (
        <p className={x.pickMeta}>
          Music: once it’s posted, add {trackLabel(trackFor(series.track))} in the Instagram app. You’ll get an email with the
          link.
        </p>
      ) : null}
      <ExplainerEditor
        key={`${channel}-${post._rev ?? ''}`}
        series={series.key}
        channel={channel}
        item={itemView(item)}
        postingTime={`on ${at(post.postDate, channel, series)}`}
      />
      <Strip post={post} channel={channel} series={series} />
    </section>
  )
}

export async function SeriesPage({ series = EXPLAINER }: { series?: Series }) {
  const charity = series.key === 'charity'
  const jar = await cookies()
  if (!socialSignedIn(jar.get(SOCIAL_SESSION_COOKIE)?.value)) {
    const localLink =
      process.env.VERCEL !== '1' && isReviewConfigured()
        ? `/api/review/session?t=${issueToken('social-link', SOCIAL_LINK_TTL_MS)}&next=${series.next}`
        : null
    return (
      <Frame series={series}>
        <h1 className={s.title}>Sign in first</h1>
        <p className={s.lead}>
          Posting has its own sign-in, separate from the review queue. Open the link in the latest social post email, then come back.
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

  const postAt = nextExplainerTime(undefined, series)
  const date = amsterdamDate(postAt)
  const day = postAt.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Amsterdam',
  })
  // On a Sunday evening the page moves on to next week; last week's results stay in view until midnight.
  const today = amsterdamDate(new Date())
  const lastWeek = addDays(date, -7)
  let post: ExplainerPost | null = null
  let todays: ExplainerPost | null = null
  let storeError: string | null = null
  try {
    ;[post, todays] = await Promise.all([
      getExplainer(date, series),
      EXPLAINER_CHANNELS.some((c) => amsterdamDate(explainerPostAt(lastWeek, c, series)) === today)
        ? getExplainer(lastWeek, series)
        : null,
    ])
  } catch (err) {
    storeError = (err as Error).message
  }

  return (
    <Frame series={series}>
      {todays ? (
        <section className={x.section}>
          <h2 className={x.heading}>Today’s {series.plural}</h2>
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
      <h1 className={s.title}>
        The {series.plural} for the week of {day}
      </h1>
      {charity ? (
        <p className={s.lead}>
          Two deep dives in English, each on a different one of Doneer Effectief’s top charities: one for your LinkedIn,
          one for EA Netherlands’ Instagram. Each summarises, in our own words, the report of the evaluator that
          recommends the charity, and ends with three things to do: give through Doneer Effectief, take a giving pledge,
          get the monthly email. The accounts work through the charities in turn. Check the figures against the report
          before you approve.
        </p>
      ) : (
        <p className={s.lead}>
          Two explainers in English, each from its own source so nobody who follows both accounts sees the same one
          twice: one for your LinkedIn, one for EA Netherlands’ Instagram. Sources are curated EA Forum posts and the EA
          Handbook
          {ceaSourcesEnabled() ? ', plus the Centre for Effective Altruism’s Instagram' : ''}, or any Forum post you paste
          a link to. Approve or skip each one on its own.
        </p>
      )}
      {!postingEnabled() ? (
        <div className={x.warning} role="status">
          Posting is switched off (<code>SOCIAL_POSTING</code>), so an approved {series.noun} won’t go out.
        </div>
      ) : null}
      {storeError ? (
        <div className={x.warning} role="status">
          Can’t read or save {series.plural}: {storeError}
        </div>
      ) : post ? (
        EXPLAINER_CHANNELS.map((c) => <Account key={c} post={post} channel={c} series={series} />)
      ) : (
        <ExplainerFirstDraft day={`the week of ${day}`} series={series.key} />
      )}
    </Frame>
  )
}
