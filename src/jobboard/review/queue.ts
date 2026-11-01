/**
 * The review queue, as the dashboard and the daily digest see it.
 *
 * Same definition as the Studio's "Review" list (sanity/structure.ts), made
 * stricter in the three places where the Studio list shows work that is not
 * worth a curator's time:
 *
 *   • a draft of a document that is already published is an edit in progress,
 *     not a new role, so it is left to the Studio;
 *   • a draft whose pipeline row has closed is a vacancy that has gone; and
 *   • a draft the pipeline already has a human decision for is one whose
 *     Sanity write failed halfway, and must not be decided on twice.
 */

import { getDb } from '../db/client'
import { t } from '../content/i18n'
import type { CauseArea, LeverageType, Skill, SubArea } from '../taxonomy'
import { isSanityConfigured, writeClient } from '../sanity/client'
import { needsTranslation, runTranslation } from '../sanity/translate'
import type { ListingPlacement } from './placement'

export type ReviewItem = {
  /** The draft's id, `drafts.jobListing-N`. */
  draftId: string
  /** The id it will have once published. */
  publishedId: string
  promotedAt: string
  title: string
  employerName: string | null
  applyUrl: string | null
  /** The Dutch note: the source, and what a curator edits and publishes. */
  note: string
  /**
   * The English of the note and the role summary, for a curator who reads
   * English. Null when there is none yet or it was made from a different
   * Dutch text, so a stale translation is never shown as if it were current.
   */
  noteEn: string | null
  excerpt: string | null
  excerptEn: string | null
  cause: string | null
  subArea: string | null
  skills: string[]
  leverage: string | null
  location: string | null
  seniority: string | null
  salary: string | null
  deadlineAt: string | null
  expiresAt: string | null
  score: number | null
  reasoning: string | null
  pipelineListingId: number | null
  slug: string | null
  employerSlug: string | null
  /** The raw values behind the labels above, for placement.ts. */
  placement: ListingPlacement
}

type DraftRow = {
  _id: string
  _createdAt: string
  title?: string
  employerName?: string | null
  applyUrl?: string | null
  whyThisMattersNl?: string | null
  whyThisMattersEn?: string | null
  excerpt?: string | null
  excerptEn?: string | null
  translatedFrom?: { whyThisMattersEn?: string; excerptEn?: string } | null
  listingKind?: string | null
  secondaryCauses?: string[] | null
  languageRequirement?: string | null
  employerSlug?: string | null
  primaryCause?: string | null
  subArea?: string | null
  skills?: string[] | null
  leverage?: string | null
  section?: string | null
  locationCity?: string | null
  locationMode?: string | null
  seniority?: string | null
  salaryText?: string | null
  salaryPeriod?: string | null
  deadlineAt?: string | null
  expiresAt?: string | null
  llmScore?: number | null
  llmReasoning?: string | null
  pipelineListingId?: number | null
  slug?: string | null
}

/** Labels for a curator who reads the Studio in English. */
const en = t('en')

function label<K extends string>(map: Record<K, string>, value: string | null | undefined) {
  if (!value) return null
  return map[value as K] ?? value
}

export function publishedIdOf(draftId: string): string {
  return draftId.replace(/^drafts\./, '')
}

const DRAFTS_QUERY = `*[_type == "jobListing" && _id in path("drafts.**")
     && (!defined(expiresAt) || expiresAt > now())]
    | order(llmScore desc, _createdAt desc) {
      _id, _createdAt, title, "employerName": employer->name,
      "employerSlug": employer->slug.current, applyUrl,
      whyThisMattersNl, whyThisMattersEn, excerpt, excerptEn, translatedFrom,
      listingKind, primaryCause, secondaryCauses, subArea, skills, leverage, section,
      locationCity, locationMode, languageRequirement, seniority, salaryText, salaryPeriod,
      deadlineAt, expiresAt, llmScore, llmReasoning, pipelineListingId,
      "slug": slug.current
    }`

function englishIsStale(d: DraftRow): boolean {
  return (
    needsTranslation(d.whyThisMattersNl, d.whyThisMattersEn, d.translatedFrom?.whyThisMattersEn, false) ||
    needsTranslation(d.excerpt, d.excerptEn, d.translatedFrom?.excerptEn, false)
  )
}

/** The English, or null when it is missing or was made from older Dutch. */
function current(
  dutch: string | null | undefined,
  english: string | null | undefined,
  recorded: string | undefined,
): string | null {
  return needsTranslation(dutch, english, recorded, false) ? null : (english ?? null)
}

/**
 * @param translate fill in missing English before returning, within
 *   `budgetMs`. The translate cron covers drafts too, but runs every three
 *   hours, so a role promoted since then would otherwise arrive in Dutch.
 *   Whatever does not fit in the budget comes back with English null and the
 *   dashboard says so.
 */
export async function loadReviewQueue(
  options: { translate?: boolean; budgetMs?: number } = {},
): Promise<ReviewItem[]> {
  if (!isSanityConfigured) return []
  const client = writeClient()

  let drafts = await client.fetch<DraftRow[]>(DRAFTS_QUERY)
  if (!drafts.length) return []

  if (options.translate) {
    const stale = drafts.filter(englishIsStale).map((d) => d._id)
    if (stale.length) {
      try {
        const report = await runTranslation({ ids: stale, budgetMs: options.budgetMs ?? 20_000 })
        if (report.documentsPatched) drafts = await client.fetch<DraftRow[]>(DRAFTS_QUERY)
      } catch (err) {
        // No API key, or the model is down: show the Dutch rather than nothing.
        console.error('[review:queue] translation failed', err)
      }
    }
  }

  const published = new Set(
    await client.fetch<string[]>(`*[_type == "jobListing" && _id in $ids]._id`, {
      ids: drafts.map((d) => publishedIdOf(d._id)),
    }),
  )

  const pipelineIds = drafts
    .map((d) => d.pipelineListingId)
    .filter((n): n is number => typeof n === 'number')
  const gone = new Set<number>()
  if (pipelineIds.length) {
    try {
      const db = await getDb()
      const { rows } = await db.query<{ id: string }>(
        `select l.id
           from listing l
          where l.id = any($1::bigint[])
            and (l.closed_at is not null
                 or exists (select 1 from decision d
                             where d.listing_id = l.id
                               and d.action in ('published', 'rejected')))`,
        [pipelineIds],
      )
      for (const r of rows) gone.add(Number(r.id))
    } catch {
      // No database reachable (a Sanity-only environment): show the Sanity
      // view unfiltered rather than an empty queue.
    }
  }

  return drafts
    .filter((d) => !published.has(publishedIdOf(d._id)))
    .filter((d) => d.pipelineListingId == null || !gone.has(d.pipelineListingId))
    .map((d) => ({
      draftId: d._id,
      publishedId: publishedIdOf(d._id),
      promotedAt: d._createdAt,
      title: d.title ?? '(untitled)',
      employerName: d.employerName ?? null,
      applyUrl: d.applyUrl ?? null,
      note: d.whyThisMattersNl ?? '',
      noteEn: current(d.whyThisMattersNl, d.whyThisMattersEn, d.translatedFrom?.whyThisMattersEn),
      excerpt: d.excerpt ?? null,
      excerptEn: current(d.excerpt, d.excerptEn, d.translatedFrom?.excerptEn),
      cause: label(en.causeAreas as Record<CauseArea, string>, d.primaryCause),
      subArea: label(en.subAreas as Record<SubArea, string>, d.subArea),
      skills: (d.skills ?? []).map((s) => label(en.skills as Record<Skill, string>, s) ?? s),
      leverage: label(en.leverage as Record<LeverageType, string>, d.leverage),
      location:
        [d.locationCity, label(en.locationModes as Record<string, string>, d.locationMode)]
          .filter(Boolean)
          .join(' · ') || null,
      seniority: label(en.seniorities as Record<string, string>, d.seniority),
      salary: d.salaryText
        ? `${d.salaryText}${d.salaryPeriod === 'month' ? ' per month' : d.salaryPeriod === 'year' ? ' per year' : ''}`
        : null,
      deadlineAt: d.deadlineAt ?? null,
      expiresAt: d.expiresAt ?? null,
      score: d.llmScore ?? null,
      reasoning: d.llmReasoning ?? null,
      pipelineListingId: d.pipelineListingId ?? null,
      slug: d.slug ?? null,
      employerSlug: d.employerSlug ?? null,
      placement: {
        listingKind: (d.listingKind ?? 'job') as ListingPlacement['listingKind'],
        primaryCause: (d.primaryCause ?? null) as ListingPlacement['primaryCause'],
        secondaryCauses: (d.secondaryCauses ?? []) as ListingPlacement['secondaryCauses'],
        subArea: (d.subArea ?? null) as ListingPlacement['subArea'],
        skills: (d.skills ?? []) as ListingPlacement['skills'],
        leverage: (d.leverage ?? null) as ListingPlacement['leverage'],
        section: (d.section ?? null) as ListingPlacement['section'],
        locationMode: (d.locationMode ?? null) as ListingPlacement['locationMode'],
        languageRequirement: (d.languageRequirement ?? null) as ListingPlacement['languageRequirement'],
        seniority: (d.seniority ?? null) as ListingPlacement['seniority'],
      },
    }))
}
