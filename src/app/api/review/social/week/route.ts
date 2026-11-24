/**
 * The weekly review's one action (/review/social/week): approve every ready
 * draft of the week at once (../../../../../jobboard/social/week.ts). Same
 * locks as the other social endpoints: the social session cookie and a
 * same-origin request. Editing, skipping and redrafting stay on each editor.
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SOCIAL_SESSION_COOKIE, socialSignedIn } from '@jobboard/review/auth'
import { approveWeek } from '@jobboard/social/week'

export const dynamic = 'force-dynamic'

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(request: Request) {
  const jar = await cookies()
  if (!socialSignedIn(jar.get(SOCIAL_SESSION_COOKIE)?.value)) {
    return fail('Your session has expired. Open the link in the latest email.', 401)
  }
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) return fail('cross-origin request refused', 403)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return fail('expected a JSON body')
  }
  if (body.action !== 'approve-all') return fail('Unknown action.')

  try {
    const { approved, left } = await approveWeek()
    return NextResponse.json({ ok: true, approved: approved.length, left: left.length })
  } catch (err) {
    console.error('[review:social-week]', err)
    return fail(`Something went wrong: ${(err as Error).message}`, 500)
  }
}
