/**
 * The daily review digest.
 *
 * ## Why this exists
 *
 * The review queue is the only part of the pipeline a person has to do, and
 * nothing ever told that person it had filled. The Studio waited to be
 * opened; by late September 2026 the newest listing on the live board was
 * three weeks old while the crons kept promoting drafts nobody saw. A board
 * that says a person vouched for every entry cannot go quiet like that.
 *
 * So every morning, after `promote`, the curator gets one mail: what is new
 * since the last one, what is still waiting, and a link that opens the review
 * dashboard already signed in. Deciding takes one click per role there.
 *
 * ## When it sends
 *
 * Whenever anything is waiting, new or not. The feedback digest (notify.ts)
 * stays silent on an empty queue, and so does this — but unlike feedback, a
 * waiting listing loses value every day it sits, so a backlog is worth a mail
 * even on a day with nothing new. The subject line says which kind of day it
 * is, so a reminder is not mistaken for news.
 *
 * ## Why the design values are written out here
 *
 * Email clients do not support CSS custom properties, and most strip <style>
 * blocks. `EMAIL_TOKENS` is therefore a copy of the handful of values from
 * theme/theme.css this mail needs, inlined per element. Keep it in step with
 * that file; it is the one place outside it where these values may appear.
 * The web fonts do not load in mail either, so the stacks fall back to the
 * same families theme.css names after Sentient and Atkinson.
 */

import { getDb } from '../db/client'
import { isMailConfigured, sendMail } from '../lib/mail'
import { ADMIN_ORIGIN } from '../lib/seo'
import { issueToken, LINK_TTL_MS } from './auth'
import { loadReviewQueue, type ReviewItem } from './queue'

/** Mirrors theme/theme.css — see the header comment. */
const EMAIL_TOKENS = {
  bg: '#ffffff', // --bg
  bgSubtle: '#f8fafc', // --bg-subtle
  fg: '#09090b', // --fg
  fgMuted: '#475569', // --fg-muted
  border: '#e2e8f0', // --border
  primarySolid: '#16879c', // --primary-solid
  primaryFg: '#106574', // --primary-fg
  primaryContrast: '#ffffff', // --primary-contrast
  primaryMuted: '#dbf5fa', // --primary-muted
  fontHeading: "Georgia, 'Times New Roman', serif", // --font-heading, after Sentient
  // Single quotes only: these land inside style="…" attributes.
  fontBody: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", // --font-body, after Atkinson
  radiusCard: '12px', // --radius-card
  radiusControl: '16px', // --radius-control
} as const

/** Who gets it. Comma-separated; required, because there is no sensible default. */
export function digestRecipients(): string[] {
  return (process.env.REVIEW_DIGEST_TO ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export type ReviewDigestReport = {
  waiting: number
  fresh: number
  sent: boolean
  to: string[]
  skippedReason: string | null
  subject: string | null
  preview: string | null
}

/** The signed link. `anchor` scrolls the dashboard to one listing. */
export function dashboardLink(anchor?: string): string {
  const token = issueToken('link', LINK_TTL_MS)
  // The board's own host, not SITE_URL: the main site does not forward
  // /api/review, so a link on the main domain would 404.
  const url = new URL('/api/review/session', ADMIN_ORIGIN)
  url.searchParams.set('t', token)
  if (anchor) url.searchParams.set('focus', anchor)
  return url.toString()
}

export function anchorFor(item: ReviewItem): string {
  return `listing-${item.publishedId.replace(/^jobListing-/, '')}`
}

export function subjectFor(fresh: number, waiting: number): string {
  if (fresh > 0) return fresh === 1 ? '1 new role to review' : `${fresh} new roles to review`
  return waiting === 1 ? '1 role still waiting for review' : `${waiting} roles still waiting for review`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function daysWaiting(item: ReviewItem, now: number): number {
  return Math.max(0, Math.floor((now - new Date(item.promotedAt).getTime()) / 864e5))
}

function meta(item: ReviewItem): string {
  return [item.employerName, item.cause, item.score != null ? `score ${item.score}` : null]
    .filter(Boolean)
    .join(' · ')
}

export function renderDigestText(
  fresh: ReviewItem[],
  older: ReviewItem[],
  link: (anchor?: string) => string,
  now = Date.now(),
): string {
  const lines: string[] = []
  const total = fresh.length + older.length
  lines.push(
    fresh.length
      ? `${subjectFor(fresh.length, total)}, ${total} waiting in total.`
      : `${subjectFor(0, total)}. The oldest has waited ${Math.max(...older.map((i) => daysWaiting(i, now)))} days.`,
  )
  lines.push('', `Open the review queue: ${link()}`, '')
  for (const item of fresh) {
    lines.push(`── ${item.title}`, meta(item))
    if (item.note) lines.push(item.note)
    lines.push('')
  }
  if (older.length) {
    lines.push('Still waiting:')
    for (const item of older) lines.push(`- ${item.title} (${meta(item)}, ${daysWaiting(item, now)} days)`)
    lines.push('')
  }
  lines.push(
    'The link signs you in to the dashboard for a week. Anyone with it can publish to the board, so please do not forward this mail.',
  )
  return lines.join('\n')
}

export function renderDigestHtml(
  fresh: ReviewItem[],
  older: ReviewItem[],
  link: (anchor?: string) => string,
  now = Date.now(),
): string {
  const T = EMAIL_TOKENS
  const total = fresh.length + older.length
  const heading = subjectFor(fresh.length, total)
  const lead = fresh.length
    ? `${total} waiting in total. Each one is a click on the dashboard: publish it, or tell the classifier why not.`
    : `Nothing new today, but these have waited up to ${Math.max(...older.map((i) => daysWaiting(i, now)))} days. A role that sits in the queue is one nobody sees.`

  const card = (item: ReviewItem) => `
    <tr><td style="padding:0 0 12px 0;">
      <a href="${escapeHtml(link(anchorFor(item)))}" style="display:block;text-decoration:none;color:${T.fg};background:${T.bg};border:1px solid ${T.border};border-radius:${T.radiusCard};padding:16px 18px;">
        <div style="font-family:${T.fontHeading};font-weight:500;font-size:18px;line-height:1.3;color:${T.fg};">${escapeHtml(item.title)}</div>
        <div style="font-family:${T.fontBody};font-size:13px;line-height:1.5;color:${T.fgMuted};padding-top:4px;">${escapeHtml(meta(item))}</div>
        ${item.note ? `<div style="font-family:${T.fontBody};font-size:14px;line-height:1.55;color:${T.fg};padding-top:10px;">${escapeHtml(item.note)}</div>` : ''}
      </a>
    </td></tr>`

  const olderList = older.length
    ? `
    <tr><td style="padding:12px 0 6px 0;font-family:${T.fontBody};font-size:13px;font-weight:600;color:${T.fgMuted};">Still waiting</td></tr>
    ${older
      .map(
        (item) => `
    <tr><td style="padding:4px 0;font-family:${T.fontBody};font-size:14px;line-height:1.5;">
      <a href="${escapeHtml(link(anchorFor(item)))}" style="color:${T.primaryFg};text-decoration:underline;">${escapeHtml(item.title)}</a>
      <span style="color:${T.fgMuted};"> · ${escapeHtml(meta(item))} · ${daysWaiting(item, now)} days</span>
    </td></tr>`,
      )
      .join('')}`
    : ''

  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:${T.bgSubtle};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${T.bgSubtle};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td style="padding:0 0 16px 0;">
      <span style="display:inline-block;font-family:${T.fontBody};font-size:12px;font-weight:600;color:${T.primaryFg};background:${T.primaryMuted};border-radius:9999px;padding:4px 10px;">Vacaturebord review</span>
    </td></tr>
    <tr><td style="font-family:${T.fontHeading};font-weight:500;font-size:26px;line-height:1.25;color:${T.fg};padding:0 0 8px 0;">${escapeHtml(heading)}</td></tr>
    <tr><td style="font-family:${T.fontBody};font-size:15px;line-height:1.55;color:${T.fgMuted};padding:0 0 20px 0;">${escapeHtml(lead)}</td></tr>
    <tr><td style="padding:0 0 24px 0;">
      <a href="${escapeHtml(link())}" style="display:inline-block;font-family:${T.fontBody};font-size:15px;font-weight:600;color:${T.primaryContrast};background:${T.primarySolid};border-radius:${T.radiusControl};padding:12px 20px;text-decoration:none;">Open the review queue</a>
    </td></tr>
    ${fresh.map(card).join('')}
    ${olderList}
    <tr><td style="border-top:1px dashed ${T.border};padding:20px 0 0 0;margin-top:12px;font-family:${T.fontBody};font-size:12px;line-height:1.5;color:${T.fgMuted};">
      The link signs you in to the dashboard for a week. Anyone with it can publish to the board, so please do not forward this mail.
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`
}

export async function runReviewDigest(
  options: { dryRun?: boolean; onLog?: (line: string) => void } = {},
): Promise<ReviewDigestReport> {
  const log = (line: string) => options.onLog?.(line)
  const to = digestRecipients()
  const db = await getDb()

  const queue = await loadReviewQueue()
  // "New" means promoted since the last digest that actually went out, so a
  // failed or skipped morning widens tomorrow's window instead of losing roles.
  const { rows } = await db.query<{ sent_at: string }>(
    `select sent_at from review_digest order by sent_at desc limit 1`,
  )
  const since = rows[0] ? new Date(rows[0].sent_at).getTime() : 0
  const fresh = queue.filter((i) => new Date(i.promotedAt).getTime() > since)
  const older = queue.filter((i) => new Date(i.promotedAt).getTime() <= since)

  const report: ReviewDigestReport = {
    waiting: queue.length,
    fresh: fresh.length,
    sent: false,
    to,
    skippedReason: null,
    subject: null,
    preview: null,
  }

  if (!queue.length) {
    log('review queue is empty — nothing sent')
    return { ...report, skippedReason: 'queue empty' }
  }

  const subject = subjectFor(fresh.length, queue.length)
  const text = renderDigestText(fresh, older, dashboardLink)
  report.subject = subject
  report.preview = text

  if (options.dryRun) {
    log(`would send "${subject}" to ${to.join(', ') || '(no recipient set)'}`)
    return { ...report, skippedReason: 'dry run' }
  }
  if (!to.length) {
    log(`REVIEW_DIGEST_TO is not set — ${queue.length} roles waiting, no mail sent`)
    return { ...report, skippedReason: 'REVIEW_DIGEST_TO not set' }
  }
  if (!isMailConfigured()) {
    log(`RESEND_API_KEY is not set — ${queue.length} roles waiting, no mail sent`)
    return { ...report, skippedReason: 'RESEND_API_KEY not set' }
  }

  await sendMail({ to, subject, text, html: renderDigestHtml(fresh, older, dashboardLink) })
  await db.query(
    `insert into review_digest (recipients, new_count, waiting_count) values ($1, $2, $3)`,
    [to, fresh.length, queue.length],
  )
  log(`sent "${subject}" to ${to.join(', ')}`)
  return { ...report, sent: true }
}
