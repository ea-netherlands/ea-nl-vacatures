/**
 * A charity's logo for the deep dive's cover, so the posts build recognition
 * of the charities themselves (James, 18 Nov 2026).
 *
 * It is the one on the charity's page at Doneer Effectief: the white version,
 * made for that page's coloured header, as an SVG or a PNG. The cover puts it
 * on a solid teal panel. It is fetched when a cover is drawn, trimmed of its
 * empty margins and turned into a PNG, since Satori needs an image's size and
 * can't be trusted with every SVG an editor exports. Any failure gives null,
 * and the cover prints the charity's name on the panel instead.
 */

import sharp from 'sharp'
import { isLogoUrl } from './catalogue'

export type CharityLogo = { src: string; width: number; height: number }

const UA = 'ean-social (+https://effectiefaltruisme.nl)'
const MAX_BYTES = 2_000_000
const cache = new Map<string, Promise<CharityLogo | null>>()

async function load(url: string, http: typeof fetch): Promise<CharityLogo | null> {
  try {
    const res = await http(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    const raw = Buffer.from(await res.arrayBuffer())
    if (!raw.length || raw.length > MAX_BYTES) return null
    const { data, info } = await sharp(raw, { density: 300 })
      .trim()
      .resize({ width: 1600, height: 400, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer({ resolveWithObject: true })
    return { src: `data:image/png;base64,${data.toString('base64')}`, width: info.width, height: info.height }
  } catch {
    return null
  }
}

/** The logo at `url`, ready for a slide; null if there is none or it can't be read. Kept for the server's lifetime. */
export function charityLogo(url: string | null | undefined, http: typeof fetch = fetch): Promise<CharityLogo | null> {
  if (!isLogoUrl(url)) return Promise.resolve(null)
  let hit = cache.get(url)
  if (!hit) {
    hit = load(url, http)
    cache.set(url, hit)
    // A failure isn't kept, so the next draw tries again.
    void hit.then((logo) => logo || cache.delete(url))
  }
  return hit
}
