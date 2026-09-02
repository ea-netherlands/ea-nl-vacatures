/**
 * POST /api/suggest — a reader sends us feedback.
 *
 * Six kinds, defined once in `content/i18n` and shared with the form: a
 * vacancy, an organisation to watch, a correction, something the board is
 * missing, a note about the site, or anything else. It began as the first two
 * only; the path keeps its name so existing links and the Studio queue are
 * undisturbed.
 *
 * Writes a `suggestion` document for a curator to triage. It never creates a
 * listing and never publishes anything: the board's entire value is that a
 * person vouched for every entry, and an endpoint that could put text in front
 * of readers unreviewed would end that quietly, through spam or through
 * employers promoting themselves.
 *
 * ## Abuse handling, and what it deliberately does not do
 *
 * A public write endpoint on a small non-profit site is worth protecting, but
 * the failure mode to design against is a bored script, not a determined
 * attacker — the prize is a document in a review queue. So: a honeypot field,
 * a minimum fill time, length caps, and an in-memory per-IP rate limit.
 *
 * It does NOT store the IP address. Rate limiting needs it for a few minutes;
 * a suggestion does not need it forever, and keeping it would turn a form into
 * a log of who reads this board. The counter lives in memory and dies with the
 * process, which on serverless means the limit is per-instance and therefore
 * leaky. That is the accepted trade: a leaky limit that stores nothing beats a
 * strict one that builds a table of readers' addresses.
 */

import { NextResponse } from 'next/server'
import { isFeedbackKind, POINTER_KINDS } from '../../../jobboard/content/i18n'
import { isSanityConfigured, writeClient } from '../../../jobboard/sanity/client'

export const runtime = 'nodejs'

const MAX_PER_WINDOW = 5
const WINDOW_MS = 60 * 60 * 1000
/** Anything faster than this is not someone reading a form and typing. */
const MIN_FILL_MS = 3000

const hits = new Map<string, { count: number; resetAt: number }>()

function rateLimited(key: string): boolean {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > MAX_PER_WINDOW
}

/** Keeps the map from growing without bound on a long-lived instance. */
function sweep(): void {
  const now = Date.now()
  for (const [key, entry] of hits) if (now > entry.resetAt) hits.delete(key)
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 })
}

export async function POST(request: Request) {
  if (!isSanityConfigured) {
    return NextResponse.json(
      { ok: false, error: 'not-configured' },
      { status: 503 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return badRequest('invalid-json')
  }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

  // The honeypot is a field hidden from people and irresistible to scripts that
  // fill everything. A filled honeypot returns success rather than an error:
  // telling a bot it failed teaches it what to change next time.
  if (str(body.website).length > 0) {
    return NextResponse.json({ ok: true })
  }

  const elapsed = Number(body.elapsedMs)
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) {
    return NextResponse.json({ ok: true })
  }

  sweep()
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: 'rate-limited' }, { status: 429 })
  }

  const kind = str(body.kind)
  if (!isFeedbackKind(kind)) return badRequest('kind')

  /*
    Which fields are required depends on the kind, and the split is the same one
    the form uses — imported rather than restated, so the two cannot drift.

    For the two pointer kinds the link is the suggestion, so it stays required.
    For the other four the message is the content: a reader reporting that a
    whole field is missing from the board has no URL to give, and rejecting
    them for it would lose exactly the feedback the beta is asking for.
  */
  const pointer = POINTER_KINDS.includes(kind)

  const url = str(body.url)
  let parsed: URL | null = null
  if (url) {
    try {
      parsed = new URL(url)
    } catch {
      return badRequest('url')
    }
    // Only http(s). A `javascript:` or `data:` URL in a field a curator will
    // click is the one genuinely dangerous thing this form could accept.
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return badRequest('url')
  } else if (pointer) {
    return badRequest('url')
  }

  const organisation = str(body.organisation)
  if (pointer && !organisation) return badRequest('organisation')
  if (organisation.length > 120) return badRequest('organisation')

  const why = str(body.why).slice(0, 2000)
  // The mirror of the rule above: without a link, the message is the entire
  // submission, and an empty one is a document a curator can do nothing with.
  if (!pointer && !why) return badRequest('why')

  // Optional, and only lightly checked: a wrong address costs us one unanswered
  // follow-up, whereas rejecting a valid unusual address loses the suggestion.
  const submitterEmail = str(body.submitterEmail).slice(0, 200)
  if (submitterEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(submitterEmail)) {
    return badRequest('email')
  }

  try {
    await writeClient().create({
      _type: 'suggestion',
      kind,
      url: parsed ? parsed.toString() : undefined,
      organisation: organisation || undefined,
      why: why || undefined,
      submitterEmail: submitterEmail || undefined,
      status: 'new',
      submittedAt: new Date().toISOString(),
    })
  } catch {
    // Never surface the underlying error: it can carry dataset names and token
    // scope, and there is nothing the reader could do with it anyway.
    return NextResponse.json({ ok: false, error: 'write-failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
