/**
 * The review loop's deterministic parts: dashboard tokens, translation
 * staleness, the calibration block the classifier sees, and the digest.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'

process.env.REVIEW_SECRET = 'test-secret'

import { issueToken, verifyToken } from './auth'
import { renderCalibration } from './calibration'
import { renderDigestHtml, renderDigestText, subjectFor } from './digest'
import type { ReviewItem } from './queue'
import { needsTranslation, sourceHash } from '../sanity/translate'

test('a link token verifies, and only for its own purpose', () => {
  const token = issueToken('link', 60_000)
  assert.equal(verifyToken('link', token), true)
  assert.equal(verifyToken('session', token), false)
})

test('an expired or tampered token is refused', () => {
  const now = Date.now()
  const token = issueToken('session', 1_000, now)
  assert.equal(verifyToken('session', token, now + 2_000), false)
  const [expires, sig] = token.split('.')
  assert.equal(verifyToken('session', `${Number(expires) + 864e5}.${sig}`, now), false)
  assert.equal(verifyToken('session', '', now), false)
  assert.equal(verifyToken('session', 'garbage', now), false)
})

test('an edited Dutch note makes its English translation stale', () => {
  const dutch = 'Deze functie bepaalt waar het geld heen gaat.'
  assert.equal(needsTranslation(dutch, 'This role decides.', sourceHash(dutch), false), false)
  assert.equal(needsTranslation(`${dutch} Echt.`, 'This role decides.', sourceHash(dutch), false), true)
})

test('English with no recorded source is re-translated once', () => {
  assert.equal(needsTranslation('Een zin.', 'A sentence.', undefined, false), true)
  assert.equal(needsTranslation('', 'A sentence.', undefined, false), false)
})

const row = (over: Partial<Parameters<typeof renderCalibration>[0][number]>) => ({
  action: 'rejected',
  reason: null,
  category: null,
  title: 'Office manager',
  employer_name: 'Acme',
  primary_cause: 'global-health-wellbeing',
  leverage: 'direct-work',
  cause_score: 2,
  leverage_score: 2,
  ...over,
})

test('calibration shows the curator reason and says the rubric wins', () => {
  const text = renderCalibration([
    row({ category: 'low-leverage', reason: 'Generic support role' }),
    row({ action: 'published', title: 'Grants lead' }),
  ])
  assert.match(text, /Not enough leverage: Generic support role/)
  assert.match(text, /the rubric wins/)
  assert.match(text, /### Published\n- "Grants lead" at Acme/)
})

test('no curator decisions means no calibration block at all', () => {
  assert.equal(renderCalibration([]), '')
})

const item = (over: Partial<ReviewItem> = {}): ReviewItem => ({
  draftId: 'drafts.jobListing-7',
  publishedId: 'jobListing-7',
  promotedAt: new Date(Date.now() - 3 * 864e5).toISOString(),
  title: 'Head of <special> projects',
  employerName: 'Kairos',
  applyUrl: 'https://example.org/job',
  note: 'Wie dit doet, beslist welke programma’s er komen.',
  excerpt: null,
  cause: 'Global catastrophic risks',
  subArea: null,
  skills: [],
  leverage: null,
  location: null,
  seniority: null,
  salary: null,
  deadlineAt: null,
  expiresAt: null,
  score: 5,
  reasoning: null,
  pipelineListingId: 7,
  slug: null,
  ...over,
})

test('the subject says whether there is news or only a backlog', () => {
  assert.equal(subjectFor(2, 5), '2 new roles to review')
  assert.equal(subjectFor(1, 1), '1 new role to review')
  assert.equal(subjectFor(0, 3), '3 roles still waiting for review')
})

test('the digest escapes listing text and links each role to its card', () => {
  const link = (anchor?: string) => `https://board.test/api/review/session?t=x${anchor ? `&focus=${anchor}` : ''}`
  const html = renderDigestHtml([item()], [], link)
  assert.match(html, /Head of &lt;special&gt; projects/)
  assert.doesNotMatch(html, /<special>/)
  assert.match(html, /focus=listing-7/)
  // A double quote inside a style value closes the attribute and drops every
  // style after it — which is how the first render lost its button.
  for (const [, style] of html.matchAll(/style="([^"]*)"/g)) assert.doesNotMatch(style, /"/)
  assert.doesNotMatch(html, /style="[^"]*"[^>\s/]/)
  const text = renderDigestText([], [item()], link)
  assert.match(text, /still waiting/)
  assert.match(text, /3 days/)
})
