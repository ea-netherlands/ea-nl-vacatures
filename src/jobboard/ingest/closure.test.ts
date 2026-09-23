/**
 * Closure detection and cross-source dedup, driven through the real runner
 * against an in-memory PGlite database and a scripted adapter.
 *
 * These are the two ingest failures that were silent in production: a crawl
 * that ran out of time closed every listing behind its cursor, and an 80k copy
 * of a role never collided with the employer's own ATS copy.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import type { RawListing, SourceAdapter } from './types'

// Never let this file near a real database: the runner writes and closes rows.
delete process.env.DATABASE_URL
process.env.PGLITE_DIR = 'memory://'

type Script = { ids: string[]; incomplete?: boolean }
let script: Script = { ids: [] }

const scripted: SourceAdapter = {
  id: 'test-scripted',
  async *fetch(config, ctx) {
    for (const id of script.ids) {
      yield { externalId: id, payload: { id, title: String(config.title ?? `Role ${id}`) } } as RawListing
    }
    if (script.incomplete) ctx.markIncomplete('scripted: stopped early')
  },
  normalise(raw, config) {
    const p = raw.payload as { id: string; title: string }
    return {
      externalId: raw.externalId,
      employerId: (config.employerId as string | undefined) ?? null,
      employerName: String(config.employerName ?? 'Acme'),
      title: p.title,
      applyUrl: `https://jobs.example.org/acme/${p.id}?utm_source=${String(config.utm ?? 'x')}`,
      description: 'A role.',
      descriptionHtml: null,
      locationRaw: 'Amsterdam',
      country: 'NL',
      postedAt: null,
      deadlineAt: null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      mentions30PercentRuling: false,
    }
  },
}

async function setup() {
  const { getDb } = await import('../db/client')
  const { migrate } = await import('../db/migrate')
  const { registerAdapter } = await import('./registry')
  const { runIngest } = await import('./run')
  registerAdapter(scripted)
  const db = await getDb()
  await migrate(db)
  await db.query(`insert into employer (id, name) values ('acme', 'Acme') on conflict do nothing`)
  return { db, runIngest }
}

const ready = setup()

async function addSource(id: string, kind: string, config: Record<string, unknown>) {
  const { db } = await ready
  await db.query(
    `insert into source (id, kind, adapter, config, returns_complete_set)
     values ($1, $2, 'test-scripted', $3::jsonb, true)`,
    [id, kind, JSON.stringify(config)],
  )
}

async function openIds(sourceId: string): Promise<string[]> {
  const { db } = await ready
  const { rows } = await db.query<{ external_id: string }>(
    `select external_id from listing where source_id = $1 and closed_at is null order by external_id`,
    [sourceId],
  )
  return rows.map((r) => r.external_id)
}

test('an incomplete fetch closes nothing; a complete one closes what is gone', async () => {
  const { runIngest } = await ready
  await addSource('closure-src', 'crawl', { employerId: 'acme' })

  script = { ids: ['a', 'b', 'c'] }
  await runIngest({ sourceIds: ['closure-src'] })
  assert.deepEqual(await openIds('closure-src'), ['a', 'b', 'c'])

  // The shape of the wvn bug: the run saw only the first page, then stopped.
  script = { ids: ['a'], incomplete: true }
  await runIngest({ sourceIds: ['closure-src'] })
  assert.deepEqual(await openIds('closure-src'), ['a', 'b', 'c'])

  // A finished fetch is still trusted.
  script = { ids: ['a', 'b'] }
  await runIngest({ sourceIds: ['closure-src'] })
  assert.deepEqual(await openIds('closure-src'), ['a', 'b'])
})

test('an aggregator copy with no employer id shares a dedup key with the ATS copy', async () => {
  const { db, runIngest } = await ready
  await addSource('dedup-ats', 'ats', { employerId: 'acme', title: 'Policy lead', utm: 'ats' })
  // 80k-style: employer known only by name, tracking params on the link.
  await addSource('dedup-80k', 'ea-board', { employerName: 'ACME', title: 'Policy lead', utm: '80k' })

  script = { ids: ['z'] }
  await runIngest({ sourceIds: ['dedup-ats', 'dedup-80k'], concurrency: 1 })

  const { rows } = await db.query<{ source_id: string; employer_id: string | null; dedup_key: string }>(
    `select source_id, employer_id, dedup_key from listing where source_id like 'dedup-%' order by source_id`,
  )
  assert.equal(rows.length, 2)
  assert.equal(rows[0].employer_id, 'acme')
  assert.equal(rows[1].employer_id, 'acme')
  assert.equal(rows[0].dedup_key, rows[1].dedup_key)
})
