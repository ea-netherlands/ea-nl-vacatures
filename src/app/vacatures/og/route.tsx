/**
 * The share-card image for every public page on the board (../../jobboard/og).
 *
 * Lives under /vacatures because that is a path the main site forwards here;
 * a card on any other path would 404 on effectiefaltruisme.nl.
 */

import { ImageResponse } from 'next/og'
import { Card, loadAssets } from '@jobboard/og/card'
import { OG_SIZE, resolveCard } from '@jobboard/og/content'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const [content, { fonts, logo, pattern }] = await Promise.all([resolveCard(params), loadAssets()])
  return new ImageResponse(<Card content={content} logo={logo} pattern={pattern} />, {
    ...OG_SIZE,
    fonts,
    headers: {
      // Crawlers fetch a card once per share; a day's staleness is fine and
      // keeps a viral link from rendering the image thousands of times.
      'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
