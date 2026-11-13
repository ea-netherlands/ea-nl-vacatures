/**
 * The weekly explainer: one Sanity document per Thursday, beside the jobs
 * post's (../store.ts), for the same reasons: written as a published document
 * straight away, edited only on /review/social/explainer, and not registered
 * in the Studio.
 *
 * Each account gets its own explainer from its own source (James, 11 Nov
 * 2026), so someone who follows both doesn't see the same carousel twice: one
 * for James's LinkedIn, one for EA Nederland's Instagram. Both in English
 * (James, 11 Nov 2026: he can't review Dutch with confidence).
 * Each has its own status (draft → approved → posted, or skipped), so one can
 * go out while the other is skipped.
 */

import { writeClient } from '../../sanity/client'
import type { ChannelResult, PostStatus } from '../store'
import { sourceKey, type SourceRef } from './sources'

/** The accounts an explainer goes to. */
export type ExplainerChannel = 'linkedinPersonal' | 'instagram'
export const EXPLAINER_CHANNELS: ExplainerChannel[] = ['linkedinPersonal', 'instagram']
/** Short forms for slide URLs. */
export const CHANNEL_CODE: Record<ExplainerChannel, string> = { linkedinPersonal: 'li', instagram: 'ig' }
export const EXPLAINER_LIMIT: Record<ExplainerChannel, number> = { linkedinPersonal: 3000, instagram: 2200 }

export const isExplainerChannel = (v: unknown): v is ExplainerChannel => v === 'linkedinPersonal' || v === 'instagram'

/**
 * One explainer's slides. The cover's `marked` is the phrase of its headline
 * that carries the yellow marker; the closing slide (credit, newsletter) is
 * drawn by the code and isn't stored.
 */
export type SlideText = {
  cover: { headline: string; marked: string; sub: string }
  points: { heading: string; body: string }[]
}

/** A source James was offered, with why it was suggested. */
export type Suggestion = SourceRef & { reason: string; topic: string }

/** One account's explainer for the week. */
export type ExplainerItem = {
  status: PostStatus
  source: SourceRef | null
  /** Short label for the topic ("Farmed animal welfare"), for rotating topics. */
  topic: string | null
  /** The other good candidates for this account, best first, to swap to. */
  suggestions: Suggestion[]
  slides: SlideText | null
  caption: string | null
  /** Things to check before approving: US-only figures, dates, claims the model wasn't sure of. */
  flags: string[]
  generatedAt: string | null
  approvedAt: string | null
  result?: ChannelResult | null
  error: string | null
}

export type ExplainerPost = {
  _id: string
  _type: 'explainerPost'
  _rev?: string
  /** The week's Thursday in Amsterdam, YYYY-MM-DD (Instagram posts the Sunday after). Also the id suffix. */
  postDate: string
  postAt: string
  linkedinPersonal: ExplainerItem | null
  instagram: ExplainerItem | null
  /** Source keys James turned down this week; never suggested again. */
  passed: string[]
}

export const explainerId = (postDate: string) => `explainerPost-${postDate}`

export async function getExplainer(postDate: string): Promise<ExplainerPost | null> {
  return writeClient().fetch<ExplainerPost | null>(`*[_id == $id][0]`, { id: explainerId(postDate) })
}

/**
 * Sources never to suggest again: anything approved, posted or skipped on
 * either account, and anything James passed on. Plus the latest topics, so
 * the weeks rotate.
 */
export async function usedSources(): Promise<{ used: Set<string>; recentTopics: string[] }> {
  const rows = await writeClient().fetch<
    Pick<ExplainerPost, 'linkedinPersonal' | 'instagram' | 'passed'>[]
  >(`*[_type == "explainerPost"] | order(postDate desc){ linkedinPersonal, instagram, passed }`)
  const used = new Set<string>()
  const recentTopics: string[] = []
  for (const r of rows) {
    for (const c of EXPLAINER_CHANNELS) {
      const item = r[c]
      if (!item?.source) continue
      if (item.status !== 'draft') used.add(sourceKey(item.source))
      if ((item.status === 'approved' || item.status === 'posted') && item.topic) recentTopics.push(item.topic)
    }
    for (const k of r.passed ?? []) used.add(k)
  }
  return { used, recentTopics: recentTopics.slice(0, 6) }
}

export async function saveExplainer(post: Omit<ExplainerPost, '_type'>): Promise<ExplainerPost> {
  return writeClient().createOrReplace<ExplainerPost>({ ...post, _type: 'explainerPost' })
}

/** Sets fields on one account's explainer. */
export async function patchItem(
  postDate: string,
  channel: ExplainerChannel,
  set: Partial<ExplainerItem>,
): Promise<ExplainerPost> {
  // The whole item, not `channel.field` paths: Sanity can't set into a null.
  const post = await getExplainer(postDate)
  const current = post?.[channel]
  if (!post || !current) throw new Error('There is no explainer for that account this week.')
  return writeClient()
    .patch(explainerId(postDate))
    .ifRevisionId(post._rev!)
    .set({ [channel]: { ...current, ...set } })
    .commit<ExplainerPost>()
}

export async function patchExplainer(
  postDate: string,
  set: Partial<Omit<ExplainerPost, '_id' | '_type'>>,
): Promise<ExplainerPost> {
  return writeClient().patch(explainerId(postDate)).set(set).commit<ExplainerPost>()
}
