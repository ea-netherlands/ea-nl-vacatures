/**
 * The weekly explainer's write endpoint (/review/social/explainer). Same locks
 * as the jobs post's: the review session cookie and a same-origin request.
 * Acts only on the coming Thursday's explainer.
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE, verifyToken } from '@jobboard/review/auth'
import { LIMITS, tidySlides } from '@jobboard/social/explainer/draft'
import {
  EXPLAINER_LIMIT,
  getExplainer,
  LANGS,
  patchExplainer,
  type ExplainerChannel,
  type Lang,
  type SlideText,
} from '@jobboard/social/explainer/store'
import { draftExplainer, nextExplainerTime } from '@jobboard/social/explainer/weekly'
import { amsterdamDate } from '@jobboard/social/store'

export const dynamic = 'force-dynamic'
// Drafting reads a whole Forum post and writes both languages in one call.
export const maxDuration = 300

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** Checks and cleans the slide text the editor sends. */
function readSlides(input: unknown): Record<Lang, SlideText> | string {
  const out = {} as Record<Lang, SlideText>
  for (const lang of LANGS) {
    const raw = (input as Record<string, unknown> | null)?.[lang] as
      | { cover?: Record<string, unknown>; points?: unknown[] }
      | undefined
    if (!raw?.cover || !Array.isArray(raw.points)) return 'Both languages need their slides.'
    const text: SlideText = {
      cover: { headline: str(raw.cover.headline), marked: str(raw.cover.marked), sub: str(raw.cover.sub) },
      points: raw.points.map((p) => {
        const point = p as Record<string, unknown>
        return { heading: str(point.heading), body: str(point.body) }
      }),
    }
    const name = lang === 'en' ? 'English' : 'Dutch'
    if (!text.cover.headline.trim()) return `The ${name} cover needs a headline.`
    if (text.cover.headline.length > LIMITS.headline + 20) return `The ${name} headline is too long for the slide.`
    if (text.points.length < LIMITS.minPoints) return `The ${name} slides need at least ${LIMITS.minPoints} points.`
    for (const p of text.points) {
      if (p.heading.length > LIMITS.heading + 20 || p.body.length > LIMITS.body + 60) {
        return `A ${name} slide has more text than fits. Shorten it.`
      }
    }
    out[lang] = tidySlides(text)
  }
  return out
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
  try {
    if (body.action === 'draft') {
      const { post } = await draftExplainer({
        force: true,
        source: typeof body.source === 'string' ? body.source : undefined,
        pass: body.pass === true,
      })
      return NextResponse.json({ ok: true, post })
    }

    const post = await getExplainer(postDate)
    if (!post) return fail('There is no draft for this week yet. Draft it first.', 404)
    if (post.status === 'posted') return fail('This explainer has gone out already.', 409)

    switch (body.action) {
      case 'save': {
        if (post.status !== 'draft') return fail('Reopen the explainer to edit it.', 409)
        const slides = readSlides(body.slides)
        if (typeof slides === 'string') return fail(slides)
        const input = (body.captions ?? {}) as Record<string, unknown>
        const captions = {} as Record<ExplainerChannel, string>
        for (const c of ['linkedinPersonal', 'instagram'] as const) {
          const text = str(input[c])
          if (!text.trim()) return fail('Both captions need some text.')
          if (text.length > EXPLAINER_LIMIT[c]) return fail(`That caption is over ${EXPLAINER_LIMIT[c]} characters.`)
          captions[c] = text
        }
        return NextResponse.json({ ok: true, post: await patchExplainer(postDate, { slides, captions }) })
      }
      case 'approve':
        if (!post.slides || !post.captions || !post.source) return fail('Draft the explainer first.')
        return NextResponse.json({
          ok: true,
          post: await patchExplainer(postDate, { status: 'approved', approvedAt: new Date().toISOString() }),
        })
      case 'skip':
        return NextResponse.json({ ok: true, post: await patchExplainer(postDate, { status: 'skipped', approvedAt: null }) })
      case 'reopen':
        return NextResponse.json({ ok: true, post: await patchExplainer(postDate, { status: 'draft', approvedAt: null }) })
      default:
        return fail('Unknown action.')
    }
  } catch (err) {
    console.error('[review:explainer]', err)
    return fail(`Something went wrong: ${(err as Error).message}`, 500)
  }
}
