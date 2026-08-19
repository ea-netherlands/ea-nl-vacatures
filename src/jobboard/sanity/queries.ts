/**
 * GROQ queries and the view types for the public board.
 *
 * Everything the public site reads goes through here, so the shape the pages
 * consume is defined in exactly one place.
 */

import { isSanityConfigured, readClient } from './client'
import type { CauseArea, LeverageType } from '../taxonomy'
import type {
  LanguageRequirement,
  LocationMode,
  Seniority,
  WorkAuthorisation,
} from '../taxonomy'

const LISTING_FIELDS = /* groq */ `
  "id": _id,
  "slug": slug.current,
  title,
  applyUrl,
  whyThisMattersNl,
  whyThisMattersEn,
  excerpt,
  primaryCause,
  "secondaryCauses": coalesce(secondaryCauses, []),
  leverage,
  locationCity,
  locationMode,
  seniority,
  languageRequirement,
  workAuthorisation,
  securityScreening,
  securityNote,
  salaryText,
  mentions30PercentRuling,
  postedAt,
  deadlineAt,
  expiresAt,
  pipelineListingId,
  "employer": employer->{
    "id": _id,
    name,
    "slug": slug.current,
    city,
    website,
    notEndorsement,
    e2gAllowlisted
  }
`

export type ListingView = {
  id: string
  slug: string
  title: string
  applyUrl: string
  whyThisMattersNl: string | null
  whyThisMattersEn: string | null
  excerpt: string | null
  primaryCause: CauseArea | null
  secondaryCauses: CauseArea[]
  leverage: LeverageType | null
  locationCity: string | null
  locationMode: LocationMode | null
  seniority: Seniority | null
  languageRequirement: LanguageRequirement | null
  workAuthorisation: WorkAuthorisation | null
  securityScreening: boolean | null
  securityNote: string | null
  salaryText: string | null
  mentions30PercentRuling: boolean | null
  postedAt: string | null
  deadlineAt: string | null
  expiresAt: string | null
  /** Links the published document back to its row in the ingestion pipeline. */
  pipelineListingId: number | null
  employer: {
    id: string
    name: string
    slug: string
    city: string | null
    website: string | null
    notEndorsement: boolean | null
    e2gAllowlisted: boolean | null
  } | null
}

export type EmployerView = {
  id: string
  name: string
  slug: string
  city: string | null
  website: string | null
  careersUrl: string | null
  leverageNoteNl: string | null
  leverageNoteEn: string | null
  causeAreas: CauseArea[]
  notEndorsement: boolean | null
  e2gAllowlisted: boolean | null
}

export type ExplainerView = {
  id: string
  kind: 'method' | 'cause' | 'earning-to-give'
  causeArea: CauseArea | null
  title: string
  slug: string
  summary: string
  body: unknown[]
  uncertainties: string
  reviewedByHuman: boolean | null
  language: string
}

/** A live listing: published, not expired. */
const LIVE = /* groq */ `_type == "jobListing" && (!defined(expiresAt) || expiresAt > now())`

/**
 * Sanity may not be configured yet (M0 creates the project). Every reader
 * degrades to an empty result rather than throwing, so the board renders its
 * empty states instead of a 500 during setup.
 */
async function fetchOrEmpty<T>(query: string, params: Record<string, unknown>, fallback: T): Promise<T> {
  if (!isSanityConfigured) return fallback
  try {
    return await readClient().fetch<T>(query, params)
  } catch {
    return fallback
  }
}

export async function getLiveListings(opts?: {
  /** Exclude the earning-to-give section, which has its own route (§9.6). */
  excludeEarningToGive?: boolean
  sort?: 'recent' | 'leverage'
}): Promise<ListingView[]> {
  const filter = opts?.excludeEarningToGive
    ? `${LIVE} && leverage != "earning-to-give"`
    : LIVE
  // "Highest leverage first" ranks by the board's stated priority order
  // (§ discussion August 2026): a role at an org an independent evaluator or
  // 80,000 Hours has already vetted ranks above the leverage-scored roles
  // this board itself judges, which in turn rank above everything else. The
  // board has no public score, and exposing the LLM's number would be both
  // meaningless and misleading to a reader — this ranking is the honest
  // proxy for it.
  const order =
    opts?.sort === 'leverage'
      ? `order(select(
            leverage == "trusted-recommendation" => 0,
            leverage == "capital-allocation" => 1,
            leverage == "policy-regulation" => 2,
            leverage == "research-evidence" => 3,
            leverage == "field-building" => 4,
            5
          ) asc, coalesce(postedAt, _createdAt) desc)`
      : `order(coalesce(postedAt, _createdAt) desc)`

  return fetchOrEmpty<ListingView[]>(
    `*[${filter}] | ${order} { ${LISTING_FIELDS} }`,
    {},
    [],
  )
}

export async function getEarningToGiveListings(): Promise<ListingView[]> {
  return fetchOrEmpty<ListingView[]>(
    `*[${LIVE} && leverage == "earning-to-give"] | order(coalesce(postedAt, _createdAt) desc) { ${LISTING_FIELDS} }`,
    {},
    [],
  )
}

export async function getListingBySlug(slug: string): Promise<ListingView | null> {
  return fetchOrEmpty<ListingView | null>(
    `*[_type == "jobListing" && slug.current == $slug][0] { ${LISTING_FIELDS} }`,
    { slug },
    null,
  )
}

export async function getListingById(id: string): Promise<ListingView | null> {
  return fetchOrEmpty<ListingView | null>(
    `*[_type == "jobListing" && _id == $id][0] { ${LISTING_FIELDS} }`,
    { id },
    null,
  )
}

export async function getAllListingSlugs(): Promise<{ slug: string; expiresAt: string | null }[]> {
  return fetchOrEmpty(
    `*[_type == "jobListing" && defined(slug.current)]{ "slug": slug.current, expiresAt }`,
    {},
    [],
  )
}

export async function getEmployer(slug: string): Promise<EmployerView | null> {
  return fetchOrEmpty<EmployerView | null>(
    `*[_type == "employer" && slug.current == $slug][0]{
      "id": _id, name, "slug": slug.current, city, website, careersUrl,
      leverageNoteNl, leverageNoteEn, "causeAreas": coalesce(causeAreas, []),
      notEndorsement, e2gAllowlisted
    }`,
    { slug },
    null,
  )
}

export async function getEmployerListings(employerId: string): Promise<ListingView[]> {
  return fetchOrEmpty<ListingView[]>(
    `*[${LIVE} && employer._ref == $employerId] | order(coalesce(postedAt, _createdAt) desc) { ${LISTING_FIELDS} }`,
    { employerId },
    [],
  )
}

/** Employers that currently have at least one live role. */
export async function getEmployersWithRoles(): Promise<(EmployerView & { roleCount: number })[]> {
  return fetchOrEmpty(
    `*[_type == "employer" && count(*[${LIVE} && employer._ref == ^._id]) > 0] | order(name asc){
      "id": _id, name, "slug": slug.current, city, website, careersUrl,
      leverageNoteNl, leverageNoteEn, "causeAreas": coalesce(causeAreas, []),
      notEndorsement, e2gAllowlisted,
      "roleCount": count(*[${LIVE} && employer._ref == ^._id])
    }`,
    {},
    [],
  )
}

export async function getExplainer(
  kind: 'method' | 'cause' | 'earning-to-give',
  language: string,
  causeArea?: string,
): Promise<ExplainerView | null> {
  const causeClause = kind === 'cause' ? ' && causeArea == $causeArea' : ''
  return fetchOrEmpty<ExplainerView | null>(
    `*[_type == "explainerPage" && kind == $kind && language == $language${causeClause}][0]{
      "id": _id, kind, causeArea, title, "slug": slug.current, summary, body,
      uncertainties, reviewedByHuman, language
    }`,
    { kind, language, causeArea: causeArea ?? null },
    null,
  )
}

export async function getAllExplainers(language: string): Promise<ExplainerView[]> {
  return fetchOrEmpty<ExplainerView[]>(
    `*[_type == "explainerPage" && language == $language]{
      "id": _id, kind, causeArea, title, "slug": slug.current, summary, body,
      uncertainties, reviewedByHuman, language
    }`,
    { language },
    [],
  )
}

/** Counts for the quality metrics in §3, surfaced on the method page. */
export async function getBoardStats(): Promise<{ live: number; employers: number }> {
  return fetchOrEmpty(
    `{ "live": count(*[${LIVE}]), "employers": count(*[_type == "employer"]) }`,
    {},
    { live: 0, employers: 0 },
  )
}
