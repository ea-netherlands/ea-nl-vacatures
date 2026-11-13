/**
 * The weekly explainer's cycle.
 *
 * Wednesday 11:30: pick a source for each account and draft the week's two
 * explainers, then mail James a link to /review/social/explainer. Then post
 * what he approved, in English: on his LinkedIn on Thursday at 09:00, and on
 * EA Nederland's Instagram on Sunday at 18:00. Instagram's insights (13 Nov
 * 2026) put followers at their most active from 18:00 to 21:00 on Sundays,
 * Mondays and Tuesdays; the jobs post has Tuesday, and Sunday keeps two days
 * between the two. The two never share a source.
 *
 * A week is named after its Thursday (the document's id and `postDate`) and
 * stays open on the review page until its Sunday post has gone out.
 *
 * The same switch as the jobs post (SOCIAL_POSTING) holds everything back,
 * and the same rules apply: a draft is only redrafted with `force`, a decided
 * week is never touched, a failed account is retried up to three times.
 */

import { isMailConfigured, sendMail } from '../../lib/mail'
import { ADMIN_ORIGIN } from '../../lib/seo'
import { issueToken, LINK_TTL_MS } from '../../review/auth'
import { publishInstagramCarousel } from '../instagram'
import { publishLinkedInDocument } from '../linkedin'
import { channelPostAt, postingEnabled } from '../publish'
import { amsterdamDate, CHANNEL_LABEL, type ChannelResult } from '../store'
import { getToken } from '../tokens'
import { sendMusicReminder, trackFor } from '../music'
import { approvers } from '../weekly'
import { draftFrom, gatherCandidates, rankCandidates, ref, shortlist, type Gathered } from './draft'
import { explainerSlidePaths } from './slides'
import { sourceKey } from './sources'
import {
  EXPLAINER_CHANNELS,
  getExplainer,
  patchItem,
  saveExplainer,
  usedSources,
  type ExplainerChannel,
  type ExplainerItem,
  type ExplainerPost,
  type Suggestion,
} from './store'

export { EXPLAINER_CHANNELS }

const THURSDAY = 4
const MAX_ATTEMPTS = 3

/** Days after the week's Thursday each account posts: LinkedIn that Thursday, Instagram the Sunday after. */
export const EXPLAINER_DAY_OFFSET: Record<ExplainerChannel, number> = { linkedinPersonal: 0, instagram: 3 }

/** YYYY-MM-DD plus `days`. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** When one account's explainer for the week of `postDate` (its Thursday) goes out. */
export function explainerPostAt(postDate: string, channel: ExplainerChannel): Date {
  return channelPostAt(addDays(postDate, EXPLAINER_DAY_OFFSET[channel]), channel)
}

/** The account that posts last in a week. */
const LAST = EXPLAINER_CHANNELS.reduce((a, b) => (EXPLAINER_DAY_OFFSET[b] > EXPLAINER_DAY_OFFSET[a] ? b : a))

/**
 * The week being drafted or posted, as its Thursday at 09:00 Amsterdam: this
 * week's until its last post (Sunday's) has gone out, then the next.
 */
export function nextExplainerTime(now = new Date()): Date {
  const today = amsterdamDate(now)
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay()
  const thisWeek = addDays(today, -((weekday - THURSDAY + 7) % 7))
  const thursday = now < explainerPostAt(thisWeek, LAST) ? thisWeek : addDays(thisWeek, 7)
  return channelPostAt(thursday, 'linkedinPersonal')
}

const hhmm = (at: Date) =>
  at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })

const longDay = (at: Date) =>
  at.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' })

/** Drafts one account's explainer from a chosen source; a failure is saved on the item, not thrown. */
async function draftItem(
  channel: ExplainerChannel,
  chosen: Suggestion | null,
  suggestions: Suggestion[],
  postDate: string,
  gathered: Gathered,
  log: (line: string) => void,
): Promise<ExplainerItem> {
  const base = {
    status: 'draft' as const,
    suggestions,
    approvedAt: null,
    generatedAt: new Date().toISOString(),
    result: null,
  }
  if (!chosen) {
    const error = ['Nothing new to adapt this week.', ...gathered.problems].join(' ')
    log(`${channel}: ${error}`)
    return { ...base, source: null, topic: null, slides: null, caption: null, flags: [], error }
  }
  log(`${channel}: drafting from ${chosen.kind}: ${chosen.title}`)
  try {
    const instagram =
      chosen.kind === 'instagram' ? (gathered.instagram.find((s) => s.candidate.id === chosen.id) ?? null) : null
    const draft = await draftFrom(chosen, { channel, postDate, instagram })
    return {
      ...base,
      source: ref(chosen),
      topic: chosen.topic || null,
      ...draft,
      error: gathered.problems.length ? gathered.problems.join(' ') : null,
    }
  } catch (err) {
    const message = (err as Error).message
    log(`${channel}: drafting failed: ${message}`)
    return {
      ...base,
      source: ref(chosen),
      topic: chosen.topic || null,
      slides: null,
      caption: null,
      flags: [],
      error: `Drafting failed: ${message}`,
    }
  }
}

const asSuggestion = (item: ExplainerItem | null | undefined): Suggestion[] =>
  item?.source ? [{ ...item.source, reason: '', topic: item.topic ?? '' }] : []

/**
 * Drafts the week's explainers (see nextExplainerTime).
 *
 * With no `channel`, both accounts that have nothing decided yet: the cron,
 * and the page's first "Draft". With a `channel`, just that one:
 * - `force` redrafts its draft (Redraft);
 * - `source` drafts from that suggestion instead ("Use this one");
 * - `pass` also rules out its current source for good ("Not this one").
 * An account's draft never takes the other account's source.
 */
export async function draftExplainer(options: {
  channel?: ExplainerChannel
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

  // Which accounts to (re)draft: an undecided draft only with force, a missing one always.
  const targets = (options.channel ? [options.channel] : EXPLAINER_CHANNELS).filter((c) => {
    const item = existing?.[c]
    return !item || (item.status === 'draft' && options.force)
  })
  if (existing && !targets.length) {
    log(`explainers for ${postDate} already exist; left alone`)
    return { post: existing, changed: false }
  }

  const passed = new Set(existing?.passed ?? [])
  if (options.pass && options.channel && existing?.[options.channel]?.source) {
    passed.add(sourceKey(existing[options.channel]!.source!))
  }
  const [{ used, recentTopics }, token] = await Promise.all([usedSources(), getToken('instagram').catch(() => null)])
  for (const k of passed) used.add(k)
  // The account not being redrafted keeps its source, which this one mustn't take.
  for (const c of EXPLAINER_CHANNELS) {
    const source = existing?.[c]?.source
    if (!targets.includes(c) && source) used.add(sourceKey(source))
  }

  const gathered = await gatherCandidates({ instagramToken: token?.accessToken })
  for (const p of gathered.problems) log(p)

  const items: Partial<Record<ExplainerChannel, ExplainerItem>> = {}
  if (options.source && options.channel) {
    const channel = options.channel
    const pool = [...(existing?.[channel]?.suggestions ?? []), ...asSuggestion(existing?.[channel])]
    const chosen = pool.find((s) => sourceKey(s) === options.source)
    if (!chosen) throw new Error('That suggestion isn’t available any more.')
    const rest = pool.filter((s) => sourceKey(s) !== options.source && !used.has(sourceKey(s)) && s.reason)
    items[channel] = await draftItem(channel, chosen, rest, postDate, gathered, log)
  } else {
    const ranked = await rankCandidates(shortlist(gathered.candidates, used), recentTopics)
    // Drafting both at once: the model already keeps their first picks apart.
    await Promise.all(
      targets.map(async (c) => {
        items[c] = await draftItem(c, ranked[c][0] ?? null, ranked[c].slice(1), postDate, gathered, log)
      }),
    )
  }

  const post = await saveExplainer({
    _id: `explainerPost-${postDate}`,
    postDate,
    postAt: postAt.toISOString(),
    linkedinPersonal: items.linkedinPersonal ?? existing?.linkedinPersonal ?? null,
    instagram: items.instagram ?? existing?.instagram ?? null,
    passed: [...passed],
  })
  return { post, changed: true }
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
  options: {
    dryRun?: boolean
    force?: boolean
    /** Redraft just this account (with `force`), from `source` if given. */
    channel?: ExplainerChannel
    source?: string
    onLog?: (line: string) => void
  } = {},
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
    for (const c of EXPLAINER_CHANNELS) {
      for (const r of ranked[c]) log(`${c}: ${r.kind}: ${r.title} (${r.topic}) — ${r.reason}`)
    }
    return {
      postDate,
      status: 'dry run',
      source: EXPLAINER_CHANNELS.map((c) => ranked[c][0]?.title ?? '-').join(' | '),
      mailed: [],
      note: gathered.problems.join(' ') || null,
    }
  }

  const { post, changed } = await draftExplainer({
    force: options.force,
    channel: options.channel,
    source: options.source,
    onLog: options.onLog,
  })
  const report: ExplainerReport = {
    postDate,
    status: changed ? 'drafted' : 'unchanged',
    source: EXPLAINER_CHANNELS.map((c) => post[c]?.source?.title ?? '-').join(' | '),
    mailed: [],
    note: null,
  }
  if (!changed) return { ...report, note: 'already drafted' }

  const to = approvers()
  if (!to.length) return { ...report, note: 'SOCIAL_DIGEST_TO and REVIEW_DIGEST_TO not set' }
  if (!isMailConfigured()) return { ...report, note: 'RESEND_API_KEY not set' }

  const day = longDay(postAt)
  const describe = (c: ExplainerChannel) => {
    const item = post[c]
    const where = c === 'linkedinPersonal' ? 'For your LinkedIn' : "For EA Netherlands' Instagram"
    if (!item?.slides || !item.source) return [`${where}: couldn't be drafted. ${item?.error ?? ''}`.trim(), '']
    const from =
      item.source.kind === 'forum' ? `by ${item.source.author} on the EA Forum` : 'from the Centre for Effective Altruism'
    return [
      `${where}: “${item.source.title}” ${from}.`,
      ...(item.flags.length ? ['Worth checking:', ...item.flags.map((f) => `- ${f}`)] : []),
      '',
    ]
  }
  const ready = EXPLAINER_CHANNELS.filter((c) => post[c]?.slides)
  const lines = [
    `This week's explainers, one per account, each from its own source: for your LinkedIn on ${day} at ${hhmm(explainerPostAt(postDate, 'linkedinPersonal'))}, for Instagram on ${longDay(explainerPostAt(postDate, 'instagram'))} at ${hhmm(explainerPostAt(postDate, 'instagram'))}.`,
    '',
    ...describe('linkedinPersonal'),
    ...describe('instagram'),
    `Check them, swap either for another suggestion, and approve each one: ${reviewLink()}`,
    '',
    'Nothing is posted until you approve it. The link signs you in for a week, so please do not forward this mail.',
  ]
  await sendMail({
    to,
    subject: ready.length === 2 ? 'This week’s explainers are ready to approve' : 'This week’s explainers need you',
    text: lines.join('\n'),
  })
  log(`mailed ${to.join(', ')}`)
  return { ...report, mailed: to }
}

const PUBLIC_ORIGIN = 'https://effectiefaltruisme.nl'

type Http = typeof fetch

/**
 * Thursdays and Sundays, hourly: posts each account's approved explainer once
 * its time has passed. On a Sunday that is the Instagram one of the week that
 * began on Thursday; `postDate` in the report is today.
 */
export async function runExplainerPublish(
  options: { now?: Date; dryRun?: boolean; http?: Http; sleep?: (ms: number) => Promise<void>; onLog?: (line: string) => void } = {},
): Promise<{ postDate: string; enabled: boolean; actions: string[] }> {
  const now = options.now ?? new Date()
  const log = (line: string) => options.onLog?.(line)
  const today = amsterdamDate(now)
  const report = { postDate: today, enabled: postingEnabled(), actions: [] as string[] }
  const act = (line: string) => {
    report.actions.push(line)
    log(line)
  }

  // Each account's week: the Thursday its explainer belongs to, if it posts today.
  const weeks = new Map<string, Promise<ExplainerPost | null>>()
  const weekOf = (channel: ExplainerChannel) => {
    const date = addDays(today, -EXPLAINER_DAY_OFFSET[channel])
    if (!weeks.has(date)) weeks.set(date, getExplainer(date))
    return { date, post: weeks.get(date)! }
  }

  const failures: string[] = []
  for (const channel of EXPLAINER_CHANNELS) {
    const label = CHANNEL_LABEL[channel]
    const week = weekOf(channel)
    const postDate = week.date
    const post = await week.post
    if (!post) {
      log(`${label}: no explainer for the week of ${postDate}`)
      continue
    }
    const item = post[channel]
    if (!item || item.status !== 'approved') {
      log(`${label}: ${item?.status ?? 'nothing'}; nothing to do`)
      continue
    }
    if (!item.slides || !item.caption) {
      act(`${label}: approved but incomplete; not posting`)
      continue
    }
    const done = item.result
    if (done?.id) continue
    if ((done?.attempts ?? 0) >= MAX_ATTEMPTS) continue
    if (now < explainerPostAt(postDate, channel)) continue
    if (options.dryRun || !report.enabled) {
      act(`${options.dryRun ? 'dry run' : 'SOCIAL_POSTING is off'}: would post the explainer to ${label}`)
      continue
    }
    const attempts = (done?.attempts ?? 0) + 1
    let result: ChannelResult
    try {
      const token = await getToken(channel)
      if (!token) throw new Error(`${label} is not connected`)
      const urls = explainerSlidePaths(post, channel, 'jpg').map((p) => `${PUBLIC_ORIGIN}${p}`)
      const posted =
        channel === 'instagram'
          ? await publishInstagramCarousel({
              userId: token.accountId,
              token: token.accessToken,
              imageUrls: urls,
              caption: item.caption,
              http: options.http,
              sleep: options.sleep,
            })
          : await publishLinkedInDocument({
              token: token.accessToken,
              personUrn: token.accountId,
              imageUrls: urls,
              title: item.slides.cover.headline,
              caption: item.caption,
              http: options.http,
              sleep: options.sleep,
            })
      result = { at: now.toISOString(), id: posted.id, url: posted.url }
      act(`posted the explainer to ${label}: ${posted.url ?? posted.id}`)
      if (channel === 'instagram' && (await sendMusicReminder(approvers(), "Today's explainer", posted.url, trackFor('content')))) {
        act('mailed the music reminder')
      }
    } catch (err) {
      const message = (err as Error).message
      result = { at: now.toISOString(), error: message, attempts }
      act(`${label} failed (attempt ${attempts} of ${MAX_ATTEMPTS}): ${message}`)
      if (attempts === 1) failures.push(`${label}: ${message}`)
    }
    await patchItem(postDate, channel, { result, ...(result.id ? { status: 'posted' as const } : {}) })
  }

  if (options.dryRun || !report.enabled) return report
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
