import assert from 'node:assert/strict'
import test from 'node:test'

import { composeCaption, credit, dealOut, shortlist, splitPicks, tidySlides } from './draft'
import { explainerSlidePaths, explainerSlides } from './slides'
import { adaptableForumPosts, handbookAdaptable, instagramSources, mediaToSource, type Candidate } from './sources'
import { nextExplainerTime } from './weekly'

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

test('captions get the Forum line, credit and links from the code', () => {
  const source = {
    kind: 'forum' as const,
    id: 'a',
    url: 'https://forum.effectivealtruism.org/posts/a/t',
    title: '40 hot takes',
    author: 'Lewis Bollard',
    publishedAt: '2026-10-15',
  }
  const li = composeCaption('linkedinPersonal', source, { caption: 'An idea.', hashtags: ['ignored'] }, '2026-11-19')
  assert.match(li, /^An idea\.\n\nThe EA Forum is the best place online to discuss how best to help others\./)
  assert.match(li, /Adapted from “40 hot takes” by Lewis Bollard in the EA Forum \(CC BY 4\.0\)/)
  assert.match(li, /forum\.effectivealtruism\.org\/posts\/a\/t/)
  assert.match(li, /utm_campaign=explainer-2026-11-19/)
  assert.ok(!li.includes('#'))
  const ig = composeCaption(
    'instagram',
    source,
    { caption: 'An idea for Instagram.', hashtags: ['#Effective Altruism', 'animalwelfare'] },
    '2026-11-19',
  )
  assert.match(ig, /^An idea for Instagram\.\n\nThe EA Forum is the best place online[^\n]+\n\nAdapted from “40 hot takes”/)
  assert.match(ig, /#effectivealtruism #animalwelfare$/)
  assert.ok(!ig.includes('http'))
  assert.match(credit({ ...source, kind: 'instagram' }), /@effectivealtruismofficial/)
  assert.equal(
    credit({ ...source, via: 'handbook', title: 'On Caring', author: 'So8res', publishedAt: '2014-10-07' }),
    'Adapted with permission from “On Caring” by So8res in the EA Forum’s Introduction to Effective Altruism Handbook.',
  )
})

test('the handbook: essays, not signposts, exercises or linkposts', () => {
  const post = (title: string, author: string, postedAt: string, url: string | null = null) =>
    ({ ...forumPost({ title, postedAt, url }), user: { displayName: author }, chapter: '1. Radical empathy' }) as Parameters<
      typeof handbookAdaptable
    >[0][number]
  const posts = [
    post('How AI could create the world’s biggest problems', '80000_Hours', '2026-05-05'),
    post('Radical empathy', 'MaxDalton', '2022-07-02'),
    post('Radical Empathy', 'Holden Karnofsky', '2017-02-16'),
    post('Factory Farming – 80,000 Hours Problem Profile', 'EA Handbook', '2025-02-18', 'https://80000hours.org/x'),
    post('Explore jobs in animal welfare', 'EA Handbook', '2025-02-18'),
    post('Exercise for ‘Our Final Century?’', 'EA Handbook', '2023-12-05'),
  ]
  assert.deepEqual(
    handbookAdaptable(posts).map((p) => p.title),
    ['How AI could create the world’s biggest problems', 'Radical empathy', 'Radical Empathy'],
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

test('the explainer goes out on the coming Thursday at 09:00 Amsterdam', () => {
  // Wednesday 11 Nov 2026
  assert.equal(nextExplainerTime(new Date('2026-11-11T10:30:00Z')).toISOString(), '2026-11-12T08:00:00.000Z')
  // Thursday after 09:00 rolls on a week
  assert.equal(nextExplainerTime(new Date('2026-11-12T09:00:00Z')).toISOString(), '2026-11-19T08:00:00.000Z')
  // Summer time
  assert.equal(nextExplainerTime(new Date('2027-06-01T12:00:00Z')).toISOString(), '2027-06-03T07:00:00.000Z')
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
  assert.deepEqual(
    explainerSlides(post, 'linkedinPersonal').map((s) => s.kind),
    ['cover', 'point', 'point', 'point', 'close'],
  )
  const nl = explainerSlides(post, 'instagram')
  assert.equal(nl.length, 3)
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
