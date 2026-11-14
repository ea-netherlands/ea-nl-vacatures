/**
 * Keeps the classifier's reasoning off published listings.
 *
 * `llmReasoning` is the classifier explaining to a curator why it let a role
 * through, sometimes in frank terms about the employer. It belongs on the
 * draft, which Sanity keeps private (a `drafts.` id is only readable with a
 * token). A published listing is readable by anyone through the public
 * dataset, so the field must not reach one.
 *
 * Both of the board's own publish paths leave it out (promote.ts for listings
 * that go straight live, review/decide.ts for the review queue). Publishing a
 * draft with the Studio's own button still copies it across, and listings
 * published before this rule carry it, so the promote cron sweeps published
 * listings with this after every run.
 */

/** The field that never belongs on a published listing. */
export const PRIVATE_LISTING_FIELDS = ['llmReasoning'] as const

/** The part of the Sanity client the sweep needs; lets a test stand in for it. */
export type SweepClient = {
  fetch<T>(query: string): Promise<T>
  transaction(): {
    patch(id: string, ops: { unset: string[] }): unknown
    commit(): Promise<unknown>
  }
}

const BATCH = 100

/**
 * Removes the private fields from every published listing that has them.
 * Returns how many listings were cleaned. Drafts are left alone.
 */
export async function stripPublishedReasoning(
  client: SweepClient,
  options: { dryRun?: boolean } = {},
): Promise<{ found: number; cleaned: number }> {
  const ids = await client.fetch<string[]>(
    `*[_type == "jobListing" && !(_id in path("drafts.**")) && defined(llmReasoning)]._id`,
  )
  if (options.dryRun || !ids.length) return { found: ids.length, cleaned: 0 }

  let cleaned = 0
  for (let i = 0; i < ids.length; i += BATCH) {
    const tx = client.transaction()
    for (const id of ids.slice(i, i + BATCH)) tx.patch(id, { unset: [...PRIVATE_LISTING_FIELDS] })
    await tx.commit()
    cleaned += Math.min(BATCH, ids.length - i)
  }
  return { found: ids.length, cleaned }
}

/** A draft's fields with the private ones taken out, for writing as a published listing. */
export function withoutPrivateFields<T extends Record<string, unknown>>(doc: T): T {
  const out = { ...doc }
  for (const f of PRIVATE_LISTING_FIELDS) delete out[f]
  return out
}
