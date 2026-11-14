/**
 * Making sure a post goes out once.
 *
 * Posting used to record its result only after the Instagram or LinkedIn calls
 * returned, and retried any failure. So a run that timed out after posting, two
 * runs at once, or a failure after the platform had already published, could
 * each send the same post again.
 *
 * Now each account goes through these steps:
 *
 *   1. Claim: write `claimedAt` on the account's result, conditional on the
 *      document not having changed since it was read. A second run sees the
 *      claim (or loses the write) and leaves the account alone.
 *   2. Post, with a time limit on every request.
 *   3. Record the outcome straight away, for that account alone.
 *
 * A failure is retried only if it happened before the request that publishes
 * (Instagram's `media_publish`, LinkedIn's `rest/posts`). Once that request has
 * been sent, nobody can tell from here whether it went out, so the account is
 * marked "unclear" and James is asked to check, instead of risking a second
 * copy. A claim left behind by a run that died is treated the same way.
 */

import type { ChannelResult } from './store'

/** A claim younger than this belongs to a run that may still be posting. Cron runs are capped at 5 minutes. */
export const CLAIM_STALE_MS = 10 * 60_000

/** Every request to Instagram or LinkedIn gives up after this. */
export const REQUEST_TIMEOUT_MS = 60_000

/** The requests after which a post may be live. */
const PUBLISH_REQUEST = /\/media_publish(\?|$)|^https:\/\/api\.linkedin\.com\/rest\/posts(\?|$)/

export function unclearMessage(label: string): string {
  return `It is unclear whether this went out on ${label}. Check the account: if it isn't there, post it by hand. It won't be retried automatically.`
}

export type ChannelStep =
  | { kind: 'posted' }
  | { kind: 'unclear' }
  | { kind: 'gave-up' }
  | { kind: 'in-progress' }
  /** A claim left by a run that never finished: mark it unclear. */
  | { kind: 'abandoned' }
  | { kind: 'go'; attempts: number }

/** What a publishing run should do with one account, given its stored result. */
export function nextStep(result: ChannelResult | null | undefined, now: Date, maxAttempts: number): ChannelStep {
  if (result?.id) return { kind: 'posted' }
  if (result?.unclear) return { kind: 'unclear' }
  if (result?.claimedAt) {
    const age = now.getTime() - new Date(result.claimedAt).getTime()
    return age < CLAIM_STALE_MS ? { kind: 'in-progress' } : { kind: 'abandoned' }
  }
  if ((result?.attempts ?? 0) >= maxAttempts) return { kind: 'gave-up' }
  return { kind: 'go', attempts: (result?.attempts ?? 0) + 1 }
}

/** Whether a claim may be written over this stored result (nobody else is posting it, and it isn't done). */
export function claimable(result: ChannelResult | null | undefined, now: Date): boolean {
  const step = nextStep(result, now, Number.POSITIVE_INFINITY)
  return step.kind === 'go'
}

/** Whether an account is posted, being posted, or needs a person, so the post must not be redrafted. */
export function lockedForEditing(result: ChannelResult | null | undefined): boolean {
  return Boolean(result?.id || result?.unclear || result?.claimedAt)
}

/**
 * Wraps `fetch` for one account's posting: a time limit on every request, and
 * a note of whether the publishing request has been sent.
 */
export function watchedHttp(http: typeof fetch = fetch, timeoutMs = REQUEST_TIMEOUT_MS) {
  let sent = false
  const wrapped = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    if (method === 'POST' && PUBLISH_REQUEST.test(url)) sent = true
    return http(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(timeoutMs) })
  }) as typeof fetch
  return { http: wrapped, publishSent: () => sent }
}
