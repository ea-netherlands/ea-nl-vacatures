/**
 * The charity deep dive's week.
 *
 * Thursday 11:30 (James doesn't work Fridays): pick a charity for each account and draft next week's two
 * deep dives, then mail James a link to /review/social/charity. Then post
 * what he approved, both on Monday: on his LinkedIn at 09:00, on EA
 * Nederland's Instagram at 18:00 (../explainer/series.ts has the whole week).
 * Posting itself is the explainer's (runExplainerPublish with this series).
 *
 * Picking is a rotation, not a judgement: each account works through Doneer
 * Effectief's individual top charities, the one it featured longest ago
 * first, and the two accounts never take the same charity in a week. With
 * ten charities an account comes back to one after about ten weeks, by which
 * time the evaluators have often updated their report.
 *
 * Some evaluators' sites turn automated readers away (GiveWell's, 18 Nov
 * 2026). The cron then moves on to the next charity it can read and says so;
 * James can still do the skipped one by pasting the report's text on the
 * review page.
 */

import { isMailConfigured, sendMail } from '../../lib/mail'
import { ref } from '../explainer/draft'
import { CHARITY } from '../explainer/series'
import { sourceKey, type SourceRef } from '../explainer/sources'
import {
  EXPLAINER_CHANNELS,
  explainerId,
  getExplainer,
  saveExplainer,
  seriesHistory,
  type ExplainerChannel,
  type ExplainerItem,
  type ExplainerPost,
  type Suggestion,
} from '../explainer/store'
import { clock, dayName, explainerPostAt, nextExplainerTime, reviewLink, type ExplainerReport } from '../explainer/weekly'
import { amsterdamDate } from '../store'
import { approvers } from '../weekly'
import { asCandidate, reportTexts, topCharities, type Charity, type Report } from './catalogue'
import { draftCharity } from './draft'

type History = Awaited<ReturnType<typeof seriesHistory>>

const key = (slug: string) => sourceKey({ kind: 'charity', id: slug })

/**
 * The charities in the order one account should take them: never featured
 * first (in Doneer Effectief's order, causes taken in turn), then the one
 * featured longest ago. Instagram starts halfway down the list, so the two
 * accounts don't trail each other by a week.
 */
export function rotation(charities: Charity[], history: History, channel: ExplainerChannel): Charity[] {
  // Causes in turn: health, climate, animals, health, …
  const byCause = new Map<string, Charity[]>()
  for (const c of charities) byCause.set(c.cause, [...(byCause.get(c.cause) ?? []), c])
  const queues = [...byCause.values()].map((q) => [...q])
  const turn: Charity[] = []
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) turn.push(q.shift()!)
  const start = channel === 'instagram' ? Math.floor(turn.length / 2) : 0
  const base = [...turn.slice(start), ...turn.slice(0, start)]

  const last = new Map<string, string>()
  for (const week of history) {
    const item = week[channel]
    // A draft isn't a decision; approved, posted and skipped all move the rotation on.
    if (!item?.source || item.status === 'draft') continue
    const k = sourceKey(item.source)
    if (!last.has(k) || week.postDate > last.get(k)!) last.set(k, week.postDate)
  }
  return base
    .map((c, i) => ({ c, i, at: last.get(key(c.slug)) ?? '' }))
    .sort((a, b) => a.at.localeCompare(b.at) || a.i - b.i)
    .map((x) => x.c)
}

const suggestion = (c: Charity, reason: string): Suggestion => ({ ...ref(asCandidate(c)), reason, topic: c.cause })

const reasonFor = (c: Charity) =>
  `${c.cause}. Recommended by ${c.recommendedBy ?? c.reports[0].evaluator}; next in the rotation.`

/** Checks James's own description of the evaluator against the page's, for a flag. */
function labelFlag(c: Charity, report: Report): string[] {
  if (!c.recommendedBy || c.recommendedBy.toLowerCase() === report.evaluator.toLowerCase()) return []
  return [
    `Doneer Effectief’s page says “Aanbevolen door ${c.recommendedBy}”, but the report this was written from is ${report.evaluator}’s. The slides credit ${report.evaluator}.`,
  ]
}

const BASE = { status: 'draft' as const, approvedAt: null, result: null }

/** Drafts one account's deep dive on one charity. Throws if no report can be read. */
async function draftOne(
  charity: Charity,
  channel: ExplainerChannel,
  postDate: string,
  pasted: string | undefined,
  guidance: string | undefined,
): Promise<Pick<ExplainerItem, 'source' | 'topic' | 'slides' | 'caption' | 'flags' | 'guidance' | 'error'>> {
  const { read, problems } = pasted
    ? { read: [{ ...charity.reports[0], text: pasted.slice(0, 90_000) }], problems: [] as string[] }
    : await reportTexts(charity)
  const source: SourceRef = ref(asCandidate(charity, read[0]))
  const draft = await draftCharity(charity, source, read, { channel, postDate, guidance })
  return {
    source,
    topic: charity.cause,
    slides: draft.slides,
    caption: draft.caption,
    flags: [...labelFlag(charity, read[0]), ...problems, ...draft.flags],
    guidance: guidance || null,
    error: null,
  }
}

/**
 * Drafts the week's deep dives (the week nextExplainerTime gives for this
 * series). Same shape as the explainer's draftExplainer:
 * - no `channel`: both accounts that have nothing yet (the cron, the first "Draft");
 * - `channel` + `force`: redraft that account's draft;
 * - `source`: from that charity instead ("Use this one", and Redraft);
 * - `pass`: move on to the next charity this week ("Not this one");
 * - `pasted`: the report's text, pasted by James, for a report the server can't fetch;
 * - `guidance`: James's note for the model on this draft ("Redraft with guidance").
 */
export async function draftCharityWeek(options: {
  channel?: ExplainerChannel
  force?: boolean
  source?: string
  pass?: boolean
  pasted?: string
  guidance?: string
  now?: Date
  onLog?: (line: string) => void
}): Promise<{ post: ExplainerPost; changed: boolean }> {
  const log = (line: string) => options.onLog?.(line)
  const postAt = nextExplainerTime(options.now, CHARITY)
  const postDate = amsterdamDate(postAt)
  const existing = await getExplainer(postDate, CHARITY)

  const targets = (options.channel ? [options.channel] : EXPLAINER_CHANNELS).filter((c) => {
    const item = existing?.[c]
    return !item || (item.status === 'draft' && options.force)
  })
  if (options.pasted && !options.channel) throw new Error('Which account is the pasted report for?')
  if ((options.pasted || options.source) && !targets.length) {
    throw new Error('This account’s deep dive is decided. Reopen it first.')
  }
  if (existing && !targets.length) {
    log(`deep dives for ${postDate} already exist; left alone`)
    return { post: existing, changed: false }
  }

  const passed = new Set(existing?.passed ?? [])
  if (options.pass && options.channel && existing?.[options.channel]?.source) {
    passed.add(sourceKey(existing[options.channel]!.source!))
  }

  const [{ charities, problems }, history] = await Promise.all([topCharities(), seriesHistory(CHARITY)])
  for (const p of problems) log(p)
  const bySlug = new Map(charities.map((c) => [key(c.slug), c]))

  // Charities this week's other account has, which this one mustn't take.
  const taken = new Set<string>()
  for (const c of EXPLAINER_CHANNELS) {
    const source = existing?.[c]?.source
    if (!targets.includes(c) && source) taken.add(sourceKey(source))
  }

  const items: Partial<Record<ExplainerChannel, ExplainerItem>> = {}
  for (const channel of targets) {
    const queue = rotation(charities, history, channel).filter((c) => !taken.has(key(c.slug)) && !passed.has(key(c.slug)))
    const chosen = options.source ? bySlug.get(options.source) : undefined
    if (options.source && !chosen) throw new Error('Doneer Effectief no longer lists that charity.')
    if (chosen && taken.has(key(chosen.slug))) throw new Error('The other account has that charity this week.')
    // A named charity, or one with pasted text, is tried alone; the cron works down the rotation.
    const current = existing?.[channel]?.source ? bySlug.get(sourceKey(existing[channel]!.source!)) : undefined
    const named = chosen ?? (options.pasted ? current : undefined)
    if (options.pasted && !named) throw new Error('Pick the charity first, then paste its report.')
    const tries = named ? [named] : queue.slice(0, 5)
    const base = { ...BASE, generatedAt: new Date().toISOString() }
    const skipped: string[] = []
    let item: ExplainerItem | null = null
    let first: Charity | null = null
    for (const charity of tries) {
      first ??= charity
      log(`${channel}: drafting ${charity.name}`)
      try {
        const drafted = await draftOne(charity, channel, postDate, named ? options.pasted : undefined, options.guidance)
        taken.add(key(charity.slug))
        item = { ...base, ...drafted, suggestions: [], error: skipped.length ? skipped.join(' ') : null }
        break
      } catch (err) {
        const message = (err as Error).message
        log(`${channel}: ${charity.name}: ${message}`)
        skipped.push(`${charity.name} was next, but its report couldn’t be read by the server. Choose it below and paste the report’s text to do it anyway.`)
        if (named) {
          item = {
            ...base,
            source: ref(asCandidate(charity)),
            topic: charity.cause,
            suggestions: [],
            slides: null,
            caption: null,
            flags: [],
            error: `Drafting failed: ${message} If the evaluator’s site turns automated readers away, open the report yourself and paste its text below.`,
          }
        }
      }
    }
    if (!item) {
      item = {
        ...base,
        source: first ? ref(asCandidate(first)) : null,
        topic: first?.cause ?? null,
        suggestions: [],
        slides: null,
        caption: null,
        flags: [],
        error: first ? skipped.join(' ') : ['No charity left to feature this week.', ...problems].join(' '),
      }
    }
    const mine = item.source ? sourceKey(item.source) : null
    item.suggestions = queue
      .filter((c) => key(c.slug) !== mine && !taken.has(key(c.slug)))
      .slice(0, 6)
      .map((c) => suggestion(c, reasonFor(c)))
    items[channel] = item
  }

  const post = await saveExplainer(
    {
      _id: explainerId(postDate, CHARITY),
      postDate,
      postAt: postAt.toISOString(),
      linkedinPersonal: items.linkedinPersonal ?? existing?.linkedinPersonal ?? null,
      instagram: items.instagram ?? existing?.instagram ?? null,
      passed: [...passed],
    },
    CHARITY,
  )
  return { post, changed: true }
}

/** The Thursday cron. */
export async function runWeeklyCharity(
  options: { dryRun?: boolean; force?: boolean; channel?: ExplainerChannel; source?: string; onLog?: (line: string) => void } = {},
): Promise<ExplainerReport> {
  const log = (line: string) => options.onLog?.(line)
  const postAt = nextExplainerTime(undefined, CHARITY)
  const postDate = amsterdamDate(postAt)

  if (options.dryRun) {
    const [{ charities, problems }, history] = await Promise.all([
      topCharities(),
      seriesHistory(CHARITY).catch(() => [] as History),
    ])
    const order = Object.fromEntries(EXPLAINER_CHANNELS.map((c) => [c, rotation(charities, history, c)]))
    for (const c of EXPLAINER_CHANNELS) log(`${c}: ${order[c].map((x) => x.name).join(' → ')}`)
    return {
      postDate,
      status: 'dry run',
      source: EXPLAINER_CHANNELS.map((c) => order[c][0]?.name ?? '-').join(' | '),
      mailed: [],
      note: problems.join(' ') || null,
    }
  }

  const { post, changed } = await draftCharityWeek({
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

  const when = (c: ExplainerChannel) => {
    const at = explainerPostAt(postDate, c, CHARITY)
    return `${dayName(at)} at ${clock(at)}`
  }
  const describe = (c: ExplainerChannel) => {
    const item = post[c]
    const where = c === 'linkedinPersonal' ? 'For your LinkedIn' : "For EA Netherlands' Instagram"
    if (!item?.slides || !item.source) return [`${where}: couldn't be drafted. ${item?.error ?? ''}`.trim(), '']
    return [
      `${where}: ${item.source.title}, from ${item.source.author}'s evaluation.`,
      ...(item.error ? [item.error] : []),
      ...(item.flags.length ? ['Worth checking:', ...item.flags.map((f) => `- ${f}`)] : []),
      '',
    ]
  }
  const ready = EXPLAINER_CHANNELS.filter((c) => post[c]?.slides)
  await sendMail({
    to,
    subject: ready.length === 2 ? 'Next week’s charity deep dives are ready to approve' : 'Next week’s charity deep dives need you',
    text: [
      `Next week's charity deep dives, one per account, each on a different one of Doneer Effectief's top charities: for your LinkedIn on ${when('linkedinPersonal')}, for Instagram on ${when('instagram')}.`,
      '',
      ...describe('linkedinPersonal'),
      ...describe('instagram'),
      `Check the figures against the reports, swap either for another charity, and approve each one: ${reviewLink(CHARITY)}`,
      '',
      'Nothing is posted until you approve it. The link signs you in for a week, so please do not forward this mail.',
    ].join('\n'),
  })
  log(`mailed ${to.join(', ')}`)
  return { ...report, mailed: to }
}
