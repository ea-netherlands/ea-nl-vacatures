/**
 * A charity's logo for the deep dive's cover, so the posts build recognition
 * of the charities themselves (James, 18 Nov 2026).
 *
 * It is the one on the charity's page at Doneer Effectief: the white version,
 * made for that page's coloured header, as an SVG or a PNG. A white logo can't
 * go on white paper, and a teal panel to hold it was too heavy (James, 18 Nov
 * 2026), so only its shape is kept and drawn in the text's near-black: the
 * one-colour version most brands allow. It is fetched when a cover is drawn,
 * trimmed of its empty margins and turned into a PNG, since Satori needs an
 * image's size. Any failure gives null, and the cover prints the charity's
 * name instead.
 */

import sharp from 'sharp'
import { isLogoUrl } from './catalogue'

export type CharityLogo = { src: string; width: number; height: number }

const UA = 'ean-social (+https://effectiefaltruisme.nl)'
const MAX_BYTES = 2_000_000
/** --fg: the logo is drawn in the slides' text colour, straight on the paper. */
const INK = '#09090b'
const cache = new Map<string, Promise<CharityLogo | null>>()

async function load(url: string, http: typeof fetch): Promise<CharityLogo | null> {
  try {
    const res = await http(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    const raw = Buffer.from(await res.arrayBuffer())
    if (!raw.length || raw.length > MAX_BYTES) return null
    // Trim the empty margins, then keep only the logo's shape (its alpha) and fill it with ink.
    const { data: alpha, info } = await sharp(raw, { density: 300 })
      .trim()
      .resize({ width: 1200, height: 300, fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .extractChannel('alpha')
      .raw()
      .toBuffer({ resolveWithObject: true })
    const { width, height } = info
    const data = await sharp({ create: { width, height, channels: 3, background: INK } })
      .joinChannel(alpha, { raw: { width, height, channels: 1 } })
      .png()
      .toBuffer()
    return { src: `data:image/png;base64,${data.toString('base64')}`, width, height }
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
