/**
 * The weekly explainer: one Sanity document per Thursday, beside the jobs
 * post's (../store.ts), for the same reasons: written as a published document
 * straight away, edited only on /review/social/explainer, and not registered
 * in the Studio.
 *
 * Two languages from one draft: English slides and caption for James's own
 * LinkedIn, Dutch slides and caption for EA Nederland's Instagram (James, 11
 * Nov 2026). English is drafted first and the Dutch follows it, so a fix made
 * in English is the fix both get.
 *
 * Status works as on the jobs post: draft → approved → posted, or skipped.
 */

import { writeClient } from '../../sanity/client'
import type { ChannelResult, PostStatus } from '../store'
import { sourceKey, type SourceRef } from './sources'

export type Lang = 'en' | 'nl'
export const LANGS: Lang[] = ['en', 'nl']

/** The accounts an explainer goes to, and in which language. */
export type ExplainerChannel = 'linkedinPersonal' | 'instagram'
export const EXPLAINER_LANG: Record<ExplainerChannel, Lang> = { linkedinPersonal: 'en', instagram: 'nl' }
export const EXPLAINER_LIMIT: Record<ExplainerChannel, number> = { linkedinPersonal: 3000, instagram: 2200 }

/**
 * One language's slides. The cover's `marked` is the phrase of its headline
 * that carries the yellow marker; the closing slide (credit, newsletter) is
 * drawn by the code and isn't stored.
 */
export type SlideText = {
  cover: { headline: string; marked: string; sub: string }
  points: { heading: string; body: string }[]
}

/** A source James was offered, with why it was suggested. */
export type Suggestion = SourceRef & { reason: string; topic: string }

export type ExplainerPost = {
  _id: string
  _type: 'explainerPost'
  _rev?: string
  /** Thursday in Amsterdam, YYYY-MM-DD. Also the id suffix. */
  postDate: string
  postAt: string
  status: PostStatus
  source: SourceRef | null
  /** Short label for the topic ("Farmed animal welfare"), for rotating topics. */
  topic: string | null
  /** The other good candidates this week, best first, to swap to. */
  suggestions: Suggestion[]
  /** Source keys James turned down this week; never suggested again. */
  passed: string[]
  slides: Record<Lang, SlideText> | null
  captions: Record<ExplainerChannel, string> | null
  /** Things to check before approving: US-only figures, dates, claims the model wasn't sure of. */
  flags: string[]
  generatedAt: string | null
  approvedAt: string | null
  results?: Partial<Record<ExplainerChannel, ChannelResult>> | null
  error: string | null
}

export const explainerId = (postDate: string) => `explainerPost-${postDate}`

export async function getExplainer(postDate: string): Promise<ExplainerPost | null> {
  return writeClient().fetch<ExplainerPost | null>(`*[_id == $id][0]`, { id: explainerId(postDate) })
}

/**
 * Sources never to suggest again: anything approved or posted, anything James
 * passed on, and the source of any skipped week.
 */
export async function usedSources(): Promise<{ used: Set<string>; recentTopics: string[] }> {
  const rows = await writeClient().fetch<
    { status: PostStatus; source: SourceRef | null; passed: string[] | null; topic: string | null }[]
  >(`*[_type == "explainerPost"] | order(postDate desc){ status, source, passed, topic }`)
  const used = new Set<string>()
  for (const r of rows) {
    if (r.source && r.status !== 'draft') used.add(sourceKey(r.source))
    for (const k of r.passed ?? []) used.add(k)
  }
  const recentTopics = rows
    .filter((r) => r.status === 'approved' || r.status === 'posted')
    .slice(0, 4)
    .map((r) => r.topic)
    .filter((t): t is string => Boolean(t))
  return { used, recentTopics }
}

export async function saveExplainer(post: Omit<ExplainerPost, '_type'>): Promise<ExplainerPost> {
  return writeClient().createOrReplace<ExplainerPost>({ ...post, _type: 'explainerPost' })
}

export async function patchExplainer(
  postDate: string,
  set: Partial<Omit<ExplainerPost, '_id' | '_type'>>,
): Promise<ExplainerPost> {
  return writeClient().patch(explainerId(postDate)).set(set).commit<ExplainerPost>()
}
