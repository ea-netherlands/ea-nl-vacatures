/**
 * The M3 hand-grading tool — spec M3.
 *
 * "Run it over a week of real ingested data and hand-grade 100 classifications
 * to calibrate thresholds before wiring anything into Sanity. This grading pass
 * is not optional — it is what stops the queue arriving full of noise on day one
 * and being abandoned."
 *
 * Usage:
 *   npm run grade -- --export=grading.csv   # write a sample to grade by hand
 *   npm run grade -- --import=grading.csv   # load the verdicts back
 *   npm run grade -- --report               # precision/recall at each threshold
 *
 * The report is what turns the promotion threshold from a guess into a decision.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { getDb } from '../jobboard/db/client'
import { main, num, parseArgs, printReport } from './_cli'

type SampleRow = {
  listing_id: number
  title: string
  employer_name: string
  primary_cause: string | null
  leverage: string | null
  cause_score: number
  leverage_score: number
  total_score: number
  reasoning: string | null
  draft_note: string | null
  apply_url: string
}

const CSV_HEADER = [
  'listing_id',
  'human_verdict',
  'human_cause_score',
  'human_leverage_score',
  'note',
  'title',
  'employer',
  'llm_cause',
  'llm_leverage',
  'llm_cause_score',
  'llm_leverage_score',
  'llm_total',
  'llm_reasoning',
  'draft_note',
  'apply_url',
]

const csvCell = (v: unknown): string => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Minimal RFC 4180 reader — enough for a file a human edited in a spreadsheet. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += ch
      continue
    }
    if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (ch !== '\r') cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim()))
}

void main(async () => {
  const args = parseArgs()
  const db = await getDb()

  // ---- Export a stratified sample -----------------------------------------
  const exportPath = args.values.get('export')
  if (exportPath) {
    const size = num(args, 'size', 100)
    // Stratify across the score range rather than taking the top 100: the
    // near-misses are where calibration happens, and a sample of only
    // high scorers tells you nothing about what you are wrongly rejecting.
    const { rows } = await db.query<SampleRow>(
      `with scored as (
         select c.listing_id, l.title, l.employer_name, c.primary_cause, c.leverage,
                c.cause_score, c.leverage_score, c.total_score, c.reasoning,
                c.draft_note, l.apply_url,
                row_number() over (partition by c.total_score order by random()) as rn
           from classification c
           join listing l on l.id = c.listing_id
          where c.nl_eligible
       )
       select listing_id, title, employer_name, primary_cause, leverage,
              cause_score, leverage_score, total_score, reasoning, draft_note, apply_url
         from scored
        where rn <= $1
        order by total_score desc, listing_id`,
      [Math.ceil(size / 7)],
    )

    const lines = [
      CSV_HEADER.join(','),
      ...rows.map((r) =>
        [
          r.listing_id,
          '', // human_verdict — belongs | borderline | reject
          '', // human_cause_score 0-3
          '', // human_leverage_score 0-3
          '', // note
          r.title,
          r.employer_name,
          r.primary_cause,
          r.leverage,
          r.cause_score,
          r.leverage_score,
          r.total_score,
          r.reasoning,
          r.draft_note,
          r.apply_url,
        ]
          .map(csvCell)
          .join(','),
      ),
    ]
    await writeFile(exportPath, `${lines.join('\n')}\n`, 'utf8')
    printReport('Exported for grading', {
      file: exportPath,
      rows: rows.length,
      'score spread': [...new Set(rows.map((r) => r.total_score))].sort().join(', '),
    })
    console.log(
      'Fill in human_verdict (belongs | borderline | reject) and optionally the two\n' +
        'score columns, then run: npm run grade -- --import=' + exportPath + '\n',
    )
    await db.close()
    return
  }

  // ---- Import verdicts ----------------------------------------------------
  const importPath = args.values.get('import')
  if (importPath) {
    const rows = parseCsv(await readFile(importPath, 'utf8'))
    const header = rows.shift()
    if (!header) throw new Error('empty CSV')
    const col = (name: string) => header.indexOf(name)
    const iId = col('listing_id')
    const iVerdict = col('human_verdict')
    const iCause = col('human_cause_score')
    const iLev = col('human_leverage_score')
    const iNote = col('note')
    if (iId < 0 || iVerdict < 0) throw new Error('CSV needs listing_id and human_verdict columns')

    let imported = 0
    let skipped = 0
    for (const row of rows) {
      const verdict = (row[iVerdict] ?? '').trim().toLowerCase()
      if (!verdict) {
        skipped++
        continue
      }
      if (!['belongs', 'borderline', 'reject'].includes(verdict)) {
        console.warn(`skipping listing ${row[iId]}: unknown verdict "${verdict}"`)
        skipped++
        continue
      }
      const toInt = (v: string | undefined) => {
        const n = Number((v ?? '').trim())
        return Number.isInteger(n) && n >= 0 && n <= 3 ? n : null
      }
      await db.query(
        `insert into grade (listing_id, human_verdict, human_cause_score,
                            human_leverage_score, note, graded_by)
         values ($1,$2,$3,$4,$5,$6)
         on conflict (listing_id) do update set
           human_verdict = excluded.human_verdict,
           human_cause_score = excluded.human_cause_score,
           human_leverage_score = excluded.human_leverage_score,
           note = excluded.note,
           graded_at = now()`,
        [
          Number(row[iId]),
          verdict,
          iCause >= 0 ? toInt(row[iCause]) : null,
          iLev >= 0 ? toInt(row[iLev]) : null,
          iNote >= 0 ? (row[iNote] || null) : null,
          process.env.USER ?? 'curator',
        ],
      )
      imported++
    }
    printReport('Imported grades', { imported, 'skipped (ungraded)': skipped })
    await db.close()
    return
  }

  // ---- Report: precision and recall at each candidate threshold -----------
  const { rows: graded } = await db.query<{
    total_score: number
    cause_score: number
    human_verdict: string
  }>(
    `select c.total_score, c.cause_score, g.human_verdict
       from grade g join classification c on c.listing_id = g.listing_id`,
  )

  if (graded.length === 0) {
    console.log(
      'No grades yet. Start with:\n  npm run grade -- --export=grading.csv\n\n' +
        'Hand-grade 100 classifications before wiring anything into Sanity (M3).\n',
    )
    await db.close()
    return
  }

  const belongs = graded.filter((g) => g.human_verdict === 'belongs').length
  console.log(`\n${graded.length} graded — ${belongs} judged to belong on the board\n`)
  console.log(
    'threshold          promoted  correct  precision  recall  missed',
  )
  console.log('─'.repeat(62))

  for (const minTotal of [3, 4, 5]) {
    for (const minCause of [1, 2, 3]) {
      const promoted = graded.filter(
        (g) => g.total_score >= minTotal && g.cause_score >= minCause,
      )
      const correct = promoted.filter((g) => g.human_verdict === 'belongs').length
      const missed = belongs - correct
      const precision = promoted.length ? correct / promoted.length : 0
      const recall = belongs ? correct / belongs : 0
      const label = `total>=${minTotal} cause>=${minCause}`
      const marker = minTotal === 4 && minCause === 2 ? ' ← current' : ''
      console.log(
        `${label.padEnd(18)} ${String(promoted.length).padStart(8)} ` +
          `${String(correct).padStart(8)} ${(precision * 100).toFixed(0).padStart(9)}% ` +
          `${(recall * 100).toFixed(0).padStart(6)}% ${String(missed).padStart(7)}${marker}`,
      )
    }
  }
  console.log(
    '\nThe current threshold is total>=4 and cause>=2 (§8.3). Change it in\n' +
      'src/jobboard/taxonomy/index.ts once this table gives you a reason to.\n',
  )

  await db.close()
})
