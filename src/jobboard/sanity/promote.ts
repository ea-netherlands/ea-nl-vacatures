/**
 * The promotion job — spec §6.2, §6.5, §8.3.
 *
 * The promotion boundary is the LLM shortlist: thousands ingested → tens
 * promoted to Sanity → a handful published. Each stage logs why things were
 * dropped, so the thresholds can be tuned rather than guessed at.
 *
 * Nothing is auto-published in v1. The board's entire value rests on trust in
 * the listings, and the curation capacity is there. Revisit auto-publish only
 * once there are a few hundred human decisions to calibrate against — at which
 * point the decision table gives real precision and recall numbers rather than
 * vibes.
 */

import type { Db } from '../db/client'
import { getDb } from '../db/client'
import { recordDecision } from '../classify/run'
import { slugify } from '../lib/text'
import { meetsPromotionThreshold } from '../taxonomy'
import { isSanityConfigured, writeClient } from './client'

export type PromoteOptions = {
  limit?: number
  dryRun?: boolean
  onLog?: (line: string) => void
}

export type PromoteReport = {
  considered: number
  promoted: number
  skippedAlreadyPromoted: number
  skippedBelowThreshold: number
  employersCreated: number
  errors: { listingId: number; message: string }[]
  dryRun: boolean
}

type PromotableRow = {
  id: number
  title: string
  employer_id: string | null
  employer_name: string
  apply_url: string
  description: string | null
  location_raw: string | null
  posted_at: string | null
  first_seen_at: string | null
  deadline_at: string | null
  salary_min: string | null
  salary_max: string | null
  salary_currency: string | null
  salary_period: string | null
  mentions_30_percent_ruling: boolean
  source_id: string
  primary_cause: string | null
  secondary_causes: string[]
  sub_area: string | null
  skills: string[]
  leverage: string | null
  cause_score: number
  leverage_score: number
  total_score: number
  language_requirement: string | null
  work_authorisation: string | null
  security_screening: boolean | null
  security_note: string | null
  seniority: string | null
  location_mode: string | null
  draft_note: string | null
  reasoning: string | null
  employer_leverage_note: string | null
  employer_website: string | null
  employer_careers_url: string | null
  employer_cause_areas: string[] | null
  employer_ats: string | null
  employer_e2g: boolean | null
}

const DEFAULT_EXPIRY_DAYS = 60

export async function runPromotion(options: PromoteOptions = {}): Promise<PromoteReport> {
  const db = await getDb()
  const log = (l: string) => options.onLog?.(l)
  const report: PromoteReport = {
    considered: 0,
    promoted: 0,
    skippedAlreadyPromoted: 0,
    skippedBelowThreshold: 0,
    employersCreated: 0,
    errors: [],
    dryRun: options.dryRun ?? false,
  }

  if (!isSanityConfigured && !options.dryRun) {
    throw new Error(
      'NEXT_PUBLIC_SANITY_PROJECT_ID is not set. Create the job board’s own Sanity project (M0) ' +
        'or run with --dry-run to see what would be promoted.',
    )
  }

  const rows = await loadPromotable(db, options.limit ?? 50)
  report.considered = rows.length
  log(`${rows.length} listings above the promotion threshold and not yet promoted`)

  const client = options.dryRun ? null : writeClient()
  const employerCache = new Map<string, string>()

  for (const row of rows) {
    // Re-check the threshold here rather than trusting the query alone: the
    // gate enforcement in classify may have nulled a label after scoring, and a
    // listing with no cause or no leverage is not publishable.
    if (
      !row.primary_cause ||
      !row.leverage ||
      !row.skills?.length ||
      !meetsPromotionThreshold(row.cause_score, row.leverage_score)
    ) {
      report.skippedBelowThreshold++
      continue
    }

    try {
      if (options.dryRun) {
        log(
          `would promote #${row.id} — ${row.title} @ ${row.employer_name} ` +
            `(${row.primary_cause}/${row.leverage}, score ${row.total_score})`,
        )
        report.promoted++
        continue
      }

      const employerRef = await ensureEmployer(client!, row, employerCache, () => {
        report.employersCreated++
      })

      const slugBase = slugify(`${row.title}-${row.employer_name}`)
      // A deterministic document id keyed on the pipeline listing means a
      // re-run updates the same draft instead of creating a second one.
      const docId = `drafts.jobListing-${row.id}`

      /*
        The fallback window runs from when WE first saw the listing, not from
        when the employer posted it.

        It used to run from `posted_at`, which is the employer's own date. On an
        ATS feed that is routinely months old — a rolling "Expression of
        Interest" can carry a posting date from years back — so the sixty-day
        window was already spent before a curator ever opened the listing. The
        result was a queue of drafts that published and vanished in the same
        moment, and a curator repeatedly editing the date by hand to undo it.
        One Kairos role had to be pushed forward manually; forty-four of the
        seventy listings had no deadline at all and were all exposed to it.

        `first_seen_at` says something we actually know: the source was still
        advertising this role on that date. Roles that close earlier are caught
        by closure detection and by `runExpiry`, so this only has to be a
        backstop rather than a guess at the employer's intentions.
      */
      const expiryBase = row.first_seen_at ?? row.posted_at
      const expiresAt =
        row.deadline_at ??
        new Date(
          (expiryBase ? new Date(expiryBase).getTime() : Date.now()) +
            DEFAULT_EXPIRY_DAYS * 864e5,
        ).toISOString()

      await client!.createOrReplace({
        _id: docId,
        _type: 'jobListing',
        title: row.title,
        slug: { _type: 'slug', current: slugBase },
        employer: { _type: 'reference', _ref: employerRef },
        applyUrl: row.apply_url,

        // Arriving pre-filled with the LLM's draft note is the single most
        // valuable ergonomic feature (§6.5): the curator edits a sentence
        // rather than writing one, which is roughly the difference between a
        // four-minute and a twelve-minute review.
        whyThisMattersNl: row.draft_note ?? '',

        excerpt: buildExcerpt(row.description),
        primaryCause: row.primary_cause,
        secondaryCauses: row.secondary_causes ?? [],
        subArea: row.sub_area,
        skills: row.skills ?? [],
        leverage: row.leverage,
        locationCity: cityFrom(row.location_raw),
        locationMode: row.location_mode,
        seniority: row.seniority,
        languageRequirement: row.language_requirement,
        workAuthorisation: row.work_authorisation,
        securityScreening: row.security_screening ?? false,
        securityNote: row.security_note,
        salaryText: salaryText(row),
        salaryPeriod: salaryPeriod(row),
        mentions30PercentRuling: row.mentions_30_percent_ruling,
        postedAt: row.posted_at,
        deadlineAt: row.deadline_at,
        expiresAt,

        pipelineListingId: Number(row.id),
        sourceId: row.source_id,
        llmScore: row.total_score,
        llmReasoning: row.reasoning,
      })

      await recordDecision(
        db,
        row.id,
        'promoted',
        'pipeline',
        `score ${row.total_score} (cause ${row.cause_score} + leverage ${row.leverage_score})`,
        docId,
      )
      report.promoted++
      log(`promoted #${row.id} → ${docId}`)
    } catch (err) {
      const message = (err as Error).message
      report.errors.push({ listingId: row.id, message })
      log(`failed to promote #${row.id}: ${message}`)
    }
  }

  return report
}

async function loadPromotable(db: Db, limit: number): Promise<PromotableRow[]> {
  const { rows } = await db.query<PromotableRow>(
    `select l.id, l.title, l.employer_id, l.employer_name, l.apply_url, l.description,
            l.location_raw, l.posted_at, l.first_seen_at, l.deadline_at, l.salary_min, l.salary_max,
            l.salary_currency, l.salary_period, l.mentions_30_percent_ruling, l.source_id,
            c.primary_cause, c.secondary_causes, c.sub_area, c.skills,
            c.leverage, c.cause_score,
            c.leverage_score, c.total_score, c.language_requirement,
            c.work_authorisation, c.security_screening, c.security_note,
            c.seniority, c.location_mode, c.draft_note, c.reasoning,
            e.leverage_note       as employer_leverage_note,
            e.website             as employer_website,
            e.careers_url         as employer_careers_url,
            e.cause_areas         as employer_cause_areas,
            e.ats                 as employer_ats,
            e.e2g_allowlisted     as employer_e2g
       from listing l
       join classification c on c.listing_id = l.id
       left join employer e on e.id = l.employer_id
       left join decision d
              on d.listing_id = l.id
             -- Never re-promote something a human already decided on, and never
             -- promote the same listing twice.
             and d.action in ('promoted', 'published', 'rejected', 'snoozed')
      where l.closed_at is null
        and d.id is null
        -- Never queue a vacancy that has already closed. NB: no backticks in
        -- this comment -- it sits inside a JS template literal, and one would
        -- end the string.
        --
        -- expiresAt defaults to the ad's own deadline, so a listing whose
        -- deadline passed before a curator reached it was promoted, reviewed,
        -- published -- and then hidden by that same date the moment it went
        -- live, because every public query filters on expiresAt > now(). Two
        -- ANVS nuclear-security roles went through exactly that in September
        -- 2026: correctly classified, published in good faith, invisible on
        -- arrival, and both ads already 404 at the source.
        --
        -- The curator's time is the scarcest thing in this pipeline, so the
        -- cheapest fix is not to spend it on a dead vacancy at all.
        and (l.deadline_at is null or l.deadline_at > now())
        and c.nl_eligible
        and c.primary_cause is not null
        and c.leverage is not null
        and cardinality(c.skills) > 0
        and c.total_score >= 4
        and c.cause_score >= 2
      order by c.total_score desc, l.first_seen_at desc
      limit $1`,
    [limit],
  )
  return rows
}

/**
 * Mirrors the employer into Sanity so editorial copy about an organisation
 * lives in the CMS. Employers are created as published documents, not drafts —
 * they are reference targets, and a draft-only employer would leave every
 * listing pointing at nothing.
 */
async function ensureEmployer(
  client: ReturnType<typeof writeClient>,
  row: PromotableRow,
  cache: Map<string, string>,
  onCreate: () => void,
): Promise<string> {
  const pipelineId = row.employer_id ?? slugify(row.employer_name)
  const cached = cache.get(pipelineId)
  if (cached) return cached

  const docId = `employer-${pipelineId}`
  const existing = await client.fetch<{ _id: string } | null>(
    '*[_type == "employer" && _id == $id][0]{_id}',
    { id: docId },
  )

  if (!existing) {
    await client.createIfNotExists({
      _id: docId,
      _type: 'employer',
      name: row.employer_name,
      slug: { _type: 'slug', current: slugify(row.employer_name) },
      pipelineEmployerId: pipelineId,
      website: row.employer_website ?? undefined,
      careersUrl: row.employer_careers_url ?? undefined,
      city: cityFrom(row.location_raw) ?? undefined,
      // The durable employer-level note, if the watchlist already carries one.
      leverageNoteNl: row.employer_leverage_note ?? undefined,
      causeAreas: row.employer_cause_areas ?? [],
      ats: row.employer_ats ?? undefined,
      e2gAllowlisted: row.employer_e2g ?? false,
      notEndorsement: row.employer_e2g ?? false,
    })
    onCreate()
  }

  cache.set(pipelineId, docId)
  return docId
}

/**
 * A short, neutral excerpt. Deliberately NOT the full description: reproducing
 * the expressive text of a job ad is where aggregators get into trouble, and
 * there is no product reason to do it here (§10).
 */
function buildExcerpt(description: string | null): string {
  if (!description) return ''
  const paragraphs = description
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 60)
  const first = paragraphs[0] ?? description.slice(0, 400)
  return first.length > 500 ? `${first.slice(0, 497).trimEnd()}…` : first
}

function cityFrom(locationRaw: string | null): string | null {
  if (!locationRaw) return null
  return locationRaw.split(/[,·|/]/)[0]?.trim() || null
}

/**
 * The figure only — no period, and therefore no language.
 *
 * This used to append " per maand" / " per jaar", which baked a Dutch word into
 * a stored content field and put it straight onto the English page: a reader on
 * /en saw "€5.900–€8.100 per maand" under an English heading. The period is
 * interface furniture, not source data, so it belongs in `content/i18n` like
 * every other label and gets applied at render time from `salaryPeriod`.
 *
 * The numbers keep their Dutch grouping deliberately. A salary advertised in
 * the Netherlands is written 5.900 there, and re-punctuating it to 5,900 for
 * English readers would make it disagree with the employer's own ad.
 */
function salaryText(row: PromotableRow): string | undefined {
  const min = row.salary_min ? Number(row.salary_min) : null
  const max = row.salary_max ? Number(row.salary_max) : null
  if (!min && !max) return undefined
  const currency = row.salary_currency ?? 'EUR'
  const symbol = currency === 'EUR' ? '€' : `${currency} `
  const fmt = (n: number) => n.toLocaleString('nl-NL', { maximumFractionDigits: 0 })
  if (min && max) return `${symbol}${fmt(min)}–${symbol}${fmt(max)}`
  return `${symbol}${fmt((min ?? max)!)}`
}

/** The pay period as a value, for the renderer to label in the reader's language. */
function salaryPeriod(row: PromotableRow): 'month' | 'year' | undefined {
  if (row.salary_period === 'month') return 'month'
  if (row.salary_period === 'year') return 'year'
  return undefined
}

/**
 * Expiry automation (§7.8). Every published document gets an expiresAt and
 * auto-unpublishes, so the board cannot fill up with dead links.
 */
export async function runExpiry(options: { dryRun?: boolean; onLog?: (l: string) => void } = {}) {
  const log = (l: string) => options.onLog?.(l)
  const client = writeClient()
  const expired = await client.fetch<{ _id: string; title: string; expiresAt: string }[]>(
    `*[_type == "jobListing" && !(_id in path("drafts.**")) && defined(expiresAt) && expiresAt < now()]{_id, title, expiresAt}`,
  )
  log(`${expired.length} published listings past their expiry date`)

  /*
    Listings the *source* has already closed, ahead of their expiry date.

    Expiry alone was never enough. `expiresAt` is a guess — the ad's stated
    deadline, or sixty days after posting — and a vacancy that fills early
    closes long before it. The pipeline knows: ingest marks `closed_at` by set
    difference for sources that return a complete list, and `checkDeadLinks`
    HEAD-checks the rest. But that knowledge stopped at the Postgres row.
    Nothing carried it into Sanity, so a published listing kept its place on the
    board, with a dead apply link, until its guessed date arrived.

    A reader reported exactly that within hours of the beta going out — an Epoch
    AI role, gone from Lever, still listed here with a 404 behind the button.
    The board's whole claim is that a person vouched for every entry; a dead
    link is the cheapest possible way to lose that.
  */
  const closedAtSource = await findClosedAtSource(client, log)
  const doomed = [...expired]
  const seen = new Set(expired.map((d) => d._id))
  for (const doc of closedAtSource) if (!seen.has(doc._id)) doomed.push(doc)

  if (options.dryRun) return { unpublished: 0, found: doomed.length, closedAtSource: closedAtSource.length }

  let unpublished = 0
  for (const doc of doomed) {
    // Unpublish by moving the document back to a draft: the content survives
    // for the archive view and the URL keeps redirecting rather than 404-ing
    // (§9.8), but it leaves the live board.
    const full = await client.getDocument(doc._id)
    if (!full) continue
    await client
      .transaction()
      .createOrReplace({ ...full, _id: `drafts.${doc._id}` })
      .delete(doc._id)
      .commit()
    unpublished++
    log(`unpublished ${doc._id} (${doc.title})`)
  }
  return { unpublished, found: doomed.length, closedAtSource: closedAtSource.length }
}

/**
 * Published listings whose pipeline row is closed.
 *
 * Joined on `pipelineListingId`, which `runPromotion` writes onto every
 * document precisely so the published board can be traced back to the row it
 * came from. Degrades to an empty list rather than throwing: the expiry job
 * must still retire genuinely expired listings on a machine with no database
 * reachable, which is the case in a Sanity-only environment.
 */
async function findClosedAtSource(
  client: ReturnType<typeof writeClient>,
  log: (l: string) => void,
): Promise<{ _id: string; title: string; expiresAt: string }[]> {
  const live = await client.fetch<
    { _id: string; title: string; applyUrl: string | null; pipelineListingId: number | null }[]
  >(
    `*[_type == "jobListing" && !(_id in path("drafts.**")) && defined(pipelineListingId)
       && (!defined(expiresAt) || expiresAt > now())]{_id, title, applyUrl, pipelineListingId}`,
  )
  const ids = live.map((d) => d.pipelineListingId).filter((n): n is number => typeof n === 'number')
  if (!ids.length) return []

  let candidates: typeof live
  try {
    const db = await getDb()
    const { rows } = await db.query<{ id: number }>(
      'select id from listing where closed_at is not null and id = any($1::int[])',
      [ids],
    )
    const closed = new Set(rows.map((r) => r.id))
    candidates = live.filter((d) => d.pipelineListingId !== null && closed.has(d.pipelineListingId))
  } catch (err) {
    log(`could not check source closure (${(err as Error).message}) — expiry only`)
    return []
  }
  if (!candidates.length) return []

  /*
    Absence from one fetch is a signal, not proof — so corroborate it.

    Set-difference closure marks a listing closed the moment it is missing from
    a source's response. That is usually right and occasionally very wrong: a
    paginated or partially-returned API answer closes everything it failed to
    mention. On the first real run of this check, six published listings were
    flagged and four of them still answered 200 at the employer's own site —
    two at the Centre for Effective Altruism, two at GiveDirectly. Unpublishing
    those would have removed live vacancies from the board on the strength of
    one HTTP response.

    So a listing is only retired here when the pipeline says it is gone AND its
    apply URL is verifiably dead. The two failure modes are not symmetrical: a
    dead link on the board costs a reader one wasted click and is caught by the
    weekly link check, while silently deleting a live vacancy costs them the job
    and we never find out. Anything closed-but-still-answering is left up and
    logged for a curator to judge.
  */
  const { httpFetch } = await import('../lib/http')
  const confirmed: { _id: string; title: string; expiresAt: string }[] = []
  let unconfirmed = 0

  for (const doc of candidates) {
    if (!doc.applyUrl) {
      unconfirmed++
      continue
    }
    try {
      const res = await httpFetch(doc.applyUrl, {
        method: 'HEAD',
        retries: 1,
        acceptStatuses: [404, 410, 403, 405],
      })
      if (res.status === 404 || res.status === 410) {
        confirmed.push({ _id: doc._id, title: doc.title, expiresAt: '' })
      } else {
        unconfirmed++
        log(`still answering ${res.status}, left published: ${doc.title}`)
      }
    } catch {
      // A network failure is not evidence the vacancy is gone.
      unconfirmed++
    }
  }

  log(
    `${candidates.length} published listings absent from their source; ` +
      `${confirmed.length} confirmed dead, ${unconfirmed} left up pending a human`,
  )
  return confirmed
}
