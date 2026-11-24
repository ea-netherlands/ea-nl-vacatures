/**
 * The weekly review: every post of the coming week on one page, in posting
 * order, with one button that approves them all (@jobboard/social/week).
 * Wednesday's mail links here. Changing a post (captions, slides, another
 * source, skipping it) still happens in its own editor, linked from each.
 */

import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import l from '@jobboard/components/layout.module.css'
import s from '@jobboard/components/review.module.css'
import x from '@jobboard/components/social.module.css'
import u from '@jobboard/components/ui.module.css'
import { ApproveWeek } from '@jobboard/components/ApproveWeek'
import { SocialTabs } from '@jobboard/review/SeriesPage'
import { isReviewConfigured, issueToken, SOCIAL_LINK_TTL_MS, SOCIAL_SESSION_COOKIE, socialSignedIn } from '@jobboard/review/auth'
import { getListingsByIds } from '@jobboard/sanity/queries'
import { postSlides, slidePath } from '@jobboard/social/content'
import { CHARITY, EXPLAINER } from '@jobboard/social/explainer/series'
import { explainerSlidePaths } from '@jobboard/social/explainer/slides'
import { postingEnabled } from '@jobboard/social/publish'
import { isLocal } from '@jobboard/social/select'
import { CHANNEL_LABEL, CHANNELS } from '@jobboard/social/store'
import { awaiting, kindLabel, loadWeek, type Week, type WeekEntry } from '@jobboard/social/week'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'This week’s social posts',
  robots: { index: false, follow: false },
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="jb-root" lang="en">
      <main className={`${l.container} ${s.page}`}>
        <span className={l.eyebrow}>Weekly social posts</span>
        <SocialTabs current="week" />
        {children}
      </main>
    </div>
  )
}

const when = (at: Date) =>
  at.toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  })

const STATUS: Record<WeekEntry['status'], string> = {
  draft: 'Waiting for you',
  approved: 'Approved',
  skipped: 'Skipped',
  posted: 'Posted',
  missing: 'Not drafted yet',
}

function Strip({ paths }: { paths: string[] }) {
  if (!paths.length) return null
  return (
    <ol className={x.strip}>
      {paths.map((src, i) => (
        <li key={src} className={x.slide}>
          <a href={src} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated PNGs, shown as they will be posted */}
            <img src={src} alt={`Slide ${i + 1}`} loading="lazy" width={1080} height={1350} />
          </a>
          <span>{i + 1}</span>
        </li>
      ))}
    </ol>
  )
}

function Caption({ label, text }: { label: string; text: string | null | undefined }) {
  if (!text) return null
  return (
    <details className={x.more}>
      <summary>{label}</summary>
      <p className={x.caption}>{text}</p>
    </details>
  )
}

async function Entry({ entry, week }: { entry: WeekEntry; week: Week }) {
  let paths: string[] = []
  let captions: { label: string; text: string | null | undefined }[] = []
  let warning: string | null = null

  if (entry.kind === 'jobs' && week.jobs) {
    const roles = await getListingsByIds(week.jobs.listingIds)
    paths = roles.length ? postSlides(roles, week.dates.jobs, week.jobs.theme ?? 'mixed').map((spec) => slidePath(spec)) : []
    captions = CHANNELS.map((c) => ({ label: `Caption for ${CHANNEL_LABEL[c]}`, text: week.jobs?.captions?.[c] }))
    if (roles.length && !roles.some(isLocal)) {
      warning = 'No role this week is done in the Netherlands: they are all remote or abroad.'
    }
  } else if (entry.channel) {
    const charity = entry.kind === 'charity'
    const post = charity ? week.charity : week.explainer
    if (post?.[entry.channel]?.slides) {
      paths = explainerSlidePaths(post, entry.channel, 'png', charity ? CHARITY : EXPLAINER)
    }
    captions = [{ label: 'Caption', text: post?.[entry.channel]?.caption }]
  }

  return (
    <section className={x.section}>
      <h2 className={x.heading}>
        {when(entry.at)} · {kindLabel(entry.kind)} for {entry.where}
      </h2>
      {entry.status !== 'missing' ? <p className={x.pickTitle}>{entry.title}</p> : null}
      <p className={x.status}>
        {STATUS[entry.status]}
        {entry.status === 'draft' && entry.problem ? `: ${entry.problem}` : ''}
      </p>
      {warning ? (
        <div className={x.warning} role="status">
          {warning}
        </div>
      ) : null}
      {entry.status === 'draft' && entry.flags.length ? (
        <>
          <p className={x.pickMeta}>Worth checking:</p>
          <ul className={x.flags}>
            {entry.flags.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </>
      ) : null}
      <Strip paths={paths} />
      {captions.map((c) => (
        <Caption key={c.label} label={c.label} text={c.text} />
      ))}
      <p>
        <a className={`${u.btn} ${u.btnGhost} ${u.btnSmall}`} href={entry.editPath}>
          {entry.status === 'draft' || entry.status === 'missing' ? 'Change it' : 'Open it'}
        </a>
      </p>
    </section>
  )
}

export default async function WeekPage() {
  const jar = await cookies()
  if (!socialSignedIn(jar.get(SOCIAL_SESSION_COOKIE)?.value)) {
    const localLink =
      process.env.VERCEL !== '1' && isReviewConfigured()
        ? `/api/review/session?t=${issueToken('social-link', SOCIAL_LINK_TTL_MS)}&next=week`
        : null
    return (
      <Frame>
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

  let week: Week | null = null
  let storeError: string | null = null
  try {
    week = await loadWeek()
  } catch (err) {
    storeError = (err as Error).message
  }

  if (!week) {
    return (
      <Frame>
        <h1 className={s.title}>This week’s posts</h1>
        <div className={x.warning} role="status">
          Can’t read the posts: {storeError}
        </div>
      </Frame>
    )
  }

  const ready = awaiting(week.entries)
  const blocked = week.entries.filter((e) => (e.status === 'draft' && e.problem) || e.status === 'missing')
  const missing = week.entries.filter((e) => e.status === 'missing').length
  const approveBox = (
    <div className={x.decision}>
      <p className={x.status}>
        {ready.length
          ? ready.length === 1
            ? 'One post is ready to approve.'
            : `${ready.length} posts are ready to approve.`
          : missing === week.entries.length
            ? 'Nothing is drafted yet. Wednesday’s run drafts the week and mails you.'
            : blocked.length
              ? 'Nothing is ready to approve yet.'
              : 'Everything this week is decided.'}
      </p>
      {ready.length && blocked.length ? (
        <p className={x.pickMeta}>
          {blocked.length === 1 ? 'One other post needs' : `${blocked.length} other posts need`} you first, in{' '}
          {blocked.length === 1 ? 'its' : 'their'} own editor. Approving leaves {blocked.length === 1 ? 'it' : 'them'} as{' '}
          {blocked.length === 1 ? 'it is' : 'they are'}.
        </p>
      ) : null}
      {ready.length ? <ApproveWeek count={ready.length} /> : null}
    </div>
  )

  return (
    <Frame>
      <h1 className={s.title}>This week’s posts</h1>
      <p className={s.lead}>
        Everything that goes out in the coming week, in posting order. Read them through, then approve them all at once.
        To change one, swap its source or skip it, open it in its own editor.
      </p>
      {!postingEnabled() ? (
        <div className={x.warning} role="status">
          Posting is switched off (<code>SOCIAL_POSTING</code>), so approved posts won’t go out.
        </div>
      ) : null}
      {approveBox}
      {week.entries.map((e) => (
        <Entry key={`${e.kind}-${e.channel ?? 'all'}`} entry={e} week={week} />
      ))}
      {ready.length ? approveBox : null}
    </Frame>
  )
}
