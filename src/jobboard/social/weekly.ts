/**
 * Monday: draft Tuesday's post and ask James to approve it.
 *
 * Picks the jobs (select.ts, minus anything approved in the last four weeks),
 * has the model write the captions (captions.ts), saves the draft (store.ts)
 * and mails a signed link to /review/social. Nothing is posted here; phase 3
 * posts what James approves.
 *
 * It never overwrites a post James has already decided on. A draft is
 * redrafted only with `force`, which is what the page's "Redraft" button
 * sends, so a second cron run on the same Monday can't throw away his edits.
 */

import { isMailConfigured, sendMail } from '../lib/mail'
import { ADMIN_ORIGIN } from '../lib/seo'
import { issueToken, LINK_TTL_MS } from '../review/auth'
import { digestRecipients } from '../review/digest'
import { getListingsByIds, getLiveListings } from '../sanity/queries'
import { compose, draftCaptionParts } from './captions'
import { isLocal, nextPostTime, SELECTION, selectForWeek } from './select'
import { THEMES, type ThemeKey } from './themes'
import {
  amsterdamDate,
  CHANNELS,
  getPost,
  recentlyFeatured,
  savePost,
  type CaptionParts,
  type Channel,
  type SocialPost,
} from './store'
import { bandOf } from '../lib/bands'
import { refreshInstagramToken } from './instagram'
import { maintainConnections } from './tokens'

export type WeeklyReport = {
  postDate: string
  status: SocialPost['status'] | 'unchanged' | 'dry run'
  jobs: string[]
  mailed: string[]
  skippedReason: string | null
}

/** Who approves. Defaults to the review digest's recipients. */
export function approvers(): string[] {
  const own = (process.env.SOCIAL_DIGEST_TO ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return own.length ? own : digestRecipients()
}

export function socialLink(): string {
  const url = new URL('/api/review/session', ADMIN_ORIGIN)
  url.searchParams.set('t', issueToken('link', LINK_TTL_MS))
  url.searchParams.set('next', 'social')
  return url.toString()
}

const longDay = (at: Date) =>
  at.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' })

/** Captions from parts, for whichever listings the post now holds. */
export async function composeAll(
  post: Pick<SocialPost, 'listingIds' | 'postDate' | 'theme'>,
  parts: Record<Channel, CaptionParts>,
) {
  const listings = await getListingsByIds(post.listingIds)
  return Object.fromEntries(
    CHANNELS.map((c) => [c, compose(c, parts[c], listings, post.postDate, post.theme ?? 'mixed')]),
  ) as Record<
    Channel,
    string
  >
}

/**
 * Picks the jobs and writes the captions for the next Tuesday, and saves it as
 * a draft. Returns the saved post, or the existing one if James has decided.
 */
export async function draftPost(options: {
  force?: boolean
  now?: Date
  /** Overrides the rotation for this week (the page's theme switch). */
  theme?: ThemeKey
  onLog?: (line: string) => void
}): Promise<{ post: SocialPost; changed: boolean }> {
  const log = (line: string) => options.onLog?.(line)
  const postAt = nextPostTime(options.now)
  const postDate = amsterdamDate(postAt)

  const existing = await getPost(postDate)
  if (existing && (existing.status !== 'draft' || !options.force)) {
    log(`post for ${postDate} already exists (${existing.status}); left alone`)
    return { post: existing, changed: false }
  }

  const [listings, recent] = await Promise.all([getLiveListings({ excludeEarningToGive: true }), recentlyFeatured(postAt)])
  const selection = selectForWeek(listings, { postAt, recentlyFeatured: recent, theme: options.theme })
  log(
    `picked ${selection.picks.length} of ${listings.length} live roles for "${THEMES[selection.theme].label}"` +
      (selection.fallbackFrom ? ` (${THEMES[selection.fallbackFrom].label} had too few)` : '') +
      ` (${recent.size} featured recently)`,
  )

  const base = {
    _id: `socialPost-${postDate}`,
    postDate,
    postAt: postAt.toISOString(),
    status: 'draft' as const,
    listingIds: selection.picks.map((p) => p.listing.id),
    theme: selection.theme,
    fallbackFrom: selection.fallbackFrom,
    approvedAt: null,
    generatedAt: new Date().toISOString(),
  }

  if (!selection.enough) {
    const post = await savePost({ ...base, parts: null, captions: null, error: null })
    log(`only ${selection.picks.length} roles qualify (need ${SELECTION.min}); saved without captions`)
    return { post, changed: true }
  }

  try {
    const parts = await draftCaptionParts(
      selection.picks.map((p) => ({ listing: p.listing, band: p.band })),
      longDay(postAt),
      selection.theme,
    )
    const captions = Object.fromEntries(
      CHANNELS.map((c) => [c, compose(c, parts[c], selection.picks.map((p) => p.listing), postDate, selection.theme)]),
    ) as Record<Channel, string>
    const post = await savePost({ ...base, parts, captions, error: null })
    log(`drafted captions for ${postDate}`)
    return { post, changed: true }
  } catch (err) {
    // Save the picks anyway, so the page still shows the slides and says why
    // the captions are missing.
    const message = (err as Error).message
    const post = await savePost({ ...base, parts: null, captions: null, error: `Captions failed: ${message}` })
    log(`captions failed: ${message}`)
    return { post, changed: true }
  }
}

/** Rewrites the job lists in the captions after a job was removed, keeping the model's parts. */
export async function recompose(post: SocialPost): Promise<Record<Channel, string> | null> {
  if (!post.parts) return null
  return composeAll(post, post.parts)
}

function mailText(post: SocialPost, titles: string[], link: string, hasLocal: boolean, notes: string[]): string {
  const day = longDay(new Date(post.postAt))
  const theme = THEMES[post.theme ?? 'mixed']
  const lines = [
    `This week's theme: ${theme.label}.` +
      (post.fallbackFrom ? ` (The rotation had ${THEMES[post.fallbackFrom].label}, but too few roles qualified, so it fell back to a mixed post.)` : ''),
    '',
    post.listingIds.length >= SELECTION.min
      ? `The jobs post for ${day} is ready for you: ${titles.length} roles, with captions for Instagram, EA Netherlands' LinkedIn and yours.`
      : `Only ${post.listingIds.length} roles qualify for ${day}, fewer than the ${SELECTION.min} a post needs. Have a look and skip the week if it stays that way.`,
    '',
    `Check, edit and approve it: ${link}`,
    '',
    ...titles.map((t, i) => `${i + 1}. ${t}`),
    '',
  ]
  if (!hasLocal && post.listingIds.length) {
    lines.push('None of these roles is done in the Netherlands; they are all remote or abroad. Worth swapping one for a local role before you approve.', '')
  }
  if (post.error) lines.push(post.error, '')
  if (notes.length) lines.push(...notes, '')
  lines.push('Nothing is posted until you approve it. The link signs you in for a week, so please do not forward this mail.')
  return lines.join('\n')
}

/** The Monday cron. */
export async function runWeeklySocial(
  options: { dryRun?: boolean; force?: boolean; onLog?: (line: string) => void } = {},
): Promise<WeeklyReport> {
  const log = (line: string) => options.onLog?.(line)
  const postAt = nextPostTime()
  const postDate = amsterdamDate(postAt)

  if (options.dryRun) {
    const [listings, recent] = await Promise.all([
      getLiveListings({ excludeEarningToGive: true }),
      recentlyFeatured(postAt).catch(() => new Set<string>()),
    ])
    const selection = selectForWeek(listings, { postAt, recentlyFeatured: recent })
    const jobs = selection.picks.map((p) => `${p.listing.title} (${p.listing.employer?.name}, ${bandOf(p.listing)})`)
    log(`dry run: would draft ${postDate} as "${THEMES[selection.theme].label}" with ${jobs.length} roles`)
    return { postDate, status: 'dry run', jobs, mailed: [], skippedReason: 'dry run' }
  }

  const { post, changed } = await draftPost({ force: options.force, onLog: options.onLog })
  // Keep the accounts connected; anything that needs James goes in the mail.
  const notes = await maintainConnections((t) => refreshInstagramToken(t)).catch((err) => [
    `Couldn't check the social connections: ${(err as Error).message}`,
  ])
  const listings = await getListingsByIds(post.listingIds)
  const titles = listings.map((l) => `${l.title}, ${l.employer?.name ?? ''}`)
  const report: WeeklyReport = { postDate, status: changed ? post.status : 'unchanged', jobs: titles, mailed: [], skippedReason: null }
  if (!changed) return { ...report, skippedReason: `already ${post.status}` }

  const to = approvers()
  if (!to.length) return { ...report, skippedReason: 'SOCIAL_DIGEST_TO and REVIEW_DIGEST_TO not set' }
  if (!isMailConfigured()) return { ...report, skippedReason: 'RESEND_API_KEY not set' }

  const subject =
    post.listingIds.length >= SELECTION.min
      ? `Tuesday's jobs post is ready to approve`
      : `Not enough roles for Tuesday's jobs post`
  await sendMail({ to, subject, text: mailText(post, titles, socialLink(), listings.some(isLocal), notes) })
  log(`mailed ${to.join(', ')}`)
  return { ...report, mailed: to }
}
