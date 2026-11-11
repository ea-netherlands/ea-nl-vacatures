/**
 * The weekly explainer's cycle.
 *
 * Wednesday 11:30: pick a source and draft Thursday's explainer, then mail
 * James a link to /review/social/explainer. Thursday, hourly: post what he
 * approved, in English on his LinkedIn at 09:00 and in Dutch on EA
 * Nederland's Instagram at 19:00 (the same times as the jobs post, so each
 * account keeps one rhythm).
 *
 * The same switch as the jobs post (SOCIAL_POSTING) holds everything back,
 * and the same rules apply: a draft is only redrafted with `force`, a decided
 * week is never touched, a failed account is retried up to three times.
 */

import { isMailConfigured, sendMail } from '../../lib/mail'
import { ADMIN_ORIGIN } from '../../lib/seo'
import { issueToken, LINK_TTL_MS } from '../../review/auth'
import { publishInstagramCarousel } from '../instagram'
import { publishLinkedInImages } from '../linkedin'
import { channelPostAt, postingEnabled } from '../publish'
import { amsterdamDate, CHANNEL_LABEL, type ChannelResult } from '../store'
import { getToken } from '../tokens'
import { approvers } from '../weekly'
import { draftFrom, gatherCandidates, rankCandidates, ref, shortlist } from './draft'
import { explainerSlidePaths } from './slides'
import { sourceKey } from './sources'
import {
  getExplainer,
  patchExplainer,
  saveExplainer,
  usedSources,
  type ExplainerChannel,
  type ExplainerPost,
  type Suggestion,
} from './store'

/** Posted by the API, in this order through the day. */
export const EXPLAINER_CHANNELS: ExplainerChannel[] = ['linkedinPersonal', 'instagram']

const THURSDAY = 4
const MAX_ATTEMPTS = 3

/** The coming Thursday at 09:00 Amsterdam; the next week's once this one's 09:00 has passed. */
export function nextExplainerTime(now = new Date()): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Amsterdam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  let days = (THURSDAY - weekday + 7) % 7
  if (days === 0 && Number(parts.hour) >= 9) days = 7
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + days))
  return channelPostAt(date.toISOString().slice(0, 10), 'linkedinPersonal')
}

const longDay = (at: Date) =>
  at.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' })

/**
 * Picks a source and drafts the coming Thursday's explainer.
 *
 * - `force` redrafts a draft (the page's Redraft button).
 * - `source` drafts from that suggestion instead (the page's "use this one").
 * - `pass` also rules out the current source for good ("not this one").
 */
export async function draftExplainer(options: {
  force?: boolean
  source?: string
  pass?: boolean
  now?: Date
  onLog?: (line: string) => void
}): Promise<{ post: ExplainerPost; changed: boolean }> {
  const log = (line: string) => options.onLog?.(line)
  const postAt = nextExplainerTime(options.now)
  const postDate = amsterdamDate(postAt)

  const existing = await getExplainer(postDate)
  if (existing && (existing.status !== 'draft' || !options.force)) {
    log(`explainer for ${postDate} already exists (${existing.status}); left alone`)
    return { post: existing, changed: false }
  }

  const passed = new Set(existing?.passed ?? [])
  if (options.pass && existing?.source) passed.add(sourceKey(existing.source))
  const [{ used, recentTopics }, token] = await Promise.all([usedSources(), getToken('instagram').catch(() => null)])
  for (const k of passed) used.add(k)

  const gathered = await gatherCandidates({ instagramToken: token?.accessToken })
  for (const p of gathered.problems) log(p)

  let chosen: Suggestion | null = null
  let suggestions: Suggestion[] = []
  if (options.source) {
    const pool = [...(existing?.suggestions ?? []), ...(existing?.source ? [{ ...existing.source, reason: '', topic: existing.topic ?? '' }] : [])]
    chosen = pool.find((s) => sourceKey(s) === options.source) ?? null
    if (!chosen) throw new Error('That suggestion isn’t available any more.')
    suggestions = pool.filter((s) => sourceKey(s) !== options.source && !used.has(sourceKey(s)) && s.reason)
  } else {
    const ranked = await rankCandidates(shortlist(gathered.candidates, used), recentTopics)
    chosen = ranked[0] ?? null
    suggestions = ranked.slice(1)
  }

  const base = {
    _id: `explainerPost-${postDate}`,
    postDate,
    postAt: postAt.toISOString(),
    status: 'draft' as const,
    suggestions,
    passed: [...passed],
    approvedAt: null,
    generatedAt: new Date().toISOString(),
  }

  if (!chosen) {
    const error = ['Nothing new to adapt this week.', ...gathered.problems].join(' ')
    const post = await saveExplainer({ ...base, source: null, topic: null, slides: null, captions: null, flags: [], error })
    log(error)
    return { post, changed: true }
  }

  log(`drafting from ${chosen.kind}: ${chosen.title}`)
  try {
    const instagram =
      chosen.kind === 'instagram' ? (gathered.instagram.find((s) => s.candidate.id === chosen!.id) ?? null) : null
    const draft = await draftFrom(chosen, { postDate, instagram })
    const post = await saveExplainer({
      ...base,
      source: ref(chosen),
      topic: chosen.topic || null,
      ...draft,
      error: gathered.problems.length ? gathered.problems.join(' ') : null,
    })
    return { post, changed: true }
  } catch (err) {
    const message = (err as Error).message
    const post = await saveExplainer({
      ...base,
      source: ref(chosen),
      topic: chosen.topic || null,
      slides: null,
      captions: null,
      flags: [],
      error: `Drafting failed: ${message}`,
    })
    log(`drafting failed: ${message}`)
    return { post, changed: true }
  }
}

function reviewLink(): string {
  const url = new URL('/api/review/session', ADMIN_ORIGIN)
  url.searchParams.set('t', issueToken('link', LINK_TTL_MS))
  url.searchParams.set('next', 'explainer')
  return url.toString()
}

export type ExplainerReport = { postDate: string; status: string; source: string | null; mailed: string[]; note: string | null }

/** The Wednesday cron. */
export async function runWeeklyExplainer(
  options: { dryRun?: boolean; force?: boolean; onLog?: (line: string) => void } = {},
): Promise<ExplainerReport> {
  const log = (line: string) => options.onLog?.(line)
  const postAt = nextExplainerTime()
  const postDate = amsterdamDate(postAt)

  if (options.dryRun) {
    const [{ used, recentTopics }, token] = await Promise.all([
      usedSources().catch(() => ({ used: new Set<string>(), recentTopics: [] })),
      getToken('instagram').catch(() => null),
    ])
    const gathered = await gatherCandidates({ instagramToken: token?.accessToken })
    const ranked = await rankCandidates(shortlist(gathered.candidates, used), recentTopics)
    for (const r of ranked) log(`${r.kind}: ${r.title} (${r.topic}) — ${r.reason}`)
    return { postDate, status: 'dry run', source: ranked[0]?.title ?? null, mailed: [], note: gathered.problems.join(' ') || null }
  }

  const { post, changed } = await draftExplainer({ force: options.force, onLog: options.onLog })
  const report: ExplainerReport = {
    postDate,
    status: changed ? post.status : 'unchanged',
    source: post.source?.title ?? null,
    mailed: [],
    note: null,
  }
  if (!changed) return { ...report, note: `already ${post.status}` }

  const to = approvers()
  if (!to.length) return { ...report, note: 'SOCIAL_DIGEST_TO and REVIEW_DIGEST_TO not set' }
  if (!isMailConfigured()) return { ...report, note: 'RESEND_API_KEY not set' }

  const day = longDay(postAt)
  const lines = post.slides
    ? [
        `Thursday's explainer is ready for you: “${post.source?.title}” ${post.source?.kind === 'forum' ? `by ${post.source.author} on the EA Forum` : 'from the Centre for Effective Altruism'}.`,
        '',
        `English slides for your LinkedIn, Dutch for EA Netherlands' Instagram. Check both, especially the Dutch, then approve it for ${day}:`,
        reviewLink(),
        '',
        ...(post.flags.length ? ['Worth checking:', ...post.flags.map((f) => `- ${f}`), ''] : []),
        ...(post.suggestions.length
          ? ['If you’d rather use something else, the page offers:', ...post.suggestions.map((s) => `- ${s.title}`), '']
          : []),
      ]
    : [`Thursday's explainer couldn't be drafted: ${post.error ?? 'no reason given'}`, '', `Have a look: ${reviewLink()}`, '']
  lines.push('Nothing is posted until you approve it. The link signs you in for a week, so please do not forward this mail.')
  await sendMail({
    to,
    subject: post.slides ? 'Thursday’s explainer is ready to approve' : 'Thursday’s explainer needs you',
    text: lines.join('\n'),
  })
  log(`mailed ${to.join(', ')}`)
  return { ...report, mailed: to }
}

const PUBLIC_ORIGIN = 'https://effectiefaltruisme.nl'

type Http = typeof fetch

/** Thursdays, hourly: posts the approved explainer to each account once its time has passed. */
export async function runExplainerPublish(
  options: { now?: Date; dryRun?: boolean; http?: Http; sleep?: (ms: number) => Promise<void>; onLog?: (line: string) => void } = {},
): Promise<{ postDate: string; enabled: boolean; actions: string[] }> {
  const now = options.now ?? new Date()
  const log = (line: string) => options.onLog?.(line)
  const postDate = amsterdamDate(now)
  const report = { postDate, enabled: postingEnabled(), actions: [] as string[] }
  const act = (line: string) => {
    report.actions.push(line)
    log(line)
  }

  const post = await getExplainer(postDate)
  if (!post) return (log(`no explainer for ${postDate}`), report)
  if (post.status !== 'approved') return (log(`explainer for ${postDate} is ${post.status}; nothing to do`), report)
  if (!post.slides || !post.captions) return (act('approved but incomplete; not posting'), report)

  const results: Partial<Record<ExplainerChannel, ChannelResult>> = { ...(post.results ?? {}) }
  const failures: string[] = []

  for (const channel of EXPLAINER_CHANNELS) {
    const done = results[channel]
    if (done?.id) continue
    if ((done?.attempts ?? 0) >= MAX_ATTEMPTS) continue
    if (now < channelPostAt(postDate, channel)) continue
    const label = CHANNEL_LABEL[channel]
    if (options.dryRun || !report.enabled) {
      act(`${options.dryRun ? 'dry run' : 'SOCIAL_POSTING is off'}: would post the explainer to ${label}`)
      continue
    }
    const attempts = (done?.attempts ?? 0) + 1
    try {
      const token = await getToken(channel)
      if (!token) throw new Error(`${label} is not connected`)
      const result =
        channel === 'instagram'
          ? await publishInstagramCarousel({
              userId: token.accountId,
              token: token.accessToken,
              imageUrls: explainerSlidePaths(post, 'nl', 'jpg').map((p) => `${PUBLIC_ORIGIN}${p}`),
              caption: post.captions.instagram,
              http: options.http,
              sleep: options.sleep,
            })
          : await publishLinkedInImages({
              token: token.accessToken,
              personUrn: token.accountId,
              imageUrls: explainerSlidePaths(post, 'en').map((p) => `${PUBLIC_ORIGIN}${p}`),
              caption: post.captions.linkedinPersonal,
              http: options.http,
            })
      results[channel] = { at: now.toISOString(), id: result.id, url: result.url }
      act(`posted the explainer to ${label}: ${result.url ?? result.id}`)
    } catch (err) {
      const message = (err as Error).message
      results[channel] = { at: now.toISOString(), error: message, attempts }
      act(`${label} failed (attempt ${attempts} of ${MAX_ATTEMPTS}): ${message}`)
      if (attempts === 1) failures.push(`${label}: ${message}`)
    }
  }

  if (options.dryRun || !report.enabled) return report
  const allPosted = EXPLAINER_CHANNELS.every((c) => results[c]?.id)
  await patchExplainer(postDate, { results, ...(allPosted ? { status: 'posted' as const } : {}) })

  const to = approvers()
  if (failures.length && to.length && isMailConfigured()) {
    await sendMail({
      to,
      subject: `Today's explainer failed on ${failures.map((f) => f.split(':')[0]).join(' and ')}`,
      text: [
        "Today's explainer didn't go out everywhere:",
        '',
        ...failures.map((f) => `- ${f}`),
        '',
        `It retries on the next hourly run, up to ${MAX_ATTEMPTS} times. Details: ${ADMIN_ORIGIN}/review/social/explainer`,
      ].join('\n'),
    })
  }
  return report
}
