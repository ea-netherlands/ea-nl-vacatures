/**
 * The classification runner — spec §8.
 *
 * Two-stage filter, then the promotion decision. Every rejection is logged
 * with its scores, because the decision log is what lets you answer "are we
 * rejecting too much?" and what stops the same rejected listing being
 * re-promoted every week when the source re-serves it (§6.3).
 */

import type { Db } from '../db/client'
import { getDb } from '../db/client'
import { structuredCall, TRIAGE_MODEL, DRAFTING_MODEL } from '../lib/anthropic'
import { truncateWords } from '../lib/text'
import { meetsPromotionThreshold, NEAR_MISS_TOTAL } from '../taxonomy'
import { enforceGates, type EmployerGateFlags } from '../taxonomy/gates'
import { buildNoteSystemPrompt, buildTriageUserPrompt, TRIAGE_SYSTEM_PROMPT } from './prompt'
import { NOTE_SCHEMA, TRIAGE_SCHEMA, type TriageResult } from './schema'
import { stage1, type Stage1Input } from './stage1'
import { loadGlossaryForPrompt, loadStyleGuide } from '../content/style'

export type ClassifyOptions = {
  limit?: number
  /** Re-classify listings that already have a classification row. */
  force?: boolean
  /** Skip the note-drafting pass; useful for cheap threshold calibration. */
  skipNotes?: boolean
  budgetMs?: number
  onLog?: (line: string) => void
}

export type ClassifyReport = {
  considered: number
  stage1Rejected: number
  classified: number
  promotable: number
  nearMisses: number
  gateViolations: number
  errors: { listingId: number; message: string }[]
  usage: { input: number; output: number; cacheRead: number }
}

type Candidate = Stage1Input & {
  apply_url: string
  employer_id: string | null
  employer_leverage_note: string | null
  salary_min: number | null
  salary_period: string | null
}

export async function runClassification(
  options: ClassifyOptions = {},
): Promise<ClassifyReport> {
  const db = await getDb()
  const log = (l: string) => options.onLog?.(l)
  const deadline = Date.now() + (options.budgetMs ?? 240_000)

  const report: ClassifyReport = {
    considered: 0,
    stage1Rejected: 0,
    classified: 0,
    promotable: 0,
    nearMisses: 0,
    gateViolations: 0,
    errors: [],
    usage: { input: 0, output: 0, cacheRead: 0 },
  }

  const candidates = await loadCandidates(db, options)
  log(`considering ${candidates.length} listings`)

  const styleGuide = await loadStyleGuide()
  const glossary = await loadGlossaryForPrompt()
  const noteSystem = buildNoteSystemPrompt(styleGuide, glossary)

  for (const c of candidates) {
    if (Date.now() >= deadline) {
      log('out of time; remaining listings will be picked up next run')
      break
    }
    report.considered++

    const gate = stage1(c)
    if (!gate.pass) {
      report.stage1Rejected++
      await recordDecision(db, c.id, 'auto-rejected', 'pipeline', `stage 1: ${gate.reason}`)
      continue
    }

    try {
      const description = truncateWords(c.description ?? '', 1500)
      const salaryText =
        c.salary_min || c.salary_max
          ? `${c.salary_min ?? '?'}–${c.salary_max ?? '?'} ${c.salary_currency ?? ''} per ${c.salary_period ?? 'jaar'}`
          : null

      const { value: raw, usage } = await structuredCall<TriageResult>({
        model: TRIAGE_MODEL,
        // The system prompt is byte-identical across every listing in a run,
        // so caching it turns a few thousand copies into one write plus reads.
        cacheSystem: true,
        system: TRIAGE_SYSTEM_PROMPT,
        user: buildTriageUserPrompt({
          title: c.title,
          employerName: c.employer_name,
          employerNote: c.employer_leverage_note,
          locationRaw: c.location_raw,
          country: c.country,
          salaryText,
          description,
          allowedCauses: gate.allowedCauses,
          allowedLeverage: gate.allowedLeverage,
        }),
        schema: TRIAGE_SCHEMA,
        maxTokens: 3000,
      })
      report.usage.input += usage.input
      report.usage.output += usage.output
      report.usage.cacheRead += usage.cacheRead

      // Output-side gate enforcement. A model told not to use a label will
      // occasionally use it anyway, and this is the one category where a
      // single leak starts an erosion (§8.1).
      const gated = enforceGates(raw, c.employer, {
        salary_max: c.salary_max,
        salary_currency: c.salary_currency,
      })
      if (gated.violations.length) {
        report.gateViolations++
        log(
          `listing ${c.id}: stripped gated label(s) ${gated.violations
            .map((v) => v.value)
            .join(', ')}`,
        )
      }

      const promotable =
        raw.nlEligible &&
        gated.primaryCause !== null &&
        gated.leverage !== null &&
        meetsPromotionThreshold(raw.causeScore, raw.leverageScore)

      // Draft the editorial note only for listings that will reach a curator.
      // This is the expensive model, and the set is much smaller (§8.4).
      let draftNote = raw.draftNoteNl
      if (promotable && !options.skipNotes) {
        try {
          const { value, usage: noteUsage } = await structuredCall<{ noteNl: string }>({
            model: DRAFTING_MODEL,
            cacheSystem: true,
            system: noteSystem,
            user: [
              `**Functie:** ${c.title}`,
              `**Werkgever:** ${c.employer_name}`,
              c.employer_leverage_note
                ? `**Wat we van deze werkgever weten:** ${c.employer_leverage_note}`
                : null,
              `**Hefboomtype:** ${gated.leverage}`,
              `**Probleemgebied:** ${gated.primaryCause}`,
              ``,
              `**Waarom de triage dit doorliet:** ${raw.reasoning}`,
              ``,
              `**Advertentietekst:**`,
              truncateWords(c.description ?? '', 900),
            ]
              .filter((l) => l !== null)
              .join('\n'),
            schema: NOTE_SCHEMA,
            maxTokens: 2000,
          })
          if (value.noteNl?.trim()) draftNote = value.noteNl.trim()
          report.usage.input += noteUsage.input
          report.usage.output += noteUsage.output
          report.usage.cacheRead += noteUsage.cacheRead
        } catch (err) {
          // A failed note is not a failed classification — the curator can
          // still write one. Keep the triage draft.
          log(`listing ${c.id}: note drafting failed (${(err as Error).message})`)
        }
      }

      await db.query(
        `insert into classification (
           listing_id, model, nl_eligible, primary_cause, secondary_causes, leverage,
           cause_score, leverage_score, language_requirement, work_authorisation,
           security_screening, security_note, seniority, location_mode,
           draft_note, reasoning, gate_violations, raw_response
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb)
         on conflict (listing_id) do update set
           model = excluded.model,
           classified_at = now(),
           nl_eligible = excluded.nl_eligible,
           primary_cause = excluded.primary_cause,
           secondary_causes = excluded.secondary_causes,
           leverage = excluded.leverage,
           cause_score = excluded.cause_score,
           leverage_score = excluded.leverage_score,
           language_requirement = excluded.language_requirement,
           work_authorisation = excluded.work_authorisation,
           security_screening = excluded.security_screening,
           security_note = excluded.security_note,
           seniority = excluded.seniority,
           location_mode = excluded.location_mode,
           draft_note = excluded.draft_note,
           reasoning = excluded.reasoning,
           gate_violations = excluded.gate_violations,
           raw_response = excluded.raw_response`,
        [
          c.id,
          TRIAGE_MODEL,
          raw.nlEligible,
          gated.primaryCause,
          gated.secondaryCauses,
          gated.leverage,
          raw.causeScore,
          raw.leverageScore,
          raw.languageRequirement,
          raw.workAuthorisation,
          raw.securityScreening,
          raw.securityNote,
          raw.seniority,
          raw.locationMode,
          draftNote,
          raw.reasoning,
          JSON.stringify(gated.violations),
          JSON.stringify(raw),
        ],
      )
      report.classified++

      const total = raw.causeScore + raw.leverageScore
      if (promotable) {
        report.promotable++
      } else {
        if (total === NEAR_MISS_TOTAL) report.nearMisses++
        await recordDecision(
          db,
          c.id,
          'auto-rejected',
          'pipeline',
          `stage 2: cause ${raw.causeScore} + leverage ${raw.leverageScore} = ${total}` +
            (raw.nlEligible ? '' : '; not NL-eligible on a full read'),
        )
      }
    } catch (err) {
      const message = (err as Error).message
      report.errors.push({ listingId: c.id, message })
      log(`listing ${c.id}: classification failed — ${message}`)
    }
  }

  return report
}

async function loadCandidates(db: Db, options: ClassifyOptions): Promise<Candidate[]> {
  const limit = options.limit ?? 200
  const { rows } = await db.query<
    Candidate & {
      giving_green_listed: boolean | null
      climate_exception: boolean | null
      e2g_allowlisted: boolean | null
      e2g_salary_presumed: boolean | null
    }
  >(
    `select l.id, l.title, l.employer_name, l.location_raw, l.country, l.description,
            l.apply_url, l.employer_id, l.salary_min, l.salary_max, l.salary_currency,
            l.salary_period,
            e.leverage_note      as employer_leverage_note,
            e.giving_green_listed, e.climate_exception,
            e.e2g_allowlisted, e.e2g_salary_presumed
       from listing l
       left join employer e on e.id = l.employer_id
       left join classification c on c.listing_id = l.id
       left join decision d
              on d.listing_id = l.id
             and d.action in ('rejected', 'published', 'promoted')
      where l.closed_at is null
        and d.id is null                      -- never re-surface a human decision
        and ($2 or c.listing_id is null)      -- unclassified unless forced
      order by l.first_seen_at desc
      limit $1`,
    [limit, options.force ?? false],
  )

  return rows.map((r) => ({
    ...r,
    employer: r.employer_id
      ? ({
          giving_green_listed: r.giving_green_listed ?? false,
          climate_exception: r.climate_exception ?? false,
          e2g_allowlisted: r.e2g_allowlisted ?? false,
          e2g_salary_presumed: r.e2g_salary_presumed ?? false,
        } satisfies EmployerGateFlags)
      : null,
  }))
}

async function recordDecision(
  db: Db,
  listingId: number,
  action: string,
  actor: string,
  reason: string,
  sanityDocId?: string,
): Promise<void> {
  await db.query(
    `insert into decision (listing_id, action, actor, reason, sanity_doc_id)
     values ($1,$2,$3,$4,$5)`,
    [listingId, action, actor, reason, sanityDocId ?? null],
  )
}

export { recordDecision }
