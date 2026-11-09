/**
 * The weekly social post's one write endpoint (/review/social).
 *
 * Same locks as /api/review/decide: the review session cookie, and the
 * request's Origin must be this site. Acts only on the next Tuesday's post.
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE, verifyToken } from '@jobboard/review/auth'
import { nextPostTime, SELECTION } from '@jobboard/social/select'
import { amsterdamDate, CHANNEL_LIMIT, CHANNELS, getPost, patchPost, type Channel } from '@jobboard/social/store'
import { draftPost, recompose } from '@jobboard/social/weekly'

export const dynamic = 'force-dynamic'
// Drafting calls the model once for all three captions.
export const maxDuration = 120

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  return Boolean(origin) && origin === new URL(request.url).origin
}

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(request: Request) {
  const jar = await cookies()
  if (!verifyToken('session', jar.get(SESSION_COOKIE)?.value)) {
    return fail('Your session has expired. Open the link in the latest email.', 401)
  }
  if (!sameOrigin(request)) return fail('cross-origin request refused', 403)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return fail('expected a JSON body')
  }

  const postDate = amsterdamDate(nextPostTime())
  try {
    if (body.action === 'draft') {
      const { post } = await draftPost({ force: true })
      return NextResponse.json({ ok: true, post })
    }

    const post = await getPost(postDate)
    if (!post) return fail('There is no draft for this week yet. Draft it first.', 404)
    if (post.status === 'posted') return fail('This post has gone out already.', 409)

    switch (body.action) {
      case 'save': {
        if (post.status !== 'draft') return fail('Reopen the post to edit it.', 409)
        const input = (body.captions ?? {}) as Record<string, unknown>
        const captions = {} as Record<Channel, string>
        for (const c of CHANNELS) {
          const text = input[c]
          if (typeof text !== 'string' || !text.trim()) return fail('Every caption needs some text.')
          if (text.length > CHANNEL_LIMIT[c]) return fail(`That caption is over ${CHANNEL_LIMIT[c]} characters.`)
          captions[c] = text
        }
        return NextResponse.json({ ok: true, post: await patchPost(postDate, { captions }) })
      }
      case 'remove': {
        if (post.status !== 'draft') return fail('Reopen the post to edit it.', 409)
        const id = body.listingId
        if (typeof id !== 'string' || !post.listingIds.includes(id)) return fail('That role is not in this post.')
        const listingIds = post.listingIds.filter((x) => x !== id)
        const captions = await recompose({ ...post, listingIds })
        return NextResponse.json({ ok: true, post: await patchPost(postDate, { listingIds, captions }) })
      }
      case 'approve': {
        if (post.listingIds.length < SELECTION.min) return fail(`A post needs at least ${SELECTION.min} roles.`)
        if (!post.captions) return fail('Draft the captions first.')
        return NextResponse.json({
          ok: true,
          post: await patchPost(postDate, { status: 'approved', approvedAt: new Date().toISOString() }),
        })
      }
      case 'skip':
        return NextResponse.json({ ok: true, post: await patchPost(postDate, { status: 'skipped', approvedAt: null }) })
      case 'reopen':
        return NextResponse.json({ ok: true, post: await patchPost(postDate, { status: 'draft', approvedAt: null }) })
      default:
        return fail('Unknown action.')
    }
  } catch (err) {
    console.error('[review:social]', err)
    return fail('Something went wrong saving that. Try again.', 500)
  }
}
