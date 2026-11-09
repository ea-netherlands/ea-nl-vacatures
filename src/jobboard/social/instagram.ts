/**
 * Posting the weekly carousel to EA Nederland's Instagram, via the Instagram
 * API with Instagram Login (graph.instagram.com).
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
const BASE = `https://graph.instagram.com/${VERSION}`

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

const post = (http: Http, path: string, params: Record<string, string>) =>
  call<{ id: string }>(http, `${BASE}${path}`, { method: 'POST', body: new URLSearchParams(params) })

/** Who a token posts as. */
export async function instagramAccount(token: string, http: Http = fetch) {
  const me = await call<{ user_id?: string; id: string; username?: string }>(
    http,
    `${BASE}/me?${new URLSearchParams({ fields: 'user_id,username', access_token: token })}`,
  )
  return { userId: me.user_id ?? me.id, username: me.username ?? null }
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

  const children: string[] = []
  for (const url of args.imageUrls) {
    const { id } = await post(http, `/${args.userId}/media`, {
      image_url: url,
      is_carousel_item: 'true',
      access_token: args.token,
    })
    children.push(id)
  }

  const { id: container } = await post(http, `/${args.userId}/media`, {
    media_type: 'CAROUSEL',
    children: children.join(','),
    caption: args.caption,
    access_token: args.token,
  })

  const deadline = Date.now() + (args.timeoutMs ?? 120_000)
  for (;;) {
    const { status_code } = await call<{ status_code?: string }>(
      http,
      `${BASE}/${container}?${new URLSearchParams({ fields: 'status_code', access_token: args.token })}`,
    )
    if (status_code === 'FINISHED') break
    if (status_code === 'ERROR' || status_code === 'EXPIRED') {
      throw new InstagramError(`Instagram: the carousel could not be processed (${status_code})`)
    }
    if (Date.now() > deadline) throw new InstagramError('Instagram: still processing after two minutes')
    await sleep(5000)
  }

  const { id } = await post(http, `/${args.userId}/media_publish`, { creation_id: container, access_token: args.token })
  const media = await call<{ permalink?: string }>(
    http,
    `${BASE}/${id}?${new URLSearchParams({ fields: 'permalink', access_token: args.token })}`,
  ).catch(() => ({ permalink: undefined }))
  return { id, url: media.permalink ?? null }
}
