/**
 * One slide of the weekly social post (../../../../jobboard/social), as a PNG.
 *
 * Under /vacatures because that is a path the main site forwards here, and the
 * images have to be public: Instagram's API fetches each one by URL when the
 * post is published.
 */

import { ImageResponse } from 'next/og'
import { loadAssets } from '@jobboard/og/card'
import { resolveSlide, SLIDE_SIZE } from '@jobboard/social/content'
import { Slide } from '@jobboard/social/slides'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const [content, { fonts, logo }] = await Promise.all([resolveSlide(params), loadAssets()])
  if (!content) return new Response('Not found', { status: 404 })
  return new ImageResponse(<Slide content={content} logo={logo} />, {
    ...SLIDE_SIZE,
    fonts,
    headers: {
      // A listing edited in the Studio shows on the next render within the hour.
      'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
