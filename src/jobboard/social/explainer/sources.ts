/**
 * Where the weekly explainer's material comes from.
 *
 * - Curated EA Forum posts. Everything posted to the Forum since 1 December
 *   2022 is CC BY 4.0 (forum.effectivealtruism.org/copyright, read 11 Nov
 *   2026), so it can be adapted and translated with credit. Older posts are
 *   all rights reserved unless the author says otherwise, and a linkpost's
 *   linked article isn't covered at all, so both are left out.
 * - The Centre for Effective Altruism's Instagram (effectivealtruismofficial),
 *   read through Instagram's business discovery: captions, slide images and
 *   engagement of another business account's public posts. Off unless
 *   EXPLAINER_INSTAGRAM is "on", because adapting CEA's posts needs CEA's
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

export const CEA_INSTAGRAM = 'effectivealtruismofficial'
export const FORUM_LICENCE_FROM = '2022-12-01T00:00:00.000Z'

export function instagramSourceEnabled(): boolean {
  return process.env.EXPLAINER_INSTAGRAM === 'on'
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
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
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

/** Curated posts we may adapt: CC BY (posted since Dec 2022) and not linkposts. */
export function adaptableForumPosts(posts: RawForumPost[]): RawForumPost[] {
  return posts.filter((p) => p.postedAt >= FORUM_LICENCE_FROM && !p.url && (p.wordCount ?? 0) >= 300)
}

export async function forumCandidates(http: Http = fetch, limit = 40): Promise<Candidate[]> {
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
      .map((n) => noEmoji(n!))
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
