/**
 * Where the weekly social posts are stored, and why their ids have a dot.
 *
 * The board's dataset is public: anyone can query published documents without
 * a token. Sanity's one exception is by id: a document whose `_id` contains a
 * dot (a "path") is only returned to a request carrying a token (see also
 * `../sanity/suggestions.ts`). The jobs post and the explainer hold drafts
 * nobody has approved yet, and the explainer's slides and caption are EAN's
 * own words, so both live on the private side. Every reader of them (the review
 * pages, the cron jobs, the slide routes) already uses the token client.
 *
 * Posts written before this rule used `socialPost-<date>` and
 * `explainerPost-<date>`. Reads fall back to those until
 * `npm run privatise-social` has moved them, and the next save of a week moves
 * that week by itself.
 */

export type SocialDocType = 'socialPost' | 'explainerPost'

/** The private id for a week's post. */
export const privateSocialId = (type: SocialDocType, postDate: string) => `${type}.${postDate}`
/** The public id posts used before 16 Nov 2026. */
export const legacySocialId = (type: SocialDocType, postDate: string) => `${type}-${postDate}`

/** GROQ that returns the private document if there is one, else the legacy one. */
export const BY_DATE_QUERY = `coalesce(*[_id == $id][0], *[_id == $legacy][0])`

export const byDateParams = (type: SocialDocType, postDate: string) => ({
  id: privateSocialId(type, postDate),
  legacy: legacySocialId(type, postDate),
})

type Doc = { _id: string; _type: string; postDate?: string; [key: string]: unknown }

/** The part of the Sanity client the move needs; lets a test stand in for it. */
export type MoveClient = {
  fetch<T>(query: string, params?: Record<string, unknown>): Promise<T>
  transaction(): {
    createIfNotExists(doc: Doc): unknown
    delete(id: string): unknown
    commit(): Promise<unknown>
  }
}

export type MoveReport = { found: number; moved: number; alreadyPrivate: number; ids: string[] }

/**
 * Moves every jobs post and explainer still on a public id onto its private
 * one: copy and delete in one transaction, so a week is never missing and
 * never in both places. Safe to run twice.
 */
export async function privatiseSocialPosts(
  client: MoveClient,
  options: { dryRun?: boolean } = {},
): Promise<MoveReport> {
  const docs = await client.fetch<Doc[]>(`*[_type in ["socialPost", "explainerPost"]]`)
  const report: MoveReport = { found: docs.length, moved: 0, alreadyPrivate: 0, ids: [] }

  for (const doc of docs) {
    if (doc._id.includes('.')) {
      report.alreadyPrivate += 1
      continue
    }
    const type = doc._type as SocialDocType
    const postDate = doc.postDate ?? doc._id.slice(`${type}-`.length)
    const target = privateSocialId(type, postDate)
    report.ids.push(`${doc._id} -> ${target}`)
    if (options.dryRun) continue

    // System fields belong to the old document; Sanity sets fresh ones.
    const { _rev, _createdAt, _updatedAt, ...fields } = doc
    void _rev, _createdAt, _updatedAt
    const tx = client.transaction()
    tx.createIfNotExists({ ...fields, _id: target })
    tx.delete(doc._id)
    await tx.commit()
    report.moved += 1
  }
  return report
}
