import assert from 'node:assert/strict'
import test from 'node:test'

import { composeCaption, credit, dealOut, framing, shortlist, splitPicks, tidySlides } from './draft'
import { explainerSlidePaths, explainerSlides } from './slides'
import { adaptableForumPosts, handbookAdaptable, instagramSources, mediaToSource, type Candidate } from './sources'
import { explainerPostAt, nextExplainerTime } from './weekly'

const forumPost = (over: Record<string, unknown> = {}) =>
  ({
    _id: 'a',
    title: 'T',
    pageUrl: 'https://forum.effectivealtruism.org/posts/a/t',
    url: null,
    postedAt: '2026-10-01T00:00:00.000Z',
    baseScore: 100,
    wordCount: 2000,
    user: { displayName: 'Ann' },
    tags: [],
    contents: { plaintextDescription: 'x' },
    ...over,
  }) as Parameters<typeof adaptableForumPosts>[0][number]

test('Forum posts with their own text can be adapted, old or new', () => {
  const posts = [
    forumPost({ _id: 'ok' }),
    forumPost({ _id: 'old', postedAt: '2022-11-30T23:59:00.000Z' }),
    forumPost({ _id: 'link', url: 'https://substack.com/p/x' }),
    forumPost({ _id: 'short', wordCount: 120 }),
  ]
  assert.deepEqual(
    adaptableForumPosts(posts).map((p) => p._id),
    ['ok', 'old'],
  )
})

const cand = (kind: Candidate['kind'], id: string, score: number): Candidate => ({
  kind,
  id,
  url: `https://x/${id}`,
  title: id,
  author: 'A',
  publishedAt: '2026-10-01',
  score,
  summary: '',
  topics: [],
})

test('the shortlist leaves out used sources and mixes Forum and Instagram', () => {
  const list = shortlist(
    [cand('forum', 'f1', 50), cand('forum', 'f2', 90), cand('instagram', 'i1', 10), cand('instagram', 'i2', 300)],
    new Set(['forum:f2']),
    14,
    new Date('2026-11-11'),
  )
  assert.deepEqual(
    list.map((c) => c.id),
    ['f1', 'i2', 'i1'],
  )
})

test('old classics compete with each other, not with this year’s posts', () => {
  const old = { ...cand('forum', 'classic', 900), publishedAt: '2014-10-07' }
  const list = shortlist([old, cand('forum', 'new', 50), { ...cand('forum', 'hb', 70), via: 'handbook' as const }], new Set(), 14, new Date('2026-11-11'))
  assert.deepEqual(
    list.map((c) => c.id),
    ['new', 'hb', 'classic'],
  )
})

test('the highlighted phrase is always the real end of the headline', () => {
  const ok = tidySlides({ cover: { headline: 'Why factory farming matters', marked: 'matters', sub: 's' }, points: [] })
  assert.equal(ok.cover.marked, 'matters')
  const fixed = tidySlides({ cover: { headline: 'Why factory farming matters', marked: 'not in it', sub: 's' }, points: [] })
  assert.ok('Why factory farming matters'.endsWith(fixed.cover.marked))
  assert.ok(fixed.cover.marked.length > 0)
})

test('captions: opening, what this is, summary, then the credit and the monthly email', () => {
  const now = new Date('2026-11-11')
  const source = {
    kind: 'forum' as const,
    id: 'a',
    url: 'https://forum.effectivealtruism.org/posts/a/t',
    title: '40 hot takes',
    author: 'Lewis Bollard',
    publishedAt: '2026-10-15',
  }
  const draft = { opening: 'A hook.', caption: 'The argument.', hashtags: ['#Effective Altruism', 'animalwelfare'] }
  const li = composeCaption('linkedinPersonal', source, draft, '2026-11-19', now).split('\n\n')
  assert.equal(li[0], 'A hook.')
  assert.equal(
    li[1],
    'Each week I summarise an essay from the EA Forum, the best place online to discuss how best to help others. This week’s is “40 hot takes” by Lewis Bollard.',
  )
  assert.equal(li[2], 'The argument.')
  assert.match(li[3], /^Adapted from “40 hot takes” by Lewis Bollard on the EA Forum \(CC BY 4\.0\)\. Read the whole essay: https:\/\/forum/)
  assert.match(li[4], /^Want more like this\? At EA Netherlands we send a free monthly email: one EA Forum essay worth your time/)
  assert.match(li[4], /You can sign up here: https:\/\/effectiefaltruisme\.nl\/en\/newsletter\?utm_source=linkedin.*utm_campaign=explainer-2026-11-19/)
  assert.ok(!li.join('').includes('#'))

  const ig = composeCaption('instagram', source, draft, '2026-11-19', now).split('\n\n')
  assert.match(ig[1], /^Each week we summarise an essay from the EA Forum/)
  assert.match(ig[3], /^Want more like this\? EA Netherlands sends a free monthly email.*Sign up through the link in our bio\.$/)
  assert.match(ig[4], /^Adapted from “40 hot takes”/)
  assert.equal(ig[5], '#effectivealtruism #animalwelfare')
  assert.ok(!ig.join('').includes('http'))

  // An old essay is a classic, with its year.
  assert.match(
    framing('linkedinPersonal', { ...source, title: 'On Caring', author: 'So8res', publishedAt: '2014-10-07' }, now)!,
    /This week’s is a classic: “On Caring” by So8res \(2014\)\.$/,
  )
  // A reworked CEA post doesn't get the Forum line.
  assert.equal(framing('instagram', { ...source, kind: 'instagram' }), null)
  assert.match(credit({ ...source, kind: 'instagram' }), /@effectivealtruismofficial/)
  assert.equal(
    credit({ ...source, via: 'handbook', title: 'On Caring', author: 'So8res', publishedAt: '2014-10-07' }),
    'Adapted with permission from “On Caring” by So8res in the EA Forum’s Introduction to Effective Altruism Handbook.',
  )
})

test('the two accounts never get the same source', () => {
  const list = ['a', 'b', 'c', 'd'].map((id) => cand('forum', id, 10))
  const pick = (id: string) => ({ id: `forum:${id}`, reason: 'r', topic: 't' })
  // Both want "a" first; LinkedIn wins the tie. Both list "c"; Instagram ranked it higher.
  const split = splitPicks(
    { linkedinPersonal: [pick('a'), pick('b'), pick('c')], instagram: [pick('a'), pick('c'), pick('d'), pick('zzz')] },
    list,
  )
  assert.deepEqual(
    split.linkedinPersonal.map((s) => s.id),
    ['a', 'b'],
  )
  assert.deepEqual(
    split.instagram.map((s) => s.id),
    ['c', 'd'],
  )
  const dealt = dealOut(list)
  assert.deepEqual(
    [dealt.linkedinPersonal.map((s) => s.id), dealt.instagram.map((s) => s.id)],
    [
      ['a', 'c'],
      ['b', 'd'],
    ],
  )
})

test("a week's explainers: LinkedIn on Thursday at 09:00, Instagram on Sunday at 18:00", () => {
  assert.equal(explainerPostAt('2026-11-19', 'linkedinPersonal').toISOString(), '2026-11-19T08:00:00.000Z')
  assert.equal(explainerPostAt('2026-11-19', 'instagram').toISOString(), '2026-11-22T17:00:00.000Z')
  // Over a month's end, in summer time
  assert.equal(explainerPostAt('2027-07-29', 'instagram').toISOString(), '2027-08-01T16:00:00.000Z')
})

test("the week stays open until its Sunday post is out, then moves on", () => {
  const week = (at: string) => nextExplainerTime(new Date(at)).toISOString()
  // Wednesday 11 Nov 2026: the coming Thursday
  assert.equal(week('2026-11-11T10:30:00Z'), '2026-11-12T08:00:00.000Z')
  // Thursday after LinkedIn's post, and Sunday before Instagram's: still that week
  assert.equal(week('2026-11-12T09:00:00Z'), '2026-11-12T08:00:00.000Z')
  assert.equal(week('2026-11-15T16:59:00Z'), '2026-11-12T08:00:00.000Z')
  // Sunday once Instagram's time has passed: next week
  assert.equal(week('2026-11-15T17:00:00Z'), '2026-11-19T08:00:00.000Z')
  // Monday
  assert.equal(week('2026-11-16T08:00:00Z'), '2026-11-19T08:00:00.000Z')
  // Summer time
  assert.equal(week('2027-06-01T12:00:00Z'), '2027-06-03T07:00:00.000Z')
})

test('slides: cover, one per point, closing; each account from its own explainer', () => {
  const item = (headline: string, points: number) => ({
    status: 'draft' as const,
    source: { kind: 'forum' as const, id: headline, url: 'u', title: headline, author: 'A', publishedAt: '2026-10-01' },
    topic: null,
    suggestions: [],
    slides: {
      cover: { headline, marked: headline, sub: 'S' },
      points: Array.from({ length: points }, (_, i) => ({ heading: `h${i}`, body: `b${i}` })),
    },
    caption: 'c',
    flags: [],
    generatedAt: null,
    approvedAt: null,
    error: null,
  })
  const post = { postDate: '2026-11-19', linkedinPersonal: item('English', 3), instagram: item('Nederlands', 1) }
  // A Forum essay: hook, then what this is, then the points.
  assert.deepEqual(
    explainerSlides(post, 'linkedinPersonal').map((s) => s.kind),
    ['cover', 'about', 'point', 'point', 'point', 'close'],
  )
  const points = explainerSlides(post, 'linkedinPersonal').filter((s) => s.kind === 'point')
  assert.deepEqual(
    points.map((s) => s.kind === 'point' && `${s.index} of ${s.count}`),
    ['3 of 6', '4 of 6', '5 of 6'],
  )
  // A reworked CEA post goes straight on.
  const cea = { ...post, linkedinPersonal: { ...post.linkedinPersonal, source: { ...post.linkedinPersonal.source, kind: 'instagram' as const } } }
  assert.deepEqual(
    explainerSlides(cea, 'linkedinPersonal').map((s) => s.kind),
    ['cover', 'point', 'point', 'point', 'close'],
  )
  const nl = explainerSlides(post, 'instagram')
  assert.equal(nl.length, 4)
  assert.equal(nl[0].kind === 'cover' && nl[0].source.title, 'Nederlands')
  const paths = explainerSlidePaths(post, 'instagram', 'jpg')
  assert.match(paths[0], /^\/vacatures\/social\/explainer\?d=2026-11-19&c=ig&i=0&v=[0-9a-f]{10}&format=jpg$/)
  const edited = { ...post, instagram: item('Anders', 1) }
  assert.notEqual(explainerSlidePaths(edited, 'instagram')[0], paths[0].replace('&format=jpg', ''))
  assert.equal(explainerSlides({ ...post, instagram: null }, 'instagram').length, 0)
})

test('Instagram: carousels and images are sources, videos are not', () => {
  const carousel = mediaToSource({
    id: '1',
    media_type: 'CAROUSEL_ALBUM',
    caption: 'Why do many people in effective altruism care about ending factory farming?\n\nMore text',
    permalink: 'https://www.instagram.com/p/x/',
    timestamp: '2026-10-30T10:00:00+0000',
    like_count: 108,
    comments_count: 4,
    children: { data: [{ media_type: 'IMAGE', media_url: 'a.jpg' }, { media_type: 'VIDEO' }, { media_type: 'IMAGE', media_url: 'b.jpg' }] },
  })
  assert.deepEqual(carousel?.images, ['a.jpg', 'b.jpg'])
  assert.equal(carousel?.candidate.score, 120)
  assert.equal(carousel?.candidate.title, 'Why do many people in effective altruism care about ending factory farming?')
  assert.equal(mediaToSource({ id: '2', media_type: 'VIDEO', permalink: 'p', timestamp: 't' }), null)
})

test('Instagram: a token without the reading permissions says which ones to add', async () => {
  const http = (async () =>
    new Response(JSON.stringify({ error: { message: '(#10) Application does not have permission for this action' } }), {
      status: 403,
    })) as unknown as typeof fetch
  await assert.rejects(instagramSources('EAAB-token', http), /instagram_manage_insights and pages_read_engagement/)
})
