import assert from 'node:assert/strict'
import test from 'node:test'

import { composeCaption, credit, dealOut, shortlist, splitPicks, tidySlides } from './draft'
import { explainerSlidePaths, explainerSlides } from './slides'
import { adaptableForumPosts, instagramSources, mediaToSource, type Candidate } from './sources'
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

test('only CC BY Forum posts with their own text can be adapted', () => {
  const posts = [
    forumPost({ _id: 'ok' }),
    forumPost({ _id: 'old', postedAt: '2022-11-30T23:59:00.000Z' }),
    forumPost({ _id: 'link', url: 'https://substack.com/p/x' }),
    forumPost({ _id: 'short', wordCount: 120 }),
  ]
  assert.deepEqual(
    adaptableForumPosts(posts).map((p) => p._id),
    ['ok'],
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
  )
  assert.deepEqual(
    list.map((c) => c.id),
    ['f1', 'i2', 'i1'],
  )
})

test('the highlighted phrase is always the real end of the headline', () => {
  const ok = tidySlides({ cover: { headline: 'Why factory farming matters', marked: 'matters', sub: 's' }, points: [] })
  assert.equal(ok.cover.marked, 'matters')
  const fixed = tidySlides({ cover: { headline: 'Why factory farming matters', marked: 'not in it', sub: 's' }, points: [] })
  assert.ok('Why factory farming matters'.endsWith(fixed.cover.marked))
  assert.ok(fixed.cover.marked.length > 0)
})

test('captions get the credit and links from the code, in each language', () => {
  const source = {
    kind: 'forum' as const,
    id: 'a',
    url: 'https://forum.effectivealtruism.org/posts/a/t',
    title: '40 hot takes',
    author: 'Lewis Bollard',
    publishedAt: '2026-10-15',
  }
  const li = composeCaption('linkedinPersonal', source, { caption: 'An idea.', hashtags: ['ignored'] }, '2026-11-19')
  assert.match(li, /Adapted from “40 hot takes” by Lewis Bollard on the EA Forum \(CC BY 4\.0\)/)
  assert.match(li, /forum\.effectivealtruism\.org\/posts\/a\/t/)
  assert.match(li, /utm_campaign=explainer-2026-11-19/)
  assert.ok(!li.includes('#'))
  const ig = composeCaption(
    'instagram',
    source,
    { caption: 'Een idee.', hashtags: ['#Effectief Altruisme', 'dierenwelzijn'] },
    '2026-11-19',
  )
  assert.match(ig, /^Een idee\.\n\nGebaseerd op “40 hot takes” van Lewis Bollard/)
  assert.match(ig, /#effectiefaltruisme #dierenwelzijn$/)
  assert.ok(!ig.includes('http'))
  assert.match(credit({ ...source, kind: 'instagram' }, 'nl'), /@effectivealtruismofficial/)
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

test('slides: cover, one per point, closing; each language from its own account', () => {
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
    explainerSlides(post, 'en').map((s) => s.kind),
    ['cover', 'point', 'point', 'point', 'close'],
  )
  const nl = explainerSlides(post, 'nl')
  assert.equal(nl.length, 3)
  assert.equal(nl[0].kind === 'cover' && nl[0].source.title, 'Nederlands')
  const paths = explainerSlidePaths(post, 'nl', 'jpg')
  assert.match(paths[0], /^\/vacatures\/social\/explainer\?d=2026-11-19&l=nl&i=0&v=[0-9a-f]{10}&format=jpg$/)
  const edited = { ...post, instagram: item('Anders', 1) }
  assert.notEqual(explainerSlidePaths(edited, 'nl')[0], paths[0].replace('&format=jpg', ''))
  assert.equal(explainerSlides({ ...post, instagram: null }, 'nl').length, 0)
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
