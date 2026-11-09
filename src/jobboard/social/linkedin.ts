/**
 * Posting the weekly carousel to James's own LinkedIn, with the self-serve
 * "Share on LinkedIn" product (w_member_social) and "Sign In with LinkedIn
 * using OpenID Connect" (openid, profile) for who he is.
 *
 * https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
 * (read 9 Nov 2026): register each image with assets?action=registerUpload,
 * upload the bytes, then one ugcPosts call with every asset as IMAGE media.
 * Member tokens last 60 days and can't be refreshed by an app like this one,
 * so James reconnects; the page and the Monday mail warn two weeks ahead.
 *
 * EA Nederland's own page needs the Community Management API
 * (w_organization_social), which LinkedIn grants by application. Until then
 * the page is posted by hand from the bundle on /review/social.
 *
 * `http` is injectable so the tests run the whole flow without LinkedIn.
 */

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

const restli = (token: string) => ({
  authorization: `Bearer ${token}`,
  'x-restli-protocol-version': '2.0.0',
  'content-type': 'application/json',
})

export async function publishLinkedInImages(args: {
  token: string
  personUrn: string
  imageUrls: string[]
  caption: string
  http?: Http
}): Promise<{ id: string; url: string | null }> {
  const http = args.http ?? fetch
  const assets: string[] = []

  for (const imageUrl of args.imageUrls) {
    const reg = await json<{
      value: {
        asset: string
        uploadMechanism: { 'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': { uploadUrl: string } }
      }
    }>(
      await http('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: restli(args.token),
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: args.personUrn,
            serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
          },
        }),
      }),
      'image registration',
    )
    const image = await http(imageUrl)
    if (!image.ok) throw new LinkedInError(`LinkedIn: could not fetch slide ${imageUrl} (HTTP ${image.status})`)
    const upload = await http(
      reg.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl,
      { method: 'PUT', headers: { authorization: `Bearer ${args.token}` }, body: await image.arrayBuffer() },
    )
    if (!upload.ok) throw new LinkedInError(`LinkedIn image upload: HTTP ${upload.status}`)
    assets.push(reg.value.asset)
  }

  const res = await http('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: restli(args.token),
    body: JSON.stringify({
      author: args.personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: args.caption },
          shareMediaCategory: 'IMAGE',
          media: assets.map((media) => ({ status: 'READY', media })),
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  })
  if (!res.ok) await json(res, 'post')
  const id = res.headers.get('x-restli-id') ?? ''
  return { id, url: id ? `https://www.linkedin.com/feed/update/${id}/` : null }
}
