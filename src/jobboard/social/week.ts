/**
 * One review a week for all three carousels (James, 24 Nov 2026: "I only want
 * to approve social media posts once per week").
 *
 * The Wednesday cron drafts everything that goes out in the seven days after
 * it, and sends one mail with one link to /review/social/week:
 *
 *   Thursday 09:00   essay, James's LinkedIn         (explainer week)
 *   Sunday   18:00   essay, EA Nederland's Instagram (explainer week)
 *   Monday   09:00   charity deep dive, LinkedIn     (charity week)
 *   Monday   18:00   charity deep dive, Instagram    (charity week)
 *   Tuesday  09:00   jobs, LinkedIn ×2 + Instagram   (jobs week)
 *
 * Each series keeps its own "current week" (nextPostTime, nextExplainerTime),
 * and from Wednesday to Monday those are exactly these weeks, so the three
 * editors still open on the posts this page shows. Wednesday is the latest
 * day that works: it is the last day before the explainer's week begins.
 *
 * "Approve all" approves every draft that is ready, with the same checks and
 * seals as each editor's own Approve. Anything not ready is left as a draft
 * and named, for James to fix in its editor.
 */

import { isMailConfigured, sendMail } from '../lib/mail'
import { ADMIN_ORIGIN } from '../lib/seo'
import { issueToken, SOCIAL_LINK_TTL_MS } from '../review/auth'
import { sealExplainer, sealJobsPost } from './approval'
import { draftCharityWeek } from './charity/weekly'
import { CHARITY, EXPLAINER, type Series } from './explainer/series'
import { getExplainer, patchItem, type ExplainerChannel, type ExplainerItem, type ExplainerPost } from './explainer/store'
import { draftExplainer, EXPLAINER_CHANNELS, explainerPostAt, nextExplainerTime } from './explainer/weekly'
import { refreshInstagramToken } from './instagram'
import { channelPostAt } from './publish'
import { nextPostTime, SELECTION } from './select'
import { amsterdamDate, getPost, patchPost, type PostStatus, type SocialPost } from './store'
import { THEMES } from './themes'
import { maintainConnections } from './tokens'
import { approvers, draftPost } from './weekly'

export type WeekDates = { jobs: string; explainer: string; charity: string }

/** The week each series is on at `now`: the posts the weekly review covers. */
export function weekDates(now = new Date()): WeekDates {
  return {
    jobs: amsterdamDate(nextPostTime(now)),
    explainer: amsterdamDate(nextExplainerTime(now, EXPLAINER)),
    charity: amsterdamDate(nextExplainerTime(now, CHARITY)),
  }
}

/** Why a jobs post can't be approved yet, or null. */
export function jobsProblem(post: Pick<SocialPost, 'listingIds' | 'captions'>): string | null {
  if (post.listingIds.length < SELECTION.min) return `A post needs at least ${SELECTION.min} roles.`
  if (!post.captions) return 'Draft the captions first.'
  return null
}

/** Why a series item can't be approved yet, or null. */
export function itemProblem(item: Pick<ExplainerItem, 'slides' | 'caption' | 'source'>): string | null {
  return item.slides && item.caption && item.source ? null : 'It hasn’t been drafted.'
}

export const approveJobs = (post: SocialPost) =>
  patchPost(post.postDate, { status: 'approved', approvedAt: new Date().toISOString(), seal: sealJobsPost(post), error: null })

export const approveItem = (postDate: string, channel: ExplainerChannel, item: ExplainerItem, series: Series) =>
  patchItem(
    postDate,
    channel,
    { status: 'approved', approvedAt: new Date().toISOString(), seal: sealExplainer(postDate, channel, item), error: null },
    series,
  )

export type EntryKind = 'jobs' | 'explainer' | 'charity'

/** One post in the week, as the weekly page and mail list it. */
export type WeekEntry = {
  kind: EntryKind
  /** Null for the jobs post, which goes to every account at once. */
  channel: ExplainerChannel | null
  /** When it (first) goes out. */
  at: Date
  where: string
  title: string
  status: PostStatus | 'missing'
  /** Why it can't be approved as it stands, or null. */
  problem: string | null
  flags: string[]
  editPath: string
}

export type Week = {
  dates: WeekDates
  jobs: SocialPost | null
  explainer: ExplainerPost | null
  charity: ExplainerPost | null
  entries: WeekEntry[]
}

const KIND_LABEL: Record<EntryKind, string> = { jobs: 'Jobs', explainer: 'Essay', charity: 'Charity deep dive' }
export const kindLabel = (k: EntryKind) => KIND_LABEL[k]

const WHERE: Record<ExplainerChannel, string> = {
  linkedinPersonal: 'your LinkedIn',
  instagram: 'EA Netherlands’ Instagram',
}

function seriesEntries(post: ExplainerPost | null, date: string, series: Series, kind: EntryKind): WeekEntry[] {
  return EXPLAINER_CHANNELS.map((channel) => {
    const item = post?.[channel] ?? null
    return {
      kind,
      channel,
      at: explainerPostAt(date, channel, series),
      where: WHERE[channel],
      title: item?.source?.title ?? 'Not drafted',
      status: item?.status ?? 'missing',
      problem: item ? itemProblem(item) ?? null : 'It hasn’t been drafted.',
      flags: [...(item?.error && item.slides ? [item.error] : []), ...(item?.flags ?? [])],
      editPath: series.reviewPath,
    }
  })
}

export function weekEntries(week: Omit<Week, 'entries'>): WeekEntry[] {
  const { dates, jobs } = week
  const jobsEntry: WeekEntry = {
    kind: 'jobs',
    channel: null,
    at: channelPostAt(dates.jobs, 'linkedinPersonal'),
    where: 'Instagram and both LinkedIns',
    title: jobs
      ? `${THEMES[jobs.theme ?? 'mixed'].label}, ${jobs.listingIds.length} roles`
      : 'Not drafted',
    status: jobs?.status ?? 'missing',
    problem: jobs ? jobsProblem(jobs) : 'It hasn’t been drafted.',
    flags: jobs?.error ? [jobs.error] : [],
    editPath: '/review/social',
  }
  return [
    ...seriesEntries(week.explainer, dates.explainer, EXPLAINER, 'explainer'),
    ...seriesEntries(week.charity, dates.charity, CHARITY, 'charity'),
    jobsEntry,
  ].sort((a, b) => a.at.getTime() - b.at.getTime())
}

export async function loadWeek(now = new Date()): Promise<Week> {
  const dates = weekDates(now)
  const [jobs, explainer, charity] = await Promise.all([
    getPost(dates.jobs),
    getExplainer(dates.explainer, EXPLAINER),
    getExplainer(dates.charity, CHARITY),
  ])
  const week = { dates, jobs, explainer, charity }
  return { ...week, entries: weekEntries(week) }
}

/** Waiting for James: drafted and ready, not yet decided. */
export const awaiting = (entries: WeekEntry[]) => entries.filter((e) => e.status === 'draft' && !e.problem)

/**
 * Approves every ready draft of the week. Posts already decided (approved,
 * skipped, posted) are left alone; drafts that aren't ready are returned.
 */
export async function approveWeek(now = new Date()): Promise<{ approved: WeekEntry[]; left: WeekEntry[] }> {
  const week = await loadWeek(now)
  const approved: WeekEntry[] = []
  const left: WeekEntry[] = []
  for (const e of week.entries) {
    if (e.status !== 'draft') {
      if (e.status === 'missing') left.push(e)
      continue
    }
    if (e.problem) {
      left.push(e)
      continue
    }
    if (e.kind === 'jobs' && week.jobs) {
      await approveJobs(week.jobs)
    } else if (e.channel) {
      const series = e.kind === 'charity' ? CHARITY : EXPLAINER
      const post = e.kind === 'charity' ? week.charity : week.explainer
      const date = e.kind === 'charity' ? week.dates.charity : week.dates.explainer
      await approveItem(date, e.channel, post![e.channel]!, series)
    }
    approved.push(e)
  }
  return { approved, left }
}

export function weekLink(): string {
  const url = new URL('/api/review/session', ADMIN_ORIGIN)
  url.searchParams.set('t', issueToken('social-link', SOCIAL_LINK_TTL_MS))
  url.searchParams.set('next', 'week')
  return url.toString()
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

export function weekMailText(entries: WeekEntry[], link: string, notes: string[]): string {
  const ready = awaiting(entries)
  const lines = [
    ready.length
      ? `This week's social posts are ready: ${ready.length} to approve, in one go.`
      : `This week's social posts need you before they can be approved.`,
    '',
    `Check them and approve them all at once: ${link}`,
    '',
  ]
  for (const e of entries) {
    const state =
      e.status === 'draft'
        ? e.problem
          ? `needs you: ${e.problem}`
          : 'ready'
        : e.status === 'missing'
          ? 'not drafted'
          : e.status
    lines.push(`${when(e.at)}, ${kindLabel(e.kind)} for ${e.where}: ${e.title} (${state})`)
    if (e.status === 'draft' && e.flags.length) lines.push(...e.flags.map((f) => `  - Worth checking: ${f}`))
  }
  lines.push('')
  if (notes.length) lines.push(...notes, '')
  lines.push(
    'Nothing is posted until you approve it. The link signs you in for a week, so please do not forward this mail.',
  )
  return lines.join('\n')
}

export type WeekReport = {
  dates: WeekDates
  drafted: string[]
  problems: string[]
  mailed: string[]
  note: string | null
}

/** The Wednesday cron: drafts the week's posts in all three series, then mails James once. */
export async function runWeeklyReview(options: { onLog?: (line: string) => void } = {}): Promise<WeekReport> {
  const log = (line: string) => options.onLog?.(line)
  const dates = weekDates()
  // In parallel: each fits the cron's time limit alone, so together they do too.
  const runs = await Promise.allSettled([
    draftPost({ onLog: (l) => log(`jobs: ${l}`) }),
    draftExplainer({ onLog: (l) => log(`explainer: ${l}`) }),
    draftCharityWeek({ onLog: (l) => log(`charity: ${l}`) }),
  ])
  const names = ['jobs', 'explainer', 'charity'] as const
  const drafted: string[] = []
  const problems: string[] = []
  runs.forEach((r, i) => {
    if (r.status === 'rejected') problems.push(`Drafting the ${names[i]} post failed: ${(r.reason as Error).message}`)
    else if (r.value.changed) drafted.push(names[i])
  })
  for (const p of problems) log(p)

  const notes = await maintainConnections((t) => refreshInstagramToken(t)).catch((err) => [
    `Couldn't check the social connections: ${(err as Error).message}`,
  ])
  const report: WeekReport = { dates, drafted, problems, mailed: [], note: null }

  const week = await loadWeek()
  // Nothing new and nothing waiting: a second run on the same day stays quiet.
  if (!drafted.length && !problems.length && !week.entries.some((e) => e.status === 'draft' || e.status === 'missing')) {
    return { ...report, note: 'everything already decided' }
  }

  const to = approvers()
  if (!to.length) return { ...report, note: 'SOCIAL_DIGEST_TO and REVIEW_DIGEST_TO not set' }
  if (!isMailConfigured()) return { ...report, note: 'RESEND_API_KEY not set' }

  const ready = awaiting(week.entries)
  await sendMail({
    to,
    subject: ready.length ? `This week’s social posts: ${ready.length} to approve` : 'This week’s social posts need you',
    text: weekMailText(week.entries, weekLink(), [...problems, ...notes]),
  })
  log(`mailed ${to.join(', ')}`)
  return { ...report, mailed: to }
}
