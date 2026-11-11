/**
 * The weekly explainer's cycle.
 *
 * Wednesday 11:30: pick a source for each account and draft Thursday's two
 * explainers, then mail James a link to /review/social/explainer. Thursday,
 * hourly: post what he approved, in English on his LinkedIn at 09:00 and in
 * English on EA Nederland's Instagram at 19:00 (the same times as the jobs post,
 * so each account keeps one rhythm). The two never share a source.
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
 * Drafts the coming Thursday's explainers.
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
    `Thursday's explainers for ${day}, one per account, each from its own source:`,
    '',
    ...describe('linkedinPersonal'),
    ...describe('instagram'),
    `Check them, swap either for another suggestion, and approve each one: ${reviewLink()}`,
    '',
    'Nothing is posted until you approve it. The link signs you in for a week, so please do not forward this mail.',
  ]
  await sendMail({
    to,
    subject: ready.length === 2 ? 'Thursday’s explainers are ready to approve' : 'Thursday’s explainers need you',
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

  const failures: string[] = []
  for (const channel of EXPLAINER_CHANNELS) {
    const item = post[channel]
    const label = CHANNEL_LABEL[channel]
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
    if (now < channelPostAt(postDate, channel)) continue
    if (options.dryRun || !report.enabled) {
      act(`${options.dryRun ? 'dry run' : 'SOCIAL_POSTING is off'}: would post the explainer to ${label}`)
      continue
    }
    const attempts = (done?.attempts ?? 0) + 1
    let result: ChannelResult
    try {
      const token = await getToken(channel)
      if (!token) throw new Error(`${label} is not connected`)
      const urls = explainerSlidePaths(post, channel, channel === 'instagram' ? 'jpg' : 'png').map((p) => `${PUBLIC_ORIGIN}${p}`)
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
          : await publishLinkedInImages({
              token: token.accessToken,
              personUrn: token.accountId,
              imageUrls: urls,
              caption: item.caption,
              http: options.http,
            })
      result = { at: now.toISOString(), id: posted.id, url: posted.url }
      act(`posted the explainer to ${label}: ${posted.url ?? posted.id}`)
      const track = channel === 'instagram' && item.source ? trackFor({ kind: 'explainer', sourceKind: item.source.kind }) : null
      if (track && (await sendMusicReminder(approvers(), "Today's explainer", posted.url, track))) {
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
