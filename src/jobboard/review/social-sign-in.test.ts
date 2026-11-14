/**
 * The social posting pages have their own link and session: a review link,
 * which arrives daily, must never open them.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { GET } from '../../app/api/review/session/route'
import {
  issueToken,
  LINK_TTL_MS,
  SESSION_COOKIE,
  SOCIAL_LINK_TTL_MS,
  SOCIAL_SESSION_COOKIE,
  socialSignedIn,
  verifyToken,
} from './auth'

process.env.REVIEW_SECRET = 'test-secret'

/** Cookie name -> value, from a response's Set-Cookie headers. */
function cookiesOf(res: Response): Map<string, string> {
  const out = new Map<string, string>()
  for (const line of res.headers.getSetCookie()) {
    const [pair] = line.split(';')
    const at = pair.indexOf('=')
    out.set(pair.slice(0, at), decodeURIComponent(pair.slice(at + 1)))
  }
  return out
}

const visit = (query: string) => GET(new Request(`https://board.example/api/review/session?${query}`))

test('review and social tokens are not interchangeable', () => {
  const review = issueToken('link', LINK_TTL_MS)
  const social = issueToken('social-link', SOCIAL_LINK_TTL_MS)
  assert.equal(verifyToken('social-link', review), false)
  assert.equal(verifyToken('link', social), false)
  assert.equal(socialSignedIn(issueToken('session', 60_000)), false)
  assert.equal(socialSignedIn(issueToken('social-session', 60_000)), true)
  assert.equal(socialSignedIn(undefined), false)
})

test('a review link signs in to the queue only', async () => {
  const res = await visit(`t=${issueToken('link', LINK_TTL_MS)}`)
  const cookies = cookiesOf(res)
  assert.equal(new URL(res.headers.get('location')!).pathname, '/review')
  assert.equal(verifyToken('session', cookies.get(SESSION_COOKIE)), true)
  assert.equal(cookies.has(SOCIAL_SESSION_COOKIE), false)
})

test('a review link with next=social or next=explainer gets no session at all', async () => {
  for (const next of ['social', 'explainer']) {
    const res = await visit(`t=${issueToken('link', LINK_TTL_MS)}&next=${next}`)
    assert.equal(res.status, 303)
    assert.equal(cookiesOf(res).size, 0, next)
  }
})

test('a social link opens the social pages and the queue', async () => {
  const res = await visit(`t=${issueToken('social-link', SOCIAL_LINK_TTL_MS)}&next=social`)
  const cookies = cookiesOf(res)
  assert.equal(new URL(res.headers.get('location')!).pathname, '/review/social')
  assert.equal(socialSignedIn(cookies.get(SOCIAL_SESSION_COOKIE)), true)
  assert.equal(verifyToken('session', cookies.get(SESSION_COOKIE)), true)
})

test('a social link without next does not pass as a review link', async () => {
  const res = await visit(`t=${issueToken('social-link', SOCIAL_LINK_TTL_MS)}`)
  assert.equal(cookiesOf(res).size, 0)
})

test('an expired social link is refused', async () => {
  const old = issueToken('social-link', SOCIAL_LINK_TTL_MS, Date.now() - SOCIAL_LINK_TTL_MS - 1000)
  const res = await visit(`t=${old}&next=social`)
  assert.equal(cookiesOf(res).size, 0)
})
