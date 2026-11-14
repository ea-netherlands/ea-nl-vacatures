/**
 * Where reader feedback is stored, and why its ids have a dot in them.
 *
 * The board's dataset is public: anyone can query published documents without
 * a token, which is what lets the pages read listings from the CDN. Sanity
 * makes one exception, and it is by id, not by type: a document whose `_id`
 * contains a dot (a "path", like `suggestion.abc`) is only returned to a
 * request carrying a token.
 *
 * A suggestion can hold the sender's email address and a free-text message, so
 * it has to be on the private side of that line. The Studio queue and the
 * weekly digest both read with credentials, so neither notices the difference.
 */

import { randomUUID } from 'node:crypto'

const PREFIX = 'suggestion.'

/** A fresh id for a suggestion, always on the private (dotted) path. */
export function privateSuggestionId(uuid: string = randomUUID()): string {
  return `${PREFIX}${uuid}`
}

/** The private id for a suggestion that was stored under a public one, or null if it already is private. */
export function privateIdFor(id: string): string | null {
  const draft = id.startsWith('drafts.')
  const bare = draft ? id.slice('drafts.'.length) : id
  if (bare.startsWith(PREFIX)) return null
  return `${draft ? 'drafts.' : ''}${PREFIX}${bare}`
}

type Doc = { _id: string; [key: string]: unknown }

/** The small part of the Sanity client the move needs; lets a test stand in for it. */
export type MoveClient = {
  fetch<T>(query: string): Promise<T>
  transaction(): {
    createIfNotExists(doc: Doc): unknown
    delete(id: string): unknown
    commit(): Promise<unknown>
  }
}

export type MoveReport = { found: number; moved: number; alreadyPrivate: number; ids: string[] }

/**
 * Moves suggestions written before this rule onto private ids. Each one is
 * copied and its public original deleted in a single transaction, so a
 * suggestion is never missing and never in both places. Safe to run twice.
 */
export async function privatiseSuggestions(
  client: MoveClient,
  options: { dryRun?: boolean } = {},
): Promise<MoveReport> {
  const docs = await client.fetch<Doc[]>(`*[_type == "suggestion"]`)
  const report: MoveReport = { found: docs.length, moved: 0, alreadyPrivate: 0, ids: [] }

  for (const doc of docs) {
    const target = privateIdFor(doc._id)
    if (!target) {
      report.alreadyPrivate += 1
      continue
    }
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
