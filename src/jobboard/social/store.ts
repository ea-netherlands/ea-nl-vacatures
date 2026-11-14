/**
 * Where each week's social post is kept: one Sanity document per Tuesday.
 *
 * Sanity rather than Postgres because the production database is migrated by
 * hand (README, Deployment), and a new table would sit unapplied until someone
 * remembered; the board already writes to Sanity from its crons with the same
 * token. It is written as a published document straight away and never goes
 * through the Studio's draft workflow: the editor is /review/social, and a
 * Studio draft over it would be a second, invisible copy. So the type is
 * deliberately not registered in the Studio schema.
 *
 * Status, in order:
 * - `draft`    — picked and captioned by the Monday cron (or by hand), waiting
 *                for James. Changes freely.
 * - `approved` — James said yes. Phase 3 posts approved documents; until then
 *                approval is what counts as "featured" for the no-repeats rule.
 * - `skipped`  — James said no for this week. Its jobs stay eligible.
 * - `posted`   — phase 3, once it is out.
 */

import { writeClient } from '../sanity/client'
import { BY_DATE_QUERY, byDateParams, legacySocialId, privateSocialId } from './private-ids'
import { SELECTION } from './select'
import type { ThemeKey } from './themes'

export type Channel = 'instagram' | 'linkedinOrg' | 'linkedinPersonal'
export const CHANNELS: Channel[] = ['instagram', 'linkedinOrg', 'linkedinPersonal']

export const CHANNEL_LABEL: Record<Channel, string> = {
  instagram: 'EA Netherlands on Instagram',
  linkedinOrg: 'EA Netherlands on LinkedIn',
  linkedinPersonal: 'James on LinkedIn',
}

/** The platforms' own caption limits. */
export const CHANNEL_LIMIT: Record<Channel, number> = {
  instagram: 2200,
  linkedinOrg: 3000,
  linkedinPersonal: 3000,
}

/** What the model writes; the code puts the job list and the links between them. */
export type CaptionParts = { hook: string; closing: string; hashtags: string[] }

/**
 * One account's outcome. `id`/`url` once it is up; `error` and `attempts` while
 * it keeps failing; `manual` for EA Nederland's LinkedIn page, which is posted
 * by hand: `reminded` once the reminder mail went, `id: 'manual'` once marked done.
 */
export type ChannelResult = {
  at: string
  id?: string
  url?: string | null
  error?: string
  attempts?: number
  manual?: boolean
  reminded?: boolean
}

export type PostStatus = 'draft' | 'approved' | 'skipped' | 'posted'

export type SocialPost = {
  _id: string
  _type: 'socialPost'
  /** Sanity's revision; changes on every write, so the editor remounts on it. */
  _rev?: string
  /** Posting day in Amsterdam, YYYY-MM-DD. Also the id suffix. */
  postDate: string
  postAt: string
  status: PostStatus
  /** Listing ids, in slide order. */
  listingIds: string[]
  /** The week's theme as posted; null on posts from before themes. */
  theme: ThemeKey | null
  /** The rotation's theme when it couldn't fill a post and this fell back to mixed. */
  fallbackFrom: ThemeKey | null
  parts: Record<Channel, CaptionParts> | null
  captions: Record<Channel, string> | null
  generatedAt: string | null
  approvedAt: string | null
  /** Set on approval: binds it to the exact listings and captions (approval.ts). */
  seal?: string | null
  /** What happened on each account on posting day (publish.ts). */
  results?: Partial<Record<Channel, ChannelResult>> | null
  /** The last thing that went wrong drafting it, shown on the page. */
  error: string | null
}

/** Private (dotted) id; see ./private-ids.ts. */
export const postId = (postDate: string) => privateSocialId('socialPost', postDate)

/** Amsterdam calendar day of an instant, YYYY-MM-DD. */
export function amsterdamDate(at: Date): string {
  return at.toLocaleDateString('en-CA', { timeZone: 'Europe/Amsterdam' })
}

export async function getPost(postDate: string): Promise<SocialPost | null> {
  return writeClient().fetch<SocialPost | null>(BY_DATE_QUERY, byDateParams('socialPost', postDate))
}

/**
 * Jobs approved or posted in the weeks before `postAt`, which the selection
 * leaves out. The post for `postAt` itself never counts against itself.
 */
export async function recentlyFeatured(postAt: Date): Promise<Set<string>> {
  const since = new Date(postAt.getTime() - SELECTION.repeatWeeks * 7 * 864e5).toISOString()
  const rows = await writeClient().fetch<{ listingIds: string[] | null }[]>(
    `*[_type == "socialPost" && status in ["approved", "posted"] && postAt >= $since && postAt < $until]{ listingIds }`,
    { since, until: postAt.toISOString() },
  )
  return new Set(rows.flatMap((r) => r.listingIds ?? []))
}

/** Saves a week's post on its private id, removing any public copy from before the move. */
export async function savePost(post: Omit<SocialPost, '_type'>): Promise<SocialPost> {
  const doc = { ...post, _id: postId(post.postDate), _type: 'socialPost' as const }
  await writeClient()
    .transaction()
    .createOrReplace(doc)
    .delete(legacySocialId('socialPost', post.postDate))
    .commit()
  return (await getPost(post.postDate)) ?? (doc as SocialPost)
}

export async function patchPost(postDate: string, set: Partial<Omit<SocialPost, '_id' | '_type'>>): Promise<SocialPost> {
  // Patch whichever copy exists: a week saved before the move is still on its old id.
  const current = await getPost(postDate)
  return writeClient()
    .patch(current?._id ?? postId(postDate))
    .set(set)
    .commit<SocialPost>()
}
