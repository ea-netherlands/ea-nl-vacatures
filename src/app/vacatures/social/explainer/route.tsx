/**
 * One slide of the weekly explainer (../../../../jobboard/social/explainer), as
 * a PNG, or a JPEG with `format=jpg` for Instagram. Public for the same reason
 * as the jobs post's slides: Instagram and LinkedIn fetch them by URL.
 *
 * `d` (Thursday's date), `l` (en or nl) and `i` (slide number) pick the slide;
 * the text comes from the stored post. `v` is the slide text's hash, only there
 * so an edit gets a fresh URL past the CDN cache.
 */

import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import { loadAssets } from '@jobboard/og/card'
import { SLIDE_SIZE } from '@jobboard/social/content'
import { ExplainerSlide, explainerSlides } from '@jobboard/social/explainer/slides'
import { getExplainer } from '@jobboard/social/explainer/store'

export const runtime = 'nodejs'

const CACHE = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const date = params.get('d') ?? ''
  const lang = params.get('l')
  const index = Number(params.get('i'))
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || (lang !== 'en' && lang !== 'nl') || !Number.isInteger(index)) {
    return new Response('Not found', { status: 404 })
  }
  const [post, { fonts, logo }] = await Promise.all([getExplainer(date).catch(() => null), loadAssets()])
  const content = post ? explainerSlides(post, lang)[index] : undefined
  if (!content) return new Response('Not found', { status: 404 })

  const png = new ImageResponse(<ExplainerSlide content={content} logo={logo} />, { ...SLIDE_SIZE, fonts })
  if (params.get('format') !== 'jpg') {
    return new Response(png.body, { headers: { 'content-type': 'image/png', 'cache-control': CACHE } })
  }
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer()
  return new Response(new Uint8Array(jpeg), { headers: { 'content-type': 'image/jpeg', 'cache-control': CACHE } })
}
