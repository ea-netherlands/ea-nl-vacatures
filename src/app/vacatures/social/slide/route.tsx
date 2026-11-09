/**
 * One slide of the weekly social post (../../../../jobboard/social), as a PNG,
 * or as a JPEG with `format=jpg`: Instagram's publishing API takes JPEG only.
 *
 * Under /vacatures because that is a path the main site forwards here, and the
 * images have to be public: Instagram's API fetches each one by URL when the
 * post is published.
 */

import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import { loadAssets } from '@jobboard/og/card'
import { resolveSlide, SLIDE_SIZE } from '@jobboard/social/content'
import { Slide } from '@jobboard/social/slides'

export const runtime = 'nodejs'

// A listing edited in the Studio shows on the next render within the hour.
const CACHE = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const [content, { fonts, logo }] = await Promise.all([resolveSlide(params), loadAssets()])
  if (!content) return new Response('Not found', { status: 404 })
  const png = new ImageResponse(<Slide content={content} logo={logo} />, { ...SLIDE_SIZE, fonts })

  if (params.get('format') !== 'jpg') {
    return new Response(png.body, { headers: { 'content-type': 'image/png', 'cache-control': CACHE } })
  }
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer()
  return new Response(new Uint8Array(jpeg), { headers: { 'content-type': 'image/jpeg', 'cache-control': CACHE } })
}
