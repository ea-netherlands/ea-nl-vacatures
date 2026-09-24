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

/**
 * Publishes the draft as it stands, with the note replaced if the curator
 * edited it on the dashboard. The edited note is what makes this safe to do
 * in one click: the note is the product, and the curator saw it, and could
 * change it, before accepting.
 */
export async function acceptListing(draftId: string, note?: string): Promise<{ publishedId: string }> {
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

  const publishedId = publishedIdOf(draftId)
  // System fields are the dataset's to set; carrying the draft's _rev across
  // would be rejected, and its timestamps would be wrong.
  const { _rev, _updatedAt, _createdAt, ...content } = draft
  void _rev
  void _updatedAt
  void _createdAt

  await client
    .transaction()
    .createOrReplace({ ...content, _id: publishedId, _type: 'jobListing', whyThisMattersNl: finalNote })
    .delete(draftId)
    .commit()

  const listingId = draft.pipelineListingId as number | undefined
  if (typeof listingId === 'number') {
    const edited = note !== undefined && note.trim() !== ((draft.whyThisMattersNl as string) ?? '').trim()
    await recordDecision(
      await getDb(),
      listingId,
      'published',
      CURATOR_ACTOR,
      edited ? 'published with an edited note' : 'published as drafted',
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
