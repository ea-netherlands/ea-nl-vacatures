/**
 * The carousels that share the explainer's machinery (store, review page,
 * approval, posting): the weekly essay explainer, and the charity deep dive
 * (../charity), which walks through the evaluation behind one of Doneer
 * Effectief's top charities.
 *
 * Each series has its own Sanity document per week, named after the week's
 * first posting day, and its own days (Amsterdam time). Instagram's are the
 * evenings its followers are online most, Sunday to Tuesday (insights of 13
 * Nov 2026; James, 18 Nov 2026):
 *
 *            James's LinkedIn (09:00)   EA Nederland's Instagram (18:00)
 * Monday     charity deep dive          charity deep dive
 * Tuesday    jobs                       jobs
 * Thursday   essay
 * Sunday                                essay
 *
 * The two accounts never feature the same charity in a week, so Monday's two
 * deep dives are different ones.
 */

import type { PostKind } from '../music'

export type SeriesKey = 'explainer' | 'charity'
type Account = 'linkedinPersonal' | 'instagram'

export type Series = {
  key: SeriesKey
  docType: 'explainerPost' | 'charityPost'
  /** The weekday (0 = Sunday) a week is named after: its first post's day. */
  anchorDay: number
  /** Days after the anchor each account posts. */
  offsets: Record<Account, number>
  /** "this week's …", "Today's …" */
  noun: string
  plural: string
  reviewPath: string
  /** `next=` on the sign-in link (api/review/session). */
  next: string
  /** utm_campaign prefix. */
  campaign: string
  track: PostKind
}

export const EXPLAINER: Series = {
  key: 'explainer',
  docType: 'explainerPost',
  anchorDay: 4,
  offsets: { linkedinPersonal: 0, instagram: 3 },
  noun: 'explainer',
  plural: 'explainers',
  reviewPath: '/review/social/explainer',
  next: 'explainer',
  campaign: 'explainer',
  track: 'content',
}

export const CHARITY: Series = {
  key: 'charity',
  docType: 'charityPost',
  anchorDay: 1,
  offsets: { linkedinPersonal: 0, instagram: 0 },
  noun: 'charity deep dive',
  plural: 'charity deep dives',
  reviewPath: '/review/social/charity',
  next: 'charity',
  campaign: 'charity',
  track: 'content',
}

export const SERIES: Record<SeriesKey, Series> = { explainer: EXPLAINER, charity: CHARITY }
export const isSeriesKey = (v: unknown): v is SeriesKey => v === 'explainer' || v === 'charity'
/** Short forms for slide URLs; the explainer's has none, so its old URLs still work. */
export const SERIES_CODE: Record<SeriesKey, string | null> = { explainer: null, charity: 'c' }
