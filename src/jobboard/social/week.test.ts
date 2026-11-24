import assert from 'node:assert/strict'
import test from 'node:test'

import { awaiting, weekDates, weekEntries, weekMailText } from './week'
import type { ExplainerItem, ExplainerPost } from './explainer/store'
import type { SocialPost } from './store'

// Wednesday 25 November 2026, 11:30 in Amsterdam: when the weekly cron runs.
const WEDNESDAY = new Date('2026-11-25T10:30:00Z')

test('the Wednesday review covers Thursday’s essay, Monday’s deep dives and Tuesday’s jobs', () => {
  assert.deepEqual(weekDates(WEDNESDAY), { jobs: '2026-12-01', explainer: '2026-11-26', charity: '2026-11-30' })
})

test('the three editors stay on the same weeks until the first of them posts', () => {
  // Saturday and Monday morning: still the same posts.
  assert.deepEqual(weekDates(new Date('2026-11-28T12:00:00Z')), weekDates(WEDNESDAY))
  assert.deepEqual(weekDates(new Date('2026-11-30T07:00:00Z')).charity, '2026-11-30')
})

const item = (over: Partial<ExplainerItem> = {}): ExplainerItem => ({
  status: 'draft',
  source: { kind: 'forum', id: 'a', title: 'An essay', author: 'Ann', url: 'https://x' } as ExplainerItem['source'],
  topic: null,
  suggestions: [],
  slides: { cover: { headline: 'H', marked: '', sub: '' }, points: [] },
  caption: 'Caption',
  flags: [],
  generatedAt: null,
  approvedAt: null,
  error: null,
  ...over,
})

const series = (postDate: string, li: ExplainerItem | null, ig: ExplainerItem | null) =>
  ({ _id: 'x', _type: 'explainerPost', postDate, postAt: '', linkedinPersonal: li, instagram: ig, passed: [] }) as ExplainerPost

const jobs = (over: Partial<SocialPost> = {}) =>
  ({
    _id: 'j',
    _type: 'socialPost',
    postDate: '2026-12-01',
    postAt: '',
    status: 'draft',
    listingIds: ['1', '2', '3', '4', '5'],
    theme: 'ai-safety',
    fallbackFrom: null,
    parts: null,
    captions: { instagram: 'a', linkedinOrg: 'b', linkedinPersonal: 'c' },
    generatedAt: null,
    approvedAt: null,
    error: null,
    ...over,
  }) as SocialPost

test('entries come in posting order, and only ready drafts await approval', () => {
  const dates = weekDates(WEDNESDAY)
  const entries = weekEntries({
    dates,
    jobs: jobs(),
    explainer: series(dates.explainer, item({ status: 'approved' }), item()),
    charity: series(dates.charity, item({ slides: null, caption: null }), item()),
  })
  assert.deepEqual(
    entries.map((e) => `${e.kind}:${e.channel ?? 'all'}`),
    ['explainer:linkedinPersonal', 'explainer:instagram', 'charity:linkedinPersonal', 'charity:instagram', 'jobs:all'],
  )
  assert.deepEqual(
    awaiting(entries).map((e) => `${e.kind}:${e.channel ?? 'all'}`),
    ['explainer:instagram', 'charity:instagram', 'jobs:all'],
  )
  const text = weekMailText(entries, 'https://link', [])
  assert.match(text, /3 to approve/)
  assert.match(text, /Charity deep dive for your LinkedIn: An essay \(needs you: It hasn’t been drafted\.\)/)
})

test('a jobs post with too few roles is not ready, and a missing week is listed', () => {
  const dates = weekDates(WEDNESDAY)
  const entries = weekEntries({ dates, jobs: jobs({ listingIds: ['1'] }), explainer: null, charity: null })
  assert.equal(awaiting(entries).length, 0)
  assert.equal(entries.filter((e) => e.status === 'missing').length, 4)
})
