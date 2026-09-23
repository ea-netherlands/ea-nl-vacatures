/**
 * The curator's recent decisions, as calibration for the classifier.
 *
 * Rejecting a listing on the dashboard with a reason is feedback to the
 * system, not just housekeeping: the next classification run is shown the most
 * recent curator decisions — what was published and what was turned down, and
 * why — appended to the triage system prompt.
 *
 * Three limits keep this from becoming a second, unreviewed rulebook:
 *
 *   • It is framed as examples of judgement, and the prompt says the written
 *     rubric wins where they conflict. A single rejection is one call on one
 *     ad; it should nudge a score, not create a rule.
 *   • It is bounded — the latest REJECTED_LIMIT rejections and
 *     PUBLISHED_LIMIT acceptances — so the prompt cannot grow without end
 *     and old decisions age out as the board's bar moves.
 *   • It lives in the system prompt, which is identical for every listing in a
 *     run, so prompt caching still turns it into one write plus cheap reads.
 *
 * The rubric itself (`classify/prompt.ts`) is still where a durable change
 * belongs. When the same reason keeps coming back here, that is the signal to
 * write it into the rubric.
 */

import type { Db } from '../db/client'
import { REJECT_CATEGORIES } from './categories'

const REJECTED_LIMIT = 25
const PUBLISHED_LIMIT = 10

type Row = {
  action: string
  reason: string | null
  category: string | null
  title: string
  employer_name: string
  primary_cause: string | null
  leverage: string | null
  cause_score: number | null
  leverage_score: number | null
}

const CATEGORY_LABEL = Object.fromEntries(REJECT_CATEGORIES.map((c) => [c.value, c.label]))

export async function loadCuratorCalibration(db: Db): Promise<string> {
  let rows: Row[]
  try {
    const res = await db.query<Row>(
      `(select d.action, d.reason, d.category, l.title, l.employer_name,
               c.primary_cause, c.leverage, c.cause_score, c.leverage_score, d.created_at
          from decision d
          join listing l on l.id = d.listing_id
          left join classification c on c.listing_id = l.id
         where d.actor <> 'pipeline' and d.action = 'rejected'
         order by d.created_at desc
         limit ${REJECTED_LIMIT})
       union all
       (select d.action, d.reason, d.category, l.title, l.employer_name,
               c.primary_cause, c.leverage, c.cause_score, c.leverage_score, d.created_at
          from decision d
          join listing l on l.id = d.listing_id
          left join classification c on c.listing_id = l.id
         where d.actor <> 'pipeline' and d.action = 'published'
         order by d.created_at desc
         limit ${PUBLISHED_LIMIT})`,
    )
    rows = res.rows
  } catch {
    // Pre-migration database (no `category` column yet): classify without
    // calibration rather than failing the whole run.
    return ''
  }
  return renderCalibration(rows)
}

export function renderCalibration(rows: Row[]): string {
  if (!rows.length) return ''
  const describe = (r: Row) => {
    const scored =
      r.cause_score != null && r.leverage_score != null
        ? ` — you scored it cause ${r.cause_score}, leverage ${r.leverage_score}` +
          (r.primary_cause ? `, as ${r.primary_cause}/${r.leverage ?? 'no leverage'}` : '')
        : ''
    return `"${r.title}" at ${r.employer_name}${scored}`
  }

  const rejected = rows.filter((r) => r.action === 'rejected')
  const published = rows.filter((r) => r.action === 'published')
  const lines: string[] = [
    '',
    '## Recent curator decisions',
    '',
    "These are the curator's latest calls on listings you passed through. They are examples of how the rubric above is being applied, not new rules: where one seems to conflict with the rubric, the rubric wins. Use them to calibrate borderline scores — if the curator keeps turning down a kind of role you keep scoring as promotable, score that kind of role lower.",
  ]
  if (rejected.length) {
    lines.push('', '### Turned down')
    for (const r of rejected) {
      const why = [r.category ? CATEGORY_LABEL[r.category] ?? r.category : null, r.reason]
        .filter(Boolean)
        .join(': ')
      lines.push(`- ${describe(r)}.${why ? ` Curator: ${why}` : ' No reason given.'}`)
    }
  }
  if (published.length) {
    lines.push('', '### Published')
    for (const r of published) lines.push(`- ${describe(r)}.`)
  }
  return lines.join('\n')
}
