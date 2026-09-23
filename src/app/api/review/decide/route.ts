/**
 * The dashboard's one write endpoint: accept or reject a listing.
 *
 * Authenticated by the session cookie from /api/review/session, and refused
 * unless the request comes from this site's own origin — the cookie is Lax,
 * which already withholds it from cross-site POSTs, and the Origin check is
 * the second lock on the same door.
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE, verifyToken } from '@jobboard/review/auth'
import { isRejectCategory } from '@jobboard/review/categories'
import { acceptListing, DecisionError, rejectListing } from '@jobboard/review/decide'

export const dynamic = 'force-dynamic'

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  return origin === new URL(request.url).origin
}

export async function POST(request: Request) {
  const jar = await cookies()
  if (!verifyToken('session', jar.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Your session has expired. Open the link in the latest digest.' }, { status: 401 })
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'cross-origin request refused' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'expected a JSON body' }, { status: 400 })
  }

  const draftId = typeof body.draftId === 'string' ? body.draftId : ''
  try {
    if (body.action === 'accept') {
      const note = typeof body.note === 'string' ? body.note : undefined
      const { publishedId } = await acceptListing(draftId, note)
      return NextResponse.json({ ok: true, publishedId })
    }
    if (body.action === 'reject') {
      await rejectListing(draftId, {
        category: isRejectCategory(body.category) ? body.category : undefined,
        reason: typeof body.reason === 'string' ? body.reason : undefined,
      })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'action must be "accept" or "reject"' }, { status: 400 })
  } catch (err) {
    if (err instanceof DecisionError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[review:decide]', err)
    return NextResponse.json({ error: 'Something went wrong saving that. Try again.' }, { status: 500 })
  }
}
