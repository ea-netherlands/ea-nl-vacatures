/**
 * Exchanges the digest's signed link for a dashboard session.
 *
 * The only side effect is the cookie. Mail scanners and link previews fetch
 * this URL too, and all they get is a cookie in a browser nobody uses —
 * nothing is published or rejected by following a link (see review/auth.ts).
 */

import { NextResponse } from 'next/server'
import {
  issueToken,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  verifyToken,
} from '@jobboard/review/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('t')
  const focus = url.searchParams.get('focus')

  if (!verifyToken('link', token)) {
    return NextResponse.redirect(new URL('/review?link=expired', url), 303)
  }

  // Only a plain anchor id, so this can never become an open redirect.
  const hash = focus && /^listing-[\w-]+$/.test(focus) ? `#${focus}` : ''
  const res = NextResponse.redirect(new URL(`/review${hash}`, url), 303)
  res.cookies.set(SESSION_COOKIE, issueToken('session', SESSION_TTL_MS), {
    httpOnly: true,
    secure: url.protocol === 'https:',
    // Lax, so the cookie arrives on the top-level navigation from the mail
    // client, and is withheld from cross-site POSTs to the decision route.
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
  res.headers.set('Cache-Control', 'no-store')
  res.headers.set('Referrer-Policy', 'no-referrer')
  return res
}
