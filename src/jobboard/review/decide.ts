/**
 * The two decisions a curator makes on the dashboard, and what they write.
 *
 * Both go to two places, deliberately: Sanity, because that is what the board
 * renders, and the pipeline's `decision` table, because that is what the
 * classifier learns from and what `npm run grade` counts. Before this, a
 * listing published or deleted in the Studio left no trace in Postgres at all,
 * so the "few hundred human decisions" the README asks for before trusting
 * auto-publish were never being collected.
 */

import { getDb } from '../db/client'
import { recordDecision } from '../classify/run'
import { writeClient } from '../sanity/client'
import { publishedIdOf } from './queue'
import type { RejectCategory } from './categories'
import type { ListingPlacement } from './placement'
import {
  CAUSE_AREAS,
  LANGUAGE_REQUIREMENTS,
  LEVERAGE_TYPES,
  LISTING_KINDS,
  LOCATION_MODES,
  MAX_SKILLS_PER_LISTING,
  SENIORITIES,
  SKILLS,
  SUB_AREA_CAUSE,
  SUB_AREAS,
  type SubArea,
} from '../taxonomy'

/** The Studio's own bounds on the note (schemas/jobListing.ts). */
export const NOTE_MIN = 80
export const NOTE_MAX = 600

export const CURATOR_ACTOR = 'curator:dashboard'

export class DecisionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function loadDraft(draftId: string) {
  if (!/^drafts\.jobListing-[\w-]+$/.test(draftId)) {
    throw new DecisionError('not a job listing draft', 400)
  }
  const client = writeClient()
  const draft = await client.getDocument(draftId)
  if (!draft) {
    // Most often: it was decided in another tab, or in the Studio.
    throw new DecisionError('this listing is no longer in the queue', 409)
  }
  return { client, draft }
}

const PLACEMENT_FIELDS = [
  'listingKind',
  'primaryCause',
  'secondaryCauses',
  'subArea',
  'skills',
  'leverage',
  'locationMode',
  'languageRequirement',
  'seniority',
] as const satisfies readonly (keyof ListingPlacement)[]

function oneOf<T extends string>(allowed: readonly T[], value: unknown, field: string, nullable = true): T | null {
  if (value == null || value === '') {
    if (nullable) return null
    throw new DecisionError(`${field} is required`, 422)
  }
  if (!(allowed as readonly unknown[]).includes(value)) throw new DecisionError(`${field}: unknown value`, 422)
  return value as T
}

/**
 * Checks a curator's relisting against the taxonomy. The API bypasses the
 * Studio's validation, so the Studio's rules are repeated here: a primary
 * cause, one to MAX_SKILLS_PER_LISTING skills, a sub-area that belongs to the
 * primary cause.
 */
export function validatePlacement(input: unknown): ListingPlacement {
  if (!input || typeof input !== 'object') throw new DecisionError('listing: expected an object', 400)
  const p = input as Record<string, unknown>
  const primaryCause = oneOf(CAUSE_AREAS, p.primaryCause, 'problem area', false)!
  const subArea = oneOf(SUB_AREAS, p.subArea, 'sub-area') as SubArea | null
  if (subArea && SUB_AREA_CAUSE[subArea] !== primaryCause) {
    throw new DecisionError('the sub-area belongs to a different problem area', 422)
  }
  const list = (v: unknown) => (Array.isArray(v) ? v : [])
  const secondaryCauses = [...new Set(list(p.secondaryCauses).map((c) => oneOf(CAUSE_AREAS, c, 'also under')!))].filter(
    (c) => c !== primaryCause,
  )
  const skills = [...new Set(list(p.skills).map((k) => oneOf(SKILLS, k, 'skill')!))]
  if (skills.length < 1 || skills.length > MAX_SKILLS_PER_LISTING) {
    throw new DecisionError(`pick one or ${MAX_SKILLS_PER_LISTING} skills`, 422)
  }
  return {
    listingKind: oneOf(LISTING_KINDS, p.listingKind ?? 'job', 'kind', false),
    primaryCause,
    secondaryCauses,
    subArea,
    skills,
    leverage: oneOf(LEVERAGE_TYPES, p.leverage, 'leverage', false),
    locationMode: oneOf(LOCATION_MODES, p.locationMode, 'location'),
    languageRequirement: oneOf(LANGUAGE_REQUIREMENTS, p.languageRequirement, 'language'),
    seniority: oneOf(SENIORITIES, p.seniority, 'seniority'),
  }
}

function show(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'none'
  return value == null || value === '' ? 'none' : String(value)
}

/**
 * The fields a curator changed, as "field: old → new" — the line the
 * classifier sees beside this listing in its calibration (calibration.ts).
 */
export function describeRelisting(draft: Record<string, unknown>, next: ListingPlacement): string[] {
  const before = (field: (typeof PLACEMENT_FIELDS)[number]) =>
    field === 'listingKind' ? (draft.listingKind ?? 'job') : field === 'secondaryCauses' ? (draft.secondaryCauses ?? []) : draft[field]
  return PLACEMENT_FIELDS.filter((f) => show(before(f)) !== show(next[f])).map(
    (f) => `${f}: ${show(before(f))} → ${show(next[f])}`,
  )
}

/**
 * Publishes the draft as it stands, with the note replaced if the curator
 * edited it on the dashboard. The edited note is what makes this safe to do
 * in one click: the note is the product, and the curator saw it, and could
 * change it, before accepting.
 */
export async function acceptListing(
  draftId: string,
  note?: string,
  // The backfill in promote.ts publishes as the pipeline, so its decisions stay
  // out of curator calibration like every other auto-publish.
  decidedBy: { actor: string; reason: string } | null = null,
  placement?: ListingPlacement,
): Promise<{ publishedId: string }> {
  const { client, draft } = await loadDraft(draftId)
  const finalNote = (note ?? (draft.whyThisMattersNl as string | undefined) ?? '').trim()
  // The API bypasses Studio validation, so enforce the same rule here: a
  // one-word note is how the board would quietly become a generic aggregator.
  if (finalNote.length < NOTE_MIN || finalNote.length > NOTE_MAX) {
    throw new DecisionError(`the note needs ${NOTE_MIN}–${NOTE_MAX} characters`, 422)
  }

  const expiresAt = draft.expiresAt as string | undefined
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    throw new DecisionError('this listing has already expired, so publishing would hide it', 409)
  }

  const relisted = placement ? describeRelisting(draft, placement) : []
  // Cleared fields are left out rather than written as null, which Sanity
  // would store as a value.
  const placementFields = placement
    ? Object.fromEntries(Object.entries(placement).filter(([, v]) => v != null))
    : {}

  const publishedId = publishedIdOf(draftId)
  // System fields are the dataset's to set; carrying the draft's _rev across
  // would be rejected, and its timestamps would be wrong.
  const { _rev, _updatedAt, _createdAt, ...content } = draft
  void _rev
  void _updatedAt
  void _createdAt
  if (placement) {
    // A field the curator cleared must go, not linger from the draft.
    for (const f of PLACEMENT_FIELDS) if (placement[f] == null) delete content[f]
  }

  await client
    .transaction()
    .createOrReplace({
      ...content,
      ...placementFields,
      _id: publishedId,
      _type: 'jobListing',
      whyThisMattersNl: finalNote,
    })
    .delete(draftId)
    .commit()

  const listingId = draft.pipelineListingId as number | undefined
  if (typeof listingId === 'number') {
    const edited = note !== undefined && note.trim() !== ((draft.whyThisMattersNl as string) ?? '').trim()
    await recordDecision(
      await getDb(),
      listingId,
      'published',
      decidedBy?.actor ?? CURATOR_ACTOR,
      decidedBy?.reason ??
        [
          edited ? 'published with an edited note' : 'published as drafted',
          relisted.length ? `relisted: ${relisted.join('; ')}` : null,
        ]
          .filter(Boolean)
          .join('; '),
      publishedId,
    )
  }
  return { publishedId }
}

/**
 * Removes the draft from the queue and records why.
 *
 * Deleting the Sanity draft loses nothing: everything in it came from the
 * pipeline row, which stays, and the `promoted` decision already on that row
 * stops promotion from recreating it.
 */
export async function rejectListing(
  draftId: string,
  feedback: { category?: RejectCategory; reason?: string } = {},
): Promise<void> {
  const { client, draft } = await loadDraft(draftId)
  await client.delete(draftId)

  const listingId = draft.pipelineListingId as number | undefined
  if (typeof listingId !== 'number') return
  const reason = feedback.reason?.trim().slice(0, 1000) || null
  const db = await getDb()
  await db.query(
    `insert into decision (listing_id, action, actor, reason, category, sanity_doc_id)
     values ($1, 'rejected', $2, $3, $4, $5)`,
    [listingId, CURATOR_ACTOR, reason, feedback.category ?? null, draftId],
  )
}
