/**
 * The weekly feedback digest.
 *
 * ## Why this exists
 *
 * The feedback form wrote a `suggestion` document and then did nothing else.
 * No mail, no webhook, no notification of any kind — seeing a submission meant
 * remembering to open the Studio and look. That was survivable while the form
 * was an obscure "tip us" link nobody clicked. It stopped being survivable the
 * moment the board went to the Dutch community in beta and started asking for
 * feedback on every page: a silent drop-box collecting exactly the reports the
 * beta exists to gather is worse than no form, because it looks like listening.
 *
 * The `suggestion` schema already had the right instinct written into it — "a
 * tip that sits unread for a month is a vacancy that closed" — and then relied
 * on a human remembering. This closes that.
 *
 * ## Weekly, and only when there is something
 *
 * Weekly rather than per-submission: a launch spike would otherwise arrive as
 * a stream of near-identical mails, which is how a notification channel gets
 * muted in week one. A digest of a handful of items is read; twenty separate
 * mails are filtered.
 *
 * And nothing is sent when the queue is empty. A recurring "no new suggestions"
 * mail trains the reader to archive it unopened, which costs exactly the
 * attention the digest is for. The trade is that silence is ambiguous — it
 * could mean no feedback or a broken cron — so the run always logs its own
 * outcome, and `--dry` prints what would go out.
 *
 * ## Provider
 *
 * Resend, called over plain `fetch`. No SDK: it is one POST, and this codebase
 * avoids dependencies it does not need. Unset `RESEND_API_KEY` makes the job a
 * no-op that reports itself rather than throwing, the same way `isSanityConfigured`
 * lets the board render without a CMS — a missing key should not turn a cron
 * into a red deployment.
 */

import { writeClient } from './client'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/** Where the digest goes. Overridable so a test run can go somewhere else. */
export const DIGEST_TO = process.env.FEEDBACK_DIGEST_TO ?? 'info@effectiefaltruisme.nl'

/**
 * Must be a domain verified in Resend. Defaults to the board's own subdomain
 * rather than a generic sender so a reply lands somewhere a person reads.
 */
export const DIGEST_FROM =
  process.env.FEEDBACK_DIGEST_FROM ?? 'Vacaturebord <vacatures@effectiefaltruisme.nl>'

const STUDIO_URL = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vacatures.effectiefaltruisme.nl'}/studio`

/** Curator-facing, so Dutch — same convention as the Studio option titles. */
const KIND_LABELS: Record<string, string> = {
  listing: 'Vacature',
  employer: 'Organisatie',
  correction: 'Correctie',
  gap: 'Ontbreekt',
  site: 'Over de site',
  other: 'Anders',
}

export type SuggestionRow = {
  _id: string
  kind: string | null
  url: string | null
  organisation: string | null
  why: string | null
  submitterEmail: string | null
  submittedAt: string | null
}

export type DigestReport = {
  pending: number
  sent: boolean
  skippedReason: string | null
  to: string
  /** The rendered body, so a dry run can show exactly what would go out. */
  preview: string | null
}

function formatDate(value: string | null): string {
  if (!value) return 'datum onbekend'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'datum onbekend'
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
}

/** Plain text, deliberately. It is a list of short items for one reader. */
export function renderDigest(rows: SuggestionRow[]): string {
  const lines: string[] = []
  lines.push(
    rows.length === 1
      ? 'Er staat 1 nieuwe reactie op het vacaturebord.'
      : `Er staan ${rows.length} nieuwe reacties op het vacaturebord.`,
  )
  lines.push('')

  for (const row of rows) {
    const kind = KIND_LABELS[row.kind ?? ''] ?? row.kind ?? 'Onbekend'
    const head = [kind, row.organisation, formatDate(row.submittedAt)].filter(Boolean).join(' · ')
    lines.push(`── ${head}`)
    if (row.why) {
      // The submitter's own words are the point of the mail, so they are not
      // truncated to a teaser — a digest you have to click through to
      // understand is a notification, not a digest.
      lines.push(row.why.trim())
    }
    if (row.url) lines.push(row.url)
    // Personal data, given voluntarily for a follow-up question. It is here so
    // a reply can be written without opening the Studio; see the schema note
    // about deleting the document once the conversation is over.
    if (row.submitterEmail) lines.push(`Antwoorden kan naar: ${row.submitterEmail}`)
    lines.push('')
  }

  lines.push('Afhandelen in de Studio, onder Job board → Suggestions → New:')
  lines.push(STUDIO_URL)
  lines.push('')
  lines.push(
    'Je krijgt deze mail alleen als er iets nieuws is. Geen mail betekent geen nieuwe reacties.',
  )
  return lines.join('\n')
}

export async function runSuggestionDigest(
  options: { dryRun?: boolean; onLog?: (line: string) => void } = {},
): Promise<DigestReport> {
  const log = (line: string) => options.onLog?.(line)
  const client = writeClient()

  // Oldest first: the one that has been waiting longest is the one most likely
  // to be about a vacancy that is closing.
  const rows = await client.fetch<SuggestionRow[]>(
    `*[_type == "suggestion" && status == "new"] | order(submittedAt asc){
       _id, kind, url, organisation, why, submitterEmail, submittedAt
     }`,
  )

  const base: DigestReport = {
    pending: rows.length,
    sent: false,
    skippedReason: null,
    to: DIGEST_TO,
    preview: null,
  }

  if (!rows.length) {
    log('no untriaged suggestions — nothing sent')
    return { ...base, skippedReason: 'queue empty' }
  }

  const body = renderDigest(rows)
  const subject =
    rows.length === 1
      ? '1 nieuwe reactie op het vacaturebord'
      : `${rows.length} nieuwe reacties op het vacaturebord`

  if (options.dryRun) {
    log(`would send "${subject}" to ${DIGEST_TO}`)
    return { ...base, skippedReason: 'dry run', preview: body }
  }

  const key = process.env.RESEND_API_KEY
  if (!key) {
    // Deliberately not an error. A missing key means the digest was never
    // configured, which is a setup gap rather than a failure of this run, and
    // failing the cron would bury it in a red deployment nobody reads.
    log(`RESEND_API_KEY is not set — ${rows.length} suggestions waiting, no mail sent`)
    return { ...base, skippedReason: 'RESEND_API_KEY not set', preview: body }
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: DIGEST_FROM, to: [DIGEST_TO], subject, text: body }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Resend returned ${res.status}: ${detail.slice(0, 300)}`)
  }

  log(`sent "${subject}" to ${DIGEST_TO}`)
  return { ...base, sent: true, preview: body }
}
