/**
 * Tuesday: post the approved week to each account at its own time.
 *
 * Runs hourly on Tuesdays (vercel.json). Each account has its own time
 * (James, 9 Nov 2026): LinkedIn in the morning, when people read it at the
 * start of the working day; Instagram in the evening, when EA Nederland's
 * mostly Dutch, 25–44 followers use it. Business Suite no longer shows when
 * followers are online and the account has too few posts to compare, so these
 * are starting points to revisit with each post's reach.
 *
 * Nothing posts unless SOCIAL_POSTING is "on" in the environment: the switch
 * for a first run, and for stopping everything without a deploy.
 *
 * A failed account is retried on the next hourly run, at most three times, and
 * James is mailed on the first failure. EA Nederland's LinkedIn page can't be
 * posted by API until LinkedIn approves the Community Management API, so at
 * its time James gets a reminder with the bundle on /review/social instead.
 */

import { isMailConfigured, sendMail } from '../lib/mail'
import { ADMIN_ORIGIN } from '../lib/seo'
import { getListingsByIds } from '../sanity/queries'
import { postSlides, slidePath } from './content'
import { publishInstagramCarousel } from './instagram'
import { publishLinkedInImages } from './linkedin'
import { amsterdamDate, CHANNEL_LABEL, getPost, patchPost, type Channel, type ChannelResult } from './store'
import { getToken, type TokenChannel } from './tokens'
import { sendMusicReminder, TRACKS } from './music'
import { approvers } from './weekly'

/** Amsterdam wall-clock time each account posts at, on the post's Tuesday. */
export const CHANNEL_TIME: Record<Channel, { hour: number; minute: number }> = {
  linkedinOrg: { hour: 9, minute: 0 },
  linkedinPersonal: { hour: 9, minute: 0 },
  instagram: { hour: 19, minute: 0 },
}

/** Posted by the API; EA Nederland's LinkedIn page is by hand for now. */
export const AUTO_CHANNELS: TokenChannel[] = ['linkedinPersonal', 'instagram']

const MAX_ATTEMPTS = 3

/** The public origin Instagram and LinkedIn fetch the slides from. */
const PUBLIC_ORIGIN = 'https://effectiefaltruisme.nl'

/** `postDate` (YYYY-MM-DD) at the account's Amsterdam time, as a UTC instant. */
export function channelPostAt(postDate: string, channel: Channel): Date {
  const { hour, minute } = CHANNEL_TIME[channel]
  const [y, m, d] = postDate.split('-').map(Number)
  const guess = new Date(Date.UTC(y, m - 1, d, hour, minute))
  // Amsterdam is UTC+1 in winter, UTC+2 in summer: read the offset at that moment.
  const shown = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hourCycle: 'h23' }).format(guess),
  )
  return new Date(guess.getTime() - ((shown - hour + 24) % 24) * 36e5)
}

export function postingEnabled(): boolean {
  return process.env.SOCIAL_POSTING === 'on'
}

export type PublishReport = {
  postDate: string
  enabled: boolean
  actions: string[]
}

type Deps = {
  http?: typeof fetch
  sleep?: (ms: number) => Promise<void>
}

export async function runSocialPublish(
  options: { now?: Date; dryRun?: boolean; onLog?: (line: string) => void } & Deps = {},
): Promise<PublishReport> {
  const now = options.now ?? new Date()
  const log = (line: string) => options.onLog?.(line)
  const postDate = amsterdamDate(now)
  const report: PublishReport = { postDate, enabled: postingEnabled(), actions: [] }
  const act = (line: string) => {
    report.actions.push(line)
    log(line)
  }

  const post = await getPost(postDate)
  if (!post) return (log(`no post for ${postDate}`), report)
  if (post.status !== 'approved') return (log(`post for ${postDate} is ${post.status}; nothing to do`), report)
  if (!post.captions) return (act('approved but has no captions; not posting'), report)

  const results: Partial<Record<Channel, ChannelResult>> = { ...(post.results ?? {}) }
  const listings = await getListingsByIds(post.listingIds)
  const slides = postSlides(listings, postDate, post.theme ?? 'mixed')
  const failures: string[] = []

  for (const channel of AUTO_CHANNELS) {
    const done = results[channel]
    if (done?.id) continue
    if ((done?.attempts ?? 0) >= MAX_ATTEMPTS) continue
    if (now < channelPostAt(postDate, channel)) continue
    const label = CHANNEL_LABEL[channel]

    if (options.dryRun || !report.enabled) {
      act(`${options.dryRun ? 'dry run' : 'SOCIAL_POSTING is off'}: would post to ${label}`)
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
              imageUrls: slides.map((s) => `${PUBLIC_ORIGIN}${slidePath(s, 'jpg')}`),
              caption: post.captions.instagram,
              http: options.http,
              sleep: options.sleep,
            })
          : await publishLinkedInImages({
              token: token.accessToken,
              personUrn: token.accountId,
              imageUrls: slides.map((s) => `${PUBLIC_ORIGIN}${slidePath(s)}`),
              caption: post.captions.linkedinPersonal,
              http: options.http,
            })
      results[channel] = { at: now.toISOString(), id: result.id, url: result.url }
      act(`posted to ${label}: ${result.url ?? result.id}`)
      if (channel === 'instagram') {
        if (await sendMusicReminder(approvers(), "Today's jobs post", result.url, TRACKS.jobs)) act('mailed the music reminder')
      }
    } catch (err) {
      const message = (err as Error).message
      results[channel] = { at: now.toISOString(), error: message, attempts }
      act(`${label} failed (attempt ${attempts} of ${MAX_ATTEMPTS}): ${message}`)
      if (attempts === 1) failures.push(`${label}: ${message}`)
    }
  }

  // EA Nederland's LinkedIn page: a reminder to post the bundle by hand.
  const remind = !results.linkedinOrg && now >= channelPostAt(postDate, 'linkedinOrg') && report.enabled && !options.dryRun
  if (remind) results.linkedinOrg = { at: now.toISOString(), manual: true, reminded: true }

  if (options.dryRun || !report.enabled) return report

  const allPosted = AUTO_CHANNELS.every((c) => results[c]?.id)
  await patchPost(postDate, { results, ...(allPosted ? { status: 'posted' as const } : {}) })
  if (allPosted) act('every connected account is posted')

  const to = approvers()
  if ((failures.length || remind) && to.length && isMailConfigured()) {
    const link = `${ADMIN_ORIGIN}/review/social`
    const lines: string[] = []
    if (failures.length) {
      lines.push(
        "Today's jobs post didn't go out everywhere:",
        '',
        ...failures.map((f) => `- ${f}`),
        '',
        `It retries on the next hourly run, up to ${MAX_ATTEMPTS} times. Details: ${link}`,
        '',
      )
    }
    if (remind) {
      lines.push(
        "Time to post today's jobs post on EA Netherlands' LinkedIn page. The slides and the caption are ready to download and copy:",
        link,
        '',
        'Mark it as posted there afterwards.',
      )
    }
    await sendMail({
      to,
      subject: failures.length ? "Today's jobs post failed on " + failures.map((f) => f.split(':')[0]).join(' and ') : "Post today's jobs on EA Netherlands' LinkedIn",
      text: lines.join('\n'),
    })
  }
  return report
}
