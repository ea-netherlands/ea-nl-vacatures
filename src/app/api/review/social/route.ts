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
import { isThemeKey } from '@jobboard/social/themes'
import { draftPost, recompose } from '@jobboard/social/weekly'
import { instagramAccount } from '@jobboard/social/instagram'
import { deleteToken, saveToken } from '@jobboard/social/tokens'

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
    // Connections: not tied to a week.
    if (body.action === 'instagram-token') {
      const token = typeof body.token === 'string' ? body.token.trim() : ''
      if (token.length < 20) return fail('That doesn’t look like an access token.')
      let account: { userId: string; username: string | null }
      try {
        account = await instagramAccount(token)
      } catch (err) {
        return fail(`Instagram didn’t accept that token: ${(err as Error).message.replace(/^Instagram: /, '')}`)
      }
      await saveToken({
        channel: 'instagram',
        accessToken: token,
        // Long-lived Instagram tokens last 60 days; the Monday cron refreshes it.
        expiresAt: new Date(Date.now() + 60 * 864e5),
        accountId: account.userId,
        accountName: account.username,
      })
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'disconnect') {
      if (body.channel !== 'instagram' && body.channel !== 'linkedinPersonal') return fail('Unknown account.')
      await deleteToken(body.channel)
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'draft') {
      // Redraft keeps the week's theme; the theme switch sends a new one.
      const { post } = await draftPost({ force: true, theme: isThemeKey(body.theme) ? body.theme : undefined })
      return NextResponse.json({ ok: true, post })
    }

    // Marking EA Nederland's LinkedIn as posted by hand happens on posting day,
    // when "next Tuesday" has already moved on a week, so it names its date.
    if (body.action === 'mark-posted') {
      const date = typeof body.postDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.postDate) ? body.postDate : postDate
      const target = await getPost(date)
      if (!target || (target.status !== 'approved' && target.status !== 'posted')) {
        return fail('Only an approved post can be marked as posted.')
      }
      const url = typeof body.url === 'string' && /^https:\/\/(www\.)?linkedin\.com\//.test(body.url) ? body.url : null
      const results = { ...(target.results ?? {}), linkedinOrg: { at: new Date().toISOString(), id: 'manual', url, manual: true } }
      return NextResponse.json({ ok: true, post: await patchPost(date, { results }) })
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
