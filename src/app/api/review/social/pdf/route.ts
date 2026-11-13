/**
 * The week's jobs post as one PDF, for posting EA Nederland's LinkedIn page by
 * hand: uploaded as a document, LinkedIn shows it as a swipeable carousel.
 * The same PDF James's own LinkedIn gets from the API (social/publish.ts).
 *
 * Behind the review session, like the rest of /review/social.
 */

import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifyToken } from '@jobboard/review/auth'
import { getListingsByIds } from '@jobboard/sanity/queries'
import { postSlides, slidePath } from '@jobboard/social/content'
import { fetchSlides } from '@jobboard/social/linkedin'
import { jpegsToPdf } from '@jobboard/social/pdf'
import { jobsDocumentTitle } from '@jobboard/social/publish'
import { getPost } from '@jobboard/social/store'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const jar = await cookies()
  if (!verifyToken('session', jar.get(SESSION_COOKIE)?.value)) return new Response('Sign in again', { status: 401 })

  const url = new URL(request.url)
  const date = url.searchParams.get('date') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Response('Not found', { status: 404 })
  const post = await getPost(date).catch(() => null)
  if (!post) return new Response('Not found', { status: 404 })

  const slides = postSlides(await getListingsByIds(post.listingIds), date, post.theme ?? 'mixed')
  const title = jobsDocumentTitle(slides)
  const pdf = jpegsToPdf(await fetchSlides(slides.map((s) => `${url.origin}${slidePath(s, 'jpg')}`)), title)
  return new Response(pdf, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${title.replace(/[^\w ,-]/g, '')}.pdf"`,
      'cache-control': 'private, no-store',
    },
  })
}
