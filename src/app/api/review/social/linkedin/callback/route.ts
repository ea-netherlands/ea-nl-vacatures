/**
 * Where LinkedIn's consent screen returns: swaps the code for a 60-day token,
 * stores it encrypted (social/tokens.ts) and goes back to /review/social.
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE, verifyToken } from '@jobboard/review/auth'
import { exchangeCode } from '@jobboard/social/linkedin'
import { saveToken } from '@jobboard/social/tokens'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const back = (result: string) => NextResponse.redirect(new URL(`/review/social?linkedin=${result}`, url), 303)
  const jar = await cookies()
  if (!verifyToken('session', jar.get(SESSION_COOKIE)?.value)) return back('signed-out')
  if (!verifyToken('oauth', url.searchParams.get('state'))) return back('expired')
  const code = url.searchParams.get('code')
  if (!code) return back(url.searchParams.get('error') === 'user_cancelled_authorize' ? 'cancelled' : 'refused')

  try {
    const redirectUri = new URL('/api/review/social/linkedin/callback', url).toString()
    const t = await exchangeCode(code, redirectUri)
    await saveToken({
      channel: 'linkedinPersonal',
      accessToken: t.accessToken,
      expiresAt: t.expiresAt,
      accountId: t.personUrn,
      accountName: t.name,
    })
    return back('connected')
  } catch (err) {
    console.error('[social:linkedin]', err)
    return back('failed')
  }
}
