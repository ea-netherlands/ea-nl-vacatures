/**
 * Ties an approval to exactly what was approved.
 *
 * A post's status and text live in Sanity, where anyone with editor rights on
 * the project (or a leaked write token) could set `status: "approved"` on any
 * words without ever seeing the review page. So approving also stores a seal:
 * an HMAC, keyed with a secret that only the server has, over the text that
 * will go out. The publish crons recompute it and refuse to post when it is
 * missing or does not match — which is also what happens if anything is
 * edited after approval.
 *
 * What it does not cover: the jobs post's slides are drawn from the live
 * listings on the day, so a listing edited after approval still changes its
 * slide. The seal fixes which listings, in which order, with which captions.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { ExplainerChannel, ExplainerItem } from './explainer/store'
import { CHANNELS, type SocialPost } from './store'

/** Posts dated before this were approved before seals existed, and go out without one. */
export const SEALED_FROM = '2026-11-16'

/** The same secret the review sign-in uses; see review/auth.ts for the fallback. */
function key(): string | null {
  const configured = process.env.REVIEW_SECRET ?? process.env.CRON_SECRET
  if (configured) return configured
  return process.env.VERCEL === '1' ? null : 'local-development-only'
}

function sign(payload: unknown): string {
  const secret = key()
  if (!secret) throw new Error('REVIEW_SECRET (or CRON_SECRET) is not set')
  return createHmac('sha256', secret).update(`approval.${JSON.stringify(payload)}`).digest('base64url')
}

/** What a jobs post's approval covers, in a fixed shape so the seal is stable. */
function jobsPayload(post: Pick<SocialPost, 'postDate' | 'listingIds' | 'theme' | 'captions'>) {
  return {
    kind: 'jobs',
    postDate: post.postDate,
    listingIds: post.listingIds,
    theme: post.theme ?? null,
    captions: CHANNELS.map((c) => post.captions?.[c] ?? null),
  }
}

function explainerPayload(postDate: string, channel: ExplainerChannel, item: Pick<ExplainerItem, 'source' | 'slides' | 'caption'>) {
  return {
    kind: 'explainer',
    postDate,
    channel,
    source: item.source ? JSON.stringify(item.source, Object.keys(item.source).sort()) : null,
    cover: item.slides ? [item.slides.cover.headline, item.slides.cover.marked, item.slides.cover.sub] : null,
    points: item.slides ? item.slides.points.map((p) => [p.heading, p.body]) : null,
    caption: item.caption ?? null,
  }
}

export const sealJobsPost = (post: Parameters<typeof jobsPayload>[0]) => sign(jobsPayload(post))

export const sealExplainer = (postDate: string, channel: ExplainerChannel, item: Parameters<typeof explainerPayload>[2]) =>
  sign(explainerPayload(postDate, channel, item))

function matches(seal: string | null | undefined, expected: () => string): boolean {
  if (!seal || !key()) return false
  const a = Buffer.from(seal)
  const b = Buffer.from(expected())
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Whether an approved jobs post is exactly what was approved. */
export function jobsApprovalHolds(post: Parameters<typeof jobsPayload>[0] & { seal?: string | null }): boolean {
  if (post.postDate < SEALED_FROM) return true
  return matches(post.seal, () => sealJobsPost(post))
}

/** Whether an approved explainer is exactly what was approved. */
export function explainerApprovalHolds(
  postDate: string,
  channel: ExplainerChannel,
  item: Parameters<typeof explainerPayload>[2] & { seal?: string | null },
): boolean {
  if (postDate < SEALED_FROM) return true
  return matches(item.seal, () => sealExplainer(postDate, channel, item))
}

export const CHANGED_SINCE_APPROVAL =
  'it was changed after it was approved, or approved outside the review page. Reopen it and approve it again.'
