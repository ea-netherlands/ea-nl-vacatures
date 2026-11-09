/**
 * Posting the weekly carousel to EA Nederland's Instagram.
 *
 * Two kinds of token work, and the code tells them apart by prefix:
 * - a system-user token (EAA…) from Business Settings → System users, on
 *   graph.facebook.com. Never expires. This is what EA Nederland uses: Meta
 *   stopped offering "API setup with Instagram login" to new apps in 2026, and
 *   the app created on 9 Nov 2026 only had "Unified login".
 * - an Instagram user token (IG…) from Instagram Login, on graph.instagram.com.
 *   Lasts 60 days and is refreshed by the Monday cron.
 * Publishing is the same calls on either host.
 *
 * https://developers.facebook.com/docs/instagram-platform/content-publishing
 * (read 9 Nov 2026): JPEG only, fetched by Instagram from a public URL; a
 * container per image (`is_carousel_item`), a CAROUSEL container with the
 * caption, wait for it to be FINISHED, then `media_publish`. Up to 20 items.
 *
 * Tokens are long-lived (60 days) and can be refreshed once they are a day
 * old; the Monday cron refreshes any within a month of expiry.
 *
 * `http` is injectable so the tests run the whole flow without Instagram.
 */

const VERSION = process.env.IG_GRAPH_VERSION ?? 'v24.0'

/** ea_netherlands' Instagram professional account id (not a secret; shown in the Meta app). */
export const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID ?? '17841455139503724'

export type TokenKind = 'instagram' | 'facebook'
export const tokenKind = (token: string): TokenKind => (token.startsWith('IG') ? 'instagram' : 'facebook')

export function graphBase(token: string): string {
  return tokenKind(token) === 'instagram'
    ? `https://graph.instagram.com/${VERSION}`
    : `https://graph.facebook.com/${VERSION}`
}

type Http = typeof fetch

export class InstagramError extends Error {}

async function call<T>(http: Http, url: string, init?: RequestInit): Promise<T> {
  const res = await http(url, init)
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } }
  if (!res.ok || data.error) {
    throw new InstagramError(`Instagram: ${data.error?.message ?? `HTTP ${res.status}`}`)
  }
  return data
}

const post = (http: Http, token: string, path: string, params: Record<string, string>) =>
  call<{ id: string }>(http, `${graphBase(token)}${path}`, {
    method: 'POST',
    body: new URLSearchParams({ ...params, access_token: token }),
  })

/**
 * Who a token posts as, checked against Instagram. A system user's /me is the
 * system user, not the account, so that kind is checked on the account id.
 */
export async function instagramAccount(token: string, http: Http = fetch) {
  if (tokenKind(token) === 'instagram') {
    const me = await call<{ user_id?: string; id: string; username?: string }>(
      http,
      `${graphBase(token)}/me?${new URLSearchParams({ fields: 'user_id,username', access_token: token })}`,
    )
    return { userId: me.user_id ?? me.id, username: me.username ?? null }
  }
  const account = await call<{ id: string; username?: string }>(
    http,
    `${graphBase(token)}/${INSTAGRAM_ACCOUNT_ID}?${new URLSearchParams({ fields: 'id,username', access_token: token })}`,
  )
  return { userId: account.id, username: account.username ?? null }
}

/** A fresh 60-day token for one at least a day old. */
export async function refreshInstagramToken(token: string, http: Http = fetch) {
  const data = await call<{ access_token: string; expires_in: number }>(
    http,
    `https://graph.instagram.com/refresh_access_token?${new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: token,
    })}`,
  )
  return { token: data.access_token, expiresAt: new Date(Date.now() + data.expires_in * 1000) }
}

export async function publishInstagramCarousel(args: {
  userId: string
  token: string
  imageUrls: string[]
  caption: string
  http?: Http
  sleep?: (ms: number) => Promise<void>
  /** How long to wait for Instagram to process the carousel. */
  timeoutMs?: number
}): Promise<{ id: string; url: string | null }> {
  const http = args.http ?? fetch
  const sleep = args.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  if (args.imageUrls.length < 2 || args.imageUrls.length > 20) {
    throw new InstagramError(`Instagram: a carousel takes 2 to 20 images, not ${args.imageUrls.length}`)
  }

  const base = graphBase(args.token)
  const children: string[] = []
  for (const url of args.imageUrls) {
    const { id } = await post(http, args.token, `/${args.userId}/media`, { image_url: url, is_carousel_item: 'true' })
    children.push(id)
  }

  const { id: container } = await post(http, args.token, `/${args.userId}/media`, {
    media_type: 'CAROUSEL',
    children: children.join(','),
    caption: args.caption,
  })

  const deadline = Date.now() + (args.timeoutMs ?? 120_000)
  for (;;) {
    const { status_code } = await call<{ status_code?: string }>(
      http,
      `${base}/${container}?${new URLSearchParams({ fields: 'status_code', access_token: args.token })}`,
    )
    if (status_code === 'FINISHED') break
    if (status_code === 'ERROR' || status_code === 'EXPIRED') {
      throw new InstagramError(`Instagram: the carousel could not be processed (${status_code})`)
    }
    if (Date.now() > deadline) throw new InstagramError('Instagram: still processing after two minutes')
    await sleep(5000)
  }

  const { id } = await post(http, args.token, `/${args.userId}/media_publish`, { creation_id: container })
  const media = await call<{ permalink?: string }>(
    http,
    `${base}/${id}?${new URLSearchParams({ fields: 'permalink', access_token: args.token })}`,
  ).catch(() => ({ permalink: undefined }))
  return { id, url: media.permalink ?? null }
}
