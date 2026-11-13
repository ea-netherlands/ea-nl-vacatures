/**
 * The weekly explainer's write endpoint (/review/social/explainer). Same locks
 * as the jobs post's: the review session cookie and a same-origin request.
 * Acts only on the week's explainers (nextExplainerTime); everything but the first
 * draft names the account (`channel`) it is about.
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE, verifyToken } from '@jobboard/review/auth'
import { LIMITS, tidySlides } from '@jobboard/social/explainer/draft'
import {
  EXPLAINER_LIMIT,
  getExplainer,
  isExplainerChannel,
  patchItem,
  type SlideText,
} from '@jobboard/social/explainer/store'
import { draftExplainer, nextExplainerTime } from '@jobboard/social/explainer/weekly'
import { amsterdamDate } from '@jobboard/social/store'

export const dynamic = 'force-dynamic'
// Drafting reads a whole Forum post and writes the explainer in one call.
export const maxDuration = 300

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** Checks and cleans the slide text the editor sends. */
function readSlides(input: unknown): SlideText | string {
  const raw = input as { cover?: Record<string, unknown>; points?: unknown[] } | null
  if (!raw?.cover || !Array.isArray(raw.points)) return 'The slides are missing.'
  const text: SlideText = {
    cover: { headline: str(raw.cover.headline), marked: str(raw.cover.marked), sub: str(raw.cover.sub) },
    points: raw.points.map((p) => {
      const point = p as Record<string, unknown>
      return { heading: str(point.heading), body: str(point.body) }
    }),
  }
  if (!text.cover.headline.trim()) return 'The cover needs a headline.'
  if (text.cover.headline.length > LIMITS.headline + 20) return 'The headline is too long for the slide.'
  if (text.points.length < LIMITS.minPoints) return `The explainer needs at least ${LIMITS.minPoints} points.`
  for (const p of text.points) {
    if (p.heading.length > LIMITS.heading + 20 || p.body.length > LIMITS.body + 60) {
      return 'A slide has more text than fits. Shorten it.'
    }
  }
  return tidySlides(text)
}

export async function POST(request: Request) {
  const jar = await cookies()
  if (!verifyToken('session', jar.get(SESSION_COOKIE)?.value)) {
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

  const postDate = amsterdamDate(nextExplainerTime())
  const channel = isExplainerChannel(body.channel) ? body.channel : undefined
  try {
    if (body.action === 'draft') {
      const { post } = await draftExplainer({
        channel,
        force: Boolean(channel),
        source: typeof body.source === 'string' ? body.source : undefined,
        pass: body.pass === true,
      })
      return NextResponse.json({ ok: true, post })
    }

    if (!channel) return fail('Which account?')
    const post = await getExplainer(postDate)
    const item = post?.[channel]
    if (!item) return fail('There is no draft for this account yet. Draft it first.', 404)
    if (item.status === 'posted') return fail('This explainer has gone out already.', 409)

    switch (body.action) {
      case 'save': {
        if (item.status !== 'draft') return fail('Reopen the explainer to edit it.', 409)
        const slides = readSlides(body.slides)
        if (typeof slides === 'string') return fail(slides)
        const caption = str(body.caption)
        if (!caption.trim()) return fail('The caption needs some text.')
        if (caption.length > EXPLAINER_LIMIT[channel]) return fail(`The caption is over ${EXPLAINER_LIMIT[channel]} characters.`)
        return NextResponse.json({ ok: true, post: await patchItem(postDate, channel, { slides, caption }) })
      }
      case 'approve':
        if (!item.slides || !item.caption || !item.source) return fail('Draft the explainer first.')
        return NextResponse.json({
          ok: true,
          post: await patchItem(postDate, channel, { status: 'approved', approvedAt: new Date().toISOString() }),
        })
      case 'skip':
        return NextResponse.json({ ok: true, post: await patchItem(postDate, channel, { status: 'skipped', approvedAt: null }) })
      case 'reopen':
        return NextResponse.json({ ok: true, post: await patchItem(postDate, channel, { status: 'draft', approvedAt: null }) })
      default:
        return fail('Unknown action.')
    }
  } catch (err) {
    console.error('[review:explainer]', err)
    return fail(`Something went wrong: ${(err as Error).message}`, 500)
  }
}
