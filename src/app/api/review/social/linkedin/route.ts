/**
 * Starts connecting James's LinkedIn: sends him to LinkedIn's consent screen.
 * Behind the review session; the state is a short-lived signed value only the
 * callback accepts.
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { issueToken, SOCIAL_SESSION_COOKIE, socialSignedIn } from '@jobboard/review/auth'
import { authoriseUrl, linkedinConfigured } from '@jobboard/social/linkedin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const jar = await cookies()
  if (!socialSignedIn(jar.get(SOCIAL_SESSION_COOKIE)?.value)) {
    return NextResponse.redirect(new URL('/review/social', request.url), 303)
  }
  if (!linkedinConfigured()) {
    return NextResponse.redirect(new URL('/review/social?linkedin=not-configured', request.url), 303)
  }
  const redirectUri = new URL('/api/review/social/linkedin/callback', request.url).toString()
  return NextResponse.redirect(authoriseUrl(redirectUri, issueToken('oauth', 10 * 60_000)), 303)
}
