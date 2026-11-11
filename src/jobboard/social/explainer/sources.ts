/**
 * Where the weekly explainer's material comes from.
 *
 * - Curated EA Forum posts. Everything posted to the Forum since 1 December
 *   2022 is CC BY 4.0 (forum.effectivealtruism.org/copyright, read 11 Nov
 *   2026), so it can be adapted with credit. Older posts are all rights
 *   reserved by default; James has permission to use them (11 Nov 2026), and
 *   they're credited "with permission" rather than CC BY. A linkpost's linked
 *   article belongs to another site and is covered by neither, so linkposts
 *   are left out.
 * - The Introduction to Effective Altruism Handbook, the Forum's collection for
 *   newcomers (James, 11 Nov 2026), so often more accessible: classics such
 *   as "On Caring" and "Radical Empathy". Same rules as the curated posts;
 *   signposts, exercises and reading lists are left out, and CEA's chapter
 *   introductions are mostly too short to carry an explainer.
 * - The Centre for Effective Altruism's Instagram (effectivealtruismofficial),
 *   read through Instagram's business discovery: captions, slide images and
 *   engagement of another business account's public posts. Only with
 *   EXPLAINER_CEA on, because adapting CEA's own material needs CEA's
 *   agreement, and it needs the token to carry instagram_manage_insights and
 *   pages_read_engagement as well as instagram_basic
 *   (developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery,
 *   read 11 Nov 2026).
 *
 * `http` is injectable so the tests run without either service.
 */

import { graphBase, INSTAGRAM_ACCOUNT_ID } from '../instagram'

type Http = typeof fetch

export type SourceKind = 'forum' | 'instagram'

/** What a post is adapted from, as stored on it. */
export type SourceRef = {
  kind: SourceKind
  /** Forum posts read from the Introduction to EA Handbook. */
  via?: 'handbook'
  id: string
  url: string
  title: string
  author: string
  publishedAt: string
}

export type Candidate = SourceRef & {
  /** Karma on the Forum; likes plus three per comment on Instagram. */
  score: number
  /** The opening of the post or the caption, for picking. */
  summary: string
  topics: string[]
}

export const sourceKey = (s: Pick<SourceRef, 'kind' | 'id'>) => `${s.kind}:${s.id}`

/**
 * How every Forum explainer introduces the Forum, on the closing slide and in
 * the caption (James, 11 Nov 2026). "Curated", not "classic": the explainers
 * draw on the editors' curated posts since December 2022, the ones we may
 * adapt; the Forum's older classics are all rights reserved.
 */
export const FORUM_ABOUT =
  'The EA Forum is the best place online to discuss how best to help others. Each week we share an interesting essay from it, summarised in a few slides.'

export const CEA_INSTAGRAM = 'effectivealtruismofficial'
export const FORUM_LICENCE_FROM = '2022-12-01T00:00:00.000Z'

/** An essay from more than two years ago, which the posts call a classic. */
export function isClassic(s: Pick<SourceRef, 'kind' | 'publishedAt'>, now = new Date()): boolean {
  return s.kind === 'forum' && now.getTime() - new Date(s.publishedAt).getTime() > 2 * 365 * 864e5
}

/**
 * What the monthly email is, said the same way in captions and on the
 * closing slide (James, 11 Nov 2026: say who sends it, what's in it and how
 * to get it, not just a list).
 */
export const NEWSLETTER_PITCH =
  'EA Netherlands sends a free monthly email: one EA Forum essay worth your time, new jobs and programmes, and events across the Netherlands.'

/** CC BY 4.0, or (older posts) adapted with the permission James has. */
export const isCcBy = (s: Pick<SourceRef, 'kind' | 'publishedAt'>) =>
  s.kind === 'forum' && s.publishedAt >= FORUM_LICENCE_FROM

/** CEA has agreed to EA Nederland adapting its Instagram posts. */
export function ceaSourcesEnabled(): boolean {
  return process.env.EXPLAINER_CEA === 'on'
}

// ── EA Forum ────────────────────────────────────────────────────────────────

const GRAPHQL = 'https://forum.effectivealtruism.org/graphql'
// The user agent the Forum allowlisted for EA Nederland's digest (9 Nov 2026).
const FORUM_UA = 'ean-digest (+https://effectiefaltruisme.nl)'

export class SourceError extends Error {}

async function forum<T>(http: Http, query: string): Promise<T> {
  const res = await http(GRAPHQL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': FORUM_UA },
    body: JSON.stringify({ query }),
    cache: 'no-store',
  })
  if (!res.ok) throw new SourceError(`EA Forum: HTTP ${res.status}`)
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] }
  if (json.errors?.length || !json.data) throw new SourceError(`EA Forum: ${json.errors?.[0]?.message ?? 'no data'}`)
  return json.data
}

/** No emoji in EA Nederland material; Forum names often carry the pledge diamond. */
export const noEmoji = (s: string) =>
  s
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{23F8}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()

type RawForumPost = {
  _id: string
  title: string
  pageUrl: string
  url: string | null
  postedAt: string
  baseScore: number
  wordCount: number | null
  user: { displayName: string } | null
  coauthors?: { displayName: string }[] | null
  tags: { name: string }[] | null
  contents: { plaintextDescription: string | null } | null
}

/** Posts we may adapt: the Forum's own text (not linkposts), long enough to explain something. */
export function adaptableForumPosts(posts: RawForumPost[]): RawForumPost[] {
  return posts.filter((p) => !p.url && (p.wordCount ?? 0) >= 300)
}

/** Forum usernames as names: "Toby_Ord" → "Toby Ord". */
const displayName = (n: string) => noEmoji(n).replace(/_/g, ' ')

/** Every curated post, newest first: 215 in Nov 2026, back to 2014. */
export async function forumCandidates(http: Http = fetch, limit = 400): Promise<Candidate[]> {
  const data = await forum<{ posts: { results: RawForumPost[] } }>(
    http,
    `{ posts(input: { terms: { view: "curated", limit: ${limit} } }) { results {
      _id title pageUrl url postedAt baseScore wordCount
      user { displayName } coauthors { displayName } tags { name }
      contents { plaintextDescription }
    } } }`,
  )
  return adaptableForumPosts(data.posts.results).map((p) => ({
    kind: 'forum' as const,
    id: p._id,
    url: p.pageUrl,
    title: noEmoji(p.title),
    author: [p.user?.displayName, ...(p.coauthors ?? []).map((c) => c.displayName)]
      .filter(Boolean)
      .map((n) => displayName(n!))
      .join(', '),
    publishedAt: p.postedAt,
    score: p.baseScore,
    summary: (p.contents?.plaintextDescription ?? '').slice(0, 700),
    topics: (p.tags ?? []).map((t) => t.name).slice(0, 5),
  }))
}

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/<\/(p|h[1-6]|li|blockquote|tr)>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** The whole text of one post, for drafting. Long posts are cut at 60,000 characters. */
export async function forumPostText(id: string, http: Http = fetch): Promise<string> {
  const data = await forum<{ post: { result: { contents: { html: string | null } | null } | null } }>(
    http,
    `{ post(input: { selector: { _id: ${JSON.stringify(id)} } }) { result { contents { html } } } }`,
  )
  const html = data.post.result?.contents?.html
  if (!html) throw new SourceError('EA Forum: that post has no text')
  return htmlToText(html).slice(0, 60_000)
}

// ── The Introduction to EA Handbook ─────────────────────────────────────────

const HANDBOOK_ID = 'MobebwWs2o86cS9Rd'
/** Signposts, exercises and reading lists: not something to explain. */
const NOT_AN_ESSAY = /^(about this handbook|exercise for|more to explore|explore |discover |apply for|attend |find a local)/i

type RawHandbookPost = RawForumPost & { chapter: string }

/** Handbook essays we may adapt: CC BY like any Forum post, and not a signpost or exercise. */
export function handbookAdaptable(posts: RawHandbookPost[]): RawHandbookPost[] {
  return adaptableForumPosts(posts).filter((p) => !NOT_AN_ESSAY.test(p.title.trim())) as RawHandbookPost[]
}

export async function handbookCandidates(http: Http = fetch): Promise<Candidate[]> {
  const data = await forum<{
    collection: {
      result: { books: { sequences: { title: string; chapters: { posts: RawForumPost[] }[] }[] }[] } | null
    }
  }>(
    http,
    `{ collection(input: { selector: { _id: "${HANDBOOK_ID}" } }) { result { books { sequences { title chapters { posts {
      _id title pageUrl url postedAt baseScore wordCount
      user { displayName } coauthors { displayName } tags { name }
      contents { plaintextDescription }
    } } } } } } }`,
  )
  const posts: RawHandbookPost[] = (data.collection.result?.books ?? []).flatMap((b) =>
    b.sequences.flatMap((s) => s.chapters.flatMap((c) => c.posts.map((p) => ({ ...p, chapter: s.title })))),
  )
  return handbookAdaptable(posts).map((p) => ({
    kind: 'forum' as const,
    via: 'handbook' as const,
    id: p._id,
    url: p.pageUrl,
    title: noEmoji(p.title),
    author: [p.user?.displayName, ...(p.coauthors ?? []).map((c) => c.displayName)]
      .filter(Boolean)
      .map((n) => displayName(n!))
      .join(', '),
    publishedAt: p.postedAt,
    score: p.baseScore,
    summary: (p.contents?.plaintextDescription ?? '').slice(0, 700),
    topics: [p.chapter.replace(/^\d+\.\s*/, ''), ...(p.tags ?? []).map((t) => t.name)].slice(0, 5),
  }))
}

// ── CEA on Instagram ────────────────────────────────────────────────────────

type RawMedia = {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'CAROUSEL_ALBUM' | 'VIDEO'
  media_url?: string
  permalink: string
  timestamp: string
  like_count?: number
  comments_count?: number
  children?: { data: { media_type: string; media_url?: string }[] }
}

export type InstagramSource = { candidate: Candidate; images: string[]; caption: string }

const MEDIA_FIELDS =
  'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count,children{media_type,media_url}'

/** Reads a token's Graph API error into something James can act on. */
function discoveryError(message: string): SourceError {
  const permission = /permission|scope|\(#10\)|\(#200\)/i.test(message)
  return new SourceError(
    permission
      ? `Instagram won’t show CEA’s posts with this token: it needs instagram_manage_insights and pages_read_engagement as well. Add them to the system user’s token in Business Settings, then paste the new token. (${message})`
      : `Instagram: ${message}`,
  )
}

/** First line of a caption, as a title. */
export function captionTitle(caption: string): string {
  const first = noEmoji(caption.split('\n').find((l) => l.trim()) ?? '')
  return first.length <= 110 ? first : `${first.slice(0, 107).replace(/\s+\S*$/, '')}…`
}

export function mediaToSource(m: RawMedia): InstagramSource | null {
  if (m.media_type === 'VIDEO') return null
  const images =
    m.media_type === 'CAROUSEL_ALBUM'
      ? (m.children?.data ?? []).filter((c) => c.media_type === 'IMAGE' && c.media_url).map((c) => c.media_url!)
      : m.media_url
        ? [m.media_url]
        : []
  if (!images.length) return null
  const caption = m.caption ?? ''
  return {
    candidate: {
      kind: 'instagram',
      id: m.id,
      url: m.permalink,
      title: captionTitle(caption) || 'Untitled post',
      author: 'Centre for Effective Altruism',
      publishedAt: m.timestamp,
      score: (m.like_count ?? 0) + 3 * (m.comments_count ?? 0),
      summary: noEmoji(caption).slice(0, 700),
      topics: [],
    },
    images,
    caption,
  }
}

/** CEA's recent image and carousel posts, newest first. */
export async function instagramSources(token: string, http: Http = fetch, limit = 40): Promise<InstagramSource[]> {
  const fields = `business_discovery.username(${CEA_INSTAGRAM}){media.limit(${limit}){${MEDIA_FIELDS}}}`
  const res = await http(
    `${graphBase(token)}/${INSTAGRAM_ACCOUNT_ID}?${new URLSearchParams({ fields, access_token: token })}`,
    { cache: 'no-store' },
  )
  const data = (await res.json().catch(() => ({}))) as {
    business_discovery?: { media?: { data: RawMedia[] } }
    error?: { message?: string }
  }
  if (!res.ok || data.error) throw discoveryError(data.error?.message ?? `HTTP ${res.status}`)
  return (data.business_discovery?.media?.data ?? []).map(mediaToSource).filter((s): s is InstagramSource => s !== null)
}

/** Fetches slide images for the model, as base64. Instagram's CDN URLs expire, so this runs at drafting time. */
export async function fetchImages(urls: string[], http: Http = fetch) {
  const out: { mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; data: string }[] = []
  for (const url of urls.slice(0, 10)) {
    const res = await http(url)
    if (!res.ok) throw new SourceError(`Instagram: couldn’t fetch a slide image (HTTP ${res.status})`)
    const type = res.headers.get('content-type') ?? 'image/jpeg'
    const mediaType = type.includes('png') ? 'image/png' : type.includes('webp') ? 'image/webp' : 'image/jpeg'
    out.push({ mediaType, data: Buffer.from(await res.arrayBuffer()).toString('base64') })
  }
  return out
}
