import assert from 'node:assert/strict'
import test from 'node:test'
import { publishInstagramCarousel } from './instagram'
import { CLAIM_STALE_MS, claimable, lockedForEditing, nextStep, watchedHttp } from './once'

const now = new Date('2026-11-17T17:05:00Z')
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()

test('an account is posted once: done, unclear and given-up accounts are left alone', () => {
  assert.deepEqual(nextStep(null, now, 3), { kind: 'go', attempts: 1 })
  assert.deepEqual(nextStep({ at: ago(0), error: 'timeout', attempts: 1 }, now, 3), { kind: 'go', attempts: 2 })
  assert.deepEqual(nextStep({ at: ago(0), id: 'media-9' }, now, 3), { kind: 'posted' })
  assert.deepEqual(nextStep({ at: ago(0), unclear: true, error: 'x' }, now, 3), { kind: 'unclear' })
  assert.deepEqual(nextStep({ at: ago(0), error: 'x', attempts: 3 }, now, 3), { kind: 'gave-up' })
})

test('a fresh claim means another run is posting; a stale one is marked unclear, never retried', () => {
  assert.deepEqual(nextStep({ at: ago(60_000), claimedAt: ago(60_000), attempts: 1 }, now, 3), { kind: 'in-progress' })
  assert.deepEqual(nextStep({ at: ago(CLAIM_STALE_MS + 1), claimedAt: ago(CLAIM_STALE_MS + 1), attempts: 1 }, now, 3), {
    kind: 'abandoned',
  })
  assert.equal(claimable({ at: ago(60_000), claimedAt: ago(60_000) }, now), false)
  assert.equal(claimable({ at: ago(0), error: 'timeout', attempts: 5 }, now), true)
  assert.equal(claimable(null, now), true)
})

test('a post that has started going out can no longer be reopened or skipped', () => {
  assert.equal(lockedForEditing(null), false)
  assert.equal(lockedForEditing({ at: ago(0), error: 'not connected', attempts: 1 }), false)
  assert.equal(lockedForEditing({ at: ago(0), manual: true, reminded: true }), false)
  assert.equal(lockedForEditing({ at: ago(0), id: 'x' }), true)
  assert.equal(lockedForEditing({ at: ago(0), claimedAt: ago(0) }), true)
  assert.equal(lockedForEditing({ at: ago(0), unclear: true }), true)
})

const json = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' }, ...init })

function instagram(failAt: 'container' | 'publish') {
  const signals: (AbortSignal | null | undefined)[] = []
  const http = (async (input: RequestInfo | URL, init?: RequestInit) => {
    signals.push(init?.signal)
    const key = `${init?.method ?? 'GET'} ${String(input)}`
    if (/POST .*\/media$/.test(key)) {
      if (failAt === 'container') return json({ error: { message: 'Invalid image' } }, { status: 400 })
      return json({ id: String(init?.body).includes('CAROUSEL') ? 'carousel-1' : 'child' })
    }
    if (/status_code/.test(key)) return json({ status_code: 'FINISHED' })
    // The request reached Instagram, but the answer never came back.
    if (/POST .*\/media_publish$/.test(key)) throw new Error('socket hang up')
    throw new Error(`unexpected ${key}`)
  }) as typeof fetch
  return { http, signals }
}

test('a failure before the publish request can be retried', async () => {
  const fake = instagram('container')
  const watched = watchedHttp(fake.http)
  await assert.rejects(
    publishInstagramCarousel({ userId: '1', token: 't', imageUrls: ['a', 'b'], caption: 'c', http: watched.http }),
  )
  assert.equal(watched.publishSent(), false)
})

test('a failure after the publish request is unclear, and every request has a time limit', async () => {
  const fake = instagram('publish')
  const watched = watchedHttp(fake.http)
  await assert.rejects(
    publishInstagramCarousel({
      userId: '1',
      token: 't',
      imageUrls: ['a', 'b'],
      caption: 'c',
      http: watched.http,
      sleep: async () => {},
    }),
    /socket hang up/,
  )
  assert.equal(watched.publishSent(), true)
  assert.ok(fake.signals.length > 0 && fake.signals.every((s) => s instanceof AbortSignal))
})

test('LinkedIn: the post request counts as publishing, the document upload does not', () => {
  const watched = watchedHttp((async () => json({})) as unknown as typeof fetch)
  void watched.http('https://api.linkedin.com/rest/documents?action=initializeUpload', { method: 'POST' })
  assert.equal(watched.publishSent(), false)
  void watched.http('https://api.linkedin.com/rest/posts', { method: 'POST' })
  assert.equal(watched.publishSent(), true)
})
