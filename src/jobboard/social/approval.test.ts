import assert from 'node:assert/strict'
import test from 'node:test'

import { explainerApprovalHolds, jobsApprovalHolds, sealExplainer, sealJobsPost, SEALED_FROM } from './approval'

process.env.REVIEW_SECRET = 'test-secret'

const jobs = {
  postDate: '2026-11-17',
  listingIds: ['a', 'b', 'c'],
  theme: 'ai-safety' as const,
  captions: { instagram: 'IG caption', linkedinOrg: 'Org caption', linkedinPersonal: 'My caption' },
}

const item = {
  source: { kind: 'forum', id: 'abc', title: 'An essay' } as never,
  slides: { cover: { headline: 'A headline', marked: 'headline', sub: 'Sub' }, points: [{ heading: 'One', body: 'First point' }] },
  caption: 'Explainer caption',
}

test('a jobs post approved on the review page publishes as approved', () => {
  assert.equal(jobsApprovalHolds({ ...jobs, seal: sealJobsPost(jobs) }), true)
})

test('any change after approval breaks a jobs post seal', () => {
  const seal = sealJobsPost(jobs)
  assert.equal(jobsApprovalHolds({ ...jobs, seal, captions: { ...jobs.captions, linkedinPersonal: 'Something else' } }), false)
  assert.equal(jobsApprovalHolds({ ...jobs, seal, listingIds: ['a', 'c', 'b'] }), false)
  assert.equal(jobsApprovalHolds({ ...jobs, seal, listingIds: ['a', 'b', 'c', 'd'] }), false)
  assert.equal(jobsApprovalHolds({ ...jobs, seal, postDate: '2026-11-24' }), false)
})

test('an approval set directly in Sanity, with no seal or a made-up one, does not publish', () => {
  assert.equal(jobsApprovalHolds({ ...jobs }), false)
  assert.equal(jobsApprovalHolds({ ...jobs, seal: null }), false)
  assert.equal(jobsApprovalHolds({ ...jobs, seal: 'x'.repeat(43) }), false)
  process.env.REVIEW_SECRET = 'someone-elses-secret'
  const forged = sealJobsPost(jobs)
  process.env.REVIEW_SECRET = 'test-secret'
  assert.equal(jobsApprovalHolds({ ...jobs, seal: forged }), false)
})

test('posts from before seals existed still go out', () => {
  const old = { ...jobs, postDate: '2026-11-10' }
  assert.ok(old.postDate < SEALED_FROM)
  assert.equal(jobsApprovalHolds(old), true)
  assert.equal(explainerApprovalHolds('2026-11-12', 'instagram', item), true)
})

test('an explainer seal covers its slides, caption, account and week', () => {
  const seal = sealExplainer('2026-11-19', 'instagram', item)
  assert.equal(explainerApprovalHolds('2026-11-19', 'instagram', { ...item, seal }), true)
  assert.equal(explainerApprovalHolds('2026-11-19', 'linkedinPersonal', { ...item, seal }), false)
  assert.equal(explainerApprovalHolds('2026-11-26', 'instagram', { ...item, seal }), false)
  assert.equal(explainerApprovalHolds('2026-11-19', 'instagram', { ...item, seal, caption: 'Edited' }), false)
  const edited = { ...item, slides: { ...item.slides, points: [{ heading: 'One', body: 'Changed' }] } }
  assert.equal(explainerApprovalHolds('2026-11-19', 'instagram', { ...edited, seal }), false)
  assert.equal(explainerApprovalHolds('2026-11-19', 'instagram', item), false)
})

test('extra fields Sanity adds to stored slides do not break a seal', () => {
  const seal = sealExplainer('2026-11-19', 'instagram', item)
  const stored = { ...item, seal, slides: { ...item.slides, points: item.slides.points.map((p) => ({ ...p, _key: 'k1' })) } }
  assert.equal(explainerApprovalHolds('2026-11-19', 'instagram', stored), true)
})
