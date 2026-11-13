/**
 * Posting the weekly carousel to James's own LinkedIn, with the self-serve
 * "Share on LinkedIn" product (w_member_social) and "Sign In with LinkedIn
 * using OpenID Connect" (openid, profile) for who he is.
 *
 * The slides go up as one PDF, posted as a document: LinkedIn shows a
 * document as a swipeable carousel, where images show as a grid you have to
 * click into (James, 13 Nov 2026). The Documents API and the Posts API
 * (/rest/…, versioned by the LinkedIn-Version header) take the same
 * w_member_social token: initializeUpload, PUT the bytes, wait until the
 * document is AVAILABLE, then one post with the document as its media.
 * https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/documents-api
 * https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
 * A version is supported for about a year; LINKEDIN_VERSION overrides ours.
 * Member tokens last 60 days and can't be refreshed by an app like this one,
 * so James reconnects; the page and the Monday mail warn two weeks ahead.
 *
 * EA Nederland's own page needs the Community Management API
 * (w_organization_social), which LinkedIn grants by application. Until then
 * the page is posted by hand from the bundle on /review/social.
 *
 * `http` is injectable so the tests run the whole flow without LinkedIn.
 */

import { jpegsToPdf } from './pdf'

type Http = typeof fetch

export class LinkedInError extends Error {}

export const LINKEDIN_SCOPES = ['openid', 'profile', 'w_member_social']

export function linkedinConfigured(): boolean {
  return Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET)
}

export function authoriseUrl(redirectUri: string, state: string): string {
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID ?? '',
    redirect_uri: redirectUri,
    state,
    scope: LINKEDIN_SCOPES.join(' '),
  })
  return `https://www.linkedin.com/oauth/v2/authorization?${q}`
}

async function json<T>(res: Response, what: string): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { message?: string; error_description?: string }
  if (!res.ok) throw new LinkedInError(`LinkedIn ${what}: ${data.message ?? data.error_description ?? `HTTP ${res.status}`}`)
  return data
}

/** Swaps the code from the consent screen for a token, and finds whose it is. */
export async function exchangeCode(code: string, redirectUri: string, http: Http = fetch) {
  const token = await json<{ access_token: string; expires_in: number }>(
    await http('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID ?? '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? '',
      }),
    }),
    'token exchange',
  )
  const me = await json<{ sub: string; name?: string }>(
    await http('https://api.linkedin.com/v2/userinfo', { headers: { authorization: `Bearer ${token.access_token}` } }),
    'profile',
  )
  return {
    accessToken: token.access_token,
    expiresAt: new Date(Date.now() + token.expires_in * 1000),
    personUrn: `urn:li:person:${me.sub}`,
    name: me.name ?? null,
  }
}

/** The Posts and Documents APIs' monthly version, YYYYMM. */
export const LINKEDIN_VERSION = process.env.LINKEDIN_VERSION || '202608'

const rest = (token: string) => ({
  authorization: `Bearer ${token}`,
  'linkedin-version': LINKEDIN_VERSION,
  'x-restli-protocol-version': '2.0.0',
  'content-type': 'application/json',
})

/**
 * The Posts API reads commentary as "little text", where | { } @ [ ] ( ) < > #
 * \ * _ ~ are markup: an unescaped "(" can cut the post off there. Escape them
 * all, then write each hashtag as LinkedIn's hashtag template so it still links.
 */
export function littleText(text: string): string {
  return text
    .replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`)
    .replace(/\\#((?:[\p{L}\p{N}]|\\_)+)/gu, (_, tag: string) => `{hashtag|\\#|${tag.replace(/\\_/g, '_')}}`)
}

export async function publishLinkedInDocument(args: {
  token: string
  personUrn: string
  /** The slides as JPEGs, in order: they go into the PDF as they are. */
  imageUrls: string[]
  /** Shown above the carousel, and as the file's name. */
  title: string
  caption: string
  http?: Http
  sleep?: (ms: number) => Promise<void>
  /** How long to wait for LinkedIn to process the document. */
  timeoutMs?: number
}): Promise<{ id: string; url: string | null }> {
  const http = args.http ?? fetch
  const sleep = args.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))

  const pdf = jpegsToPdf(await fetchSlides(args.imageUrls, http), args.title)

  const init = await json<{ value: { uploadUrl: string; document: string } }>(
    await http('https://api.linkedin.com/rest/documents?action=initializeUpload', {
      method: 'POST',
      headers: rest(args.token),
      body: JSON.stringify({ initializeUploadRequest: { owner: args.personUrn } }),
    }),
    'document registration',
  )
  const upload = await http(init.value.uploadUrl, {
    method: 'PUT',
    headers: { authorization: `Bearer ${args.token}`, 'content-type': 'application/pdf' },
    body: pdf,
  })
  if (!upload.ok) throw new LinkedInError(`LinkedIn document upload: HTTP ${upload.status}`)

  const document = init.value.document
  const deadline = Date.now() + (args.timeoutMs ?? 120_000)
  for (;;) {
    const { status } = await json<{ status?: string }>(
      await http(`https://api.linkedin.com/rest/documents/${encodeURIComponent(document)}`, { headers: rest(args.token) }),
      'document status',
    )
    if (status === 'AVAILABLE') break
    if (status === 'PROCESSING_FAILED') throw new LinkedInError('LinkedIn: the PDF could not be processed')
    if (Date.now() > deadline) throw new LinkedInError('LinkedIn: the PDF was still processing after two minutes')
    await sleep(3000)
  }

  const res = await http('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: rest(args.token),
    body: JSON.stringify({
      author: args.personUrn,
      commentary: littleText(args.caption),
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { media: { title: args.title, id: document } },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  })
  if (!res.ok) await json(res, 'post')
  const id = res.headers.get('x-restli-id') ?? ''
  return { id, url: id ? `https://www.linkedin.com/feed/update/${id}/` : null }
}

/** Every slide's bytes, in order. */
export async function fetchSlides(urls: string[], http: Http = fetch): Promise<Uint8Array[]> {
  return Promise.all(
    urls.map(async (url) => {
      const res = await http(url)
      if (!res.ok) throw new LinkedInError(`LinkedIn: could not fetch slide ${url} (HTTP ${res.status})`)
      return new Uint8Array(await res.arrayBuffer())
    }),
  )
}
