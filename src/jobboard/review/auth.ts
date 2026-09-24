/**
 * Access to the review dashboard.
 *
 * There is one curator and no accounts, so access is a signed link rather than
 * a login: the daily digest carries a short-lived token, and following it
 * swaps that token for a longer-lived session cookie. Whoever holds the email
 * can review; nobody else can reach the queue.
 *
 * Two rules keep this safe with a link in an inbox:
 *
 *   • Following a link never changes anything but the cookie. Mail scanners
 *     and link-preview bots fetch every URL in a message, so a GET that
 *     published a listing would publish it before anyone read the mail. Every
 *     decision is a POST from the dashboard itself.
 *   • Tokens are HMACs over their own expiry, compared in constant time, so
 *     there is nothing stored to leak and nothing to revoke except the secret.
 *     Rotating REVIEW_SECRET signs everyone out.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'jb_review'

/** The link in the email. Long enough to survive a weekend away. */
export const LINK_TTL_MS = 7 * 864e5
/** The cookie the link is exchanged for. */
export const SESSION_TTL_MS = 30 * 864e5

type Purpose = 'link' | 'session'

/**
 * REVIEW_SECRET, falling back to CRON_SECRET so an existing deployment works
 * without a new variable. Null when neither is set, which disables the
 * dashboard on Vercel and allows it only in local development — the same rule
 * the cron route applies.
 */
function secret(): string | null {
  const configured = process.env.REVIEW_SECRET ?? process.env.CRON_SECRET
  if (configured) return configured
  return process.env.VERCEL === '1' ? null : 'local-development-only'
}

export function isReviewConfigured(): boolean {
  return secret() !== null
}

function sign(purpose: Purpose, expires: number, key: string): string {
  return createHmac('sha256', key).update(`${purpose}.${expires}`).digest('base64url')
}

export function issueToken(purpose: Purpose, ttlMs: number, now = Date.now()): string {
  const key = secret()
  if (!key) throw new Error('REVIEW_SECRET (or CRON_SECRET) is not set')
  const expires = now + ttlMs
  return `${expires}.${sign(purpose, expires, key)}`
}

export function verifyToken(
  purpose: Purpose,
  token: string | null | undefined,
  now = Date.now(),
): boolean {
  const key = secret()
  if (!key || !token) return false
  const [expiresRaw, signature] = token.split('.')
  const expires = Number(expiresRaw)
  if (!Number.isFinite(expires) || expires < now || !signature) return false
  const expected = Buffer.from(sign(purpose, expires, key))
  const given = Buffer.from(signature)
  return expected.length === given.length && timingSafeEqual(expected, given)
}
