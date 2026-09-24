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

export type ReviewItem = {
  /** The draft's id, `drafts.jobListing-N`. */
  draftId: string
  /** The id it will have once published. */
  publishedId: string
  promotedAt: string
  title: string
  employerName: string | null
  applyUrl: string | null
  note: string
  excerpt: string | null
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
}

type DraftRow = {
  _id: string
  _createdAt: string
  title?: string
  employerName?: string | null
  applyUrl?: string | null
  whyThisMattersNl?: string | null
  excerpt?: string | null
  primaryCause?: string | null
  subArea?: string | null
  skills?: string[] | null
  leverage?: string | null
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

export async function loadReviewQueue(): Promise<ReviewItem[]> {
  if (!isSanityConfigured) return []
  const client = writeClient()

  const drafts = await client.fetch<DraftRow[]>(
    `*[_type == "jobListing" && _id in path("drafts.**")
       && (!defined(expiresAt) || expiresAt > now())]
      | order(llmScore desc, _createdAt desc) {
        _id, _createdAt, title, "employerName": employer->name, applyUrl,
        whyThisMattersNl, excerpt, primaryCause, subArea, skills, leverage,
        locationCity, locationMode, seniority, salaryText, salaryPeriod,
        deadlineAt, expiresAt, llmScore, llmReasoning, pipelineListingId,
        "slug": slug.current
      }`,
  )
  if (!drafts.length) return []

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
      excerpt: d.excerpt ?? null,
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
    }))
}
