/**
 * One slide of the weekly explainer (../../../../jobboard/social/explainer), as
 * a PNG, or a JPEG with `format=jpg` for Instagram. Public once approved, for the
 * same reason as the jobs post's slides: Instagram and LinkedIn fetch them by URL.
 * Before that (a draft, or skipped) only someone signed in to the social review
 * pages gets the image, and it is never cached by the CDN, so an unapproved
 * explainer can't be read by guessing the address.
 *
 * `d` (the week's Thursday), `c` (li or ig, the account) and `i` (slide number) pick the slide;
 * the text comes from the stored post. `v` is the slide text's hash, only there
 * so an edit gets a fresh URL past the CDN cache. `s=c` reads the charity deep
 * dive's week instead of the explainer's (its `d` is the week's Monday).
 */

import { cookies } from 'next/headers'
import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import { loadAssets } from '@jobboard/og/card'
import { SLIDE_SIZE } from '@jobboard/social/content'
import { ExplainerSlide, explainerSlides } from '@jobboard/social/explainer/slides'
import { CHANNEL_CODE, EXPLAINER_CHANNELS, getExplainer } from '@jobboard/social/explainer/store'
import { SOCIAL_SESSION_COOKIE, socialSignedIn } from '@jobboard/review/auth'
import { CHARITY, EXPLAINER, SERIES_CODE } from '@jobboard/social/explainer/series'

export const runtime = 'nodejs'

const CACHE = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
const NO_CACHE = 'private, no-store'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const date = params.get('d') ?? ''
  const channel = EXPLAINER_CHANNELS.find((c) => CHANNEL_CODE[c] === params.get('c'))
  const index = Number(params.get('i'))
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !channel || !Number.isInteger(index)) {
    return new Response('Not found', { status: 404 })
  }
  const series = params.get('s') === SERIES_CODE.charity ? CHARITY : EXPLAINER
  const [post, { fonts, logo }] = await Promise.all([getExplainer(date, series).catch(() => null), loadAssets()])
  const content = post ? explainerSlides(post, channel)[index] : undefined
  if (!content) return new Response('Not found', { status: 404 })

  const status = post?.[channel]?.status
  const isPublic = status === 'approved' || status === 'posted'
  if (!isPublic && !socialSignedIn((await cookies()).get(SOCIAL_SESSION_COOKIE)?.value)) {
    // Same answer as a slide that doesn't exist, so drafts can't be probed for.
    return new Response('Not found', { status: 404, headers: { 'cache-control': NO_CACHE } })
  }
  const cache = isPublic ? CACHE : NO_CACHE

  const png = new ImageResponse(<ExplainerSlide content={content} logo={logo} />, { ...SLIDE_SIZE, fonts })
  if (params.get('format') !== 'jpg') {
    return new Response(png.body, { headers: { 'content-type': 'image/png', 'cache-control': cache } })
  }
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer()
  return new Response(new Uint8Array(jpeg), { headers: { 'content-type': 'image/jpeg', 'cache-control': cache } })
}
