/**
 * The manual source, against SteadRise's Executive Catalyst page as it stood
 * on 18 October 2026 — the programme that prompted it, listed by none of the
 * boards the pipeline reads.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { stage1 } from '../../classify/stage1'
import { SEED_SOURCES } from '../../seed/employers'
import {
  manualEntries,
  manualEntryProblem,
  manualListings,
  mergeManualListings,
  normaliseManual,
  type ManualListing,
} from './manual'

// The runner test below writes rows; never let it near a real database.
delete process.env.DATABASE_URL
process.env.PGLITE_DIR = 'memory://'

const STEADRISE: ManualListing = {
  url: 'https://steadrise.org/executive-catalyst?utm_source=newsletter',
  title: 'Executive Catalyst: Ops &amp; Strategy',
  employerName: 'SteadRise',
  kind: 'programme',
  location: 'Remote',
  addedOn: '2026-10-18',
}

/** The parts of the page that matter here, abridged. Its illustrative roles quote salaries that are not the programme's. */
const STEADRISE_PAGE = `Executive Catalyst:
Ops & Strategy
For leaders with 8+ years building organisations
Starts November · 3 months · ~8 one-to-one sessions · Fits alongside a full-time role · No cost
Illustrative roles based on current openings, not guaranteed placements
Non-profit research org
·
£80K–£130K
Head of People
AI safety philanthropy
·
$180K–$300K
Chief Operating Officer
How it works
3 months · ~8 one-to-one sessions · Fits alongside a full-time role · No cost to you
The programme launches in November and takes on new participants monthly after that.`

const stage1Of = (n: ReturnType<typeof normaliseManual>) =>
  stage1({
    id: 1,
    title: n.title,
    employer_name: n.employerName,
    location_raw: n.locationRaw,
    country: n.country,
    description: n.description,
    salary_max: n.salaryMax,
    salary_currency: n.salaryCurrency,
    employer: null,
    listing_kind: n.listingKind ?? 'job',
  })

test('SteadRise normalises to a remote programme, with the page as its description', () => {
  const n = normaliseManual(STEADRISE, STEADRISE_PAGE)
  assert.equal(n.externalId, 'https://steadrise.org/executive-catalyst')
  assert.equal(n.applyUrl, 'https://steadrise.org/executive-catalyst')
  assert.equal(n.title, 'Executive Catalyst: Ops & Strategy')
  assert.equal(n.employerName, 'SteadRise')
  assert.equal(n.listingKind, 'programme')
  assert.equal(n.locationRaw, 'Remote')
  assert.equal(n.country, null)
  assert.deepEqual(n.postedAt, new Date('2026-10-18T00:00:00Z'))
  assert.equal(n.deadlineAt, null)
  assert.match(n.description!, /^From the programme's own page:\n\n.*3 months/s)
  // The illustrative £80K–£130K roles are not the programme's pay.
  assert.deepEqual([n.salaryMin, n.salaryMax, n.salaryCurrency, n.salaryPeriod], [null, null, null, null])

  const verdict = stage1Of(n)
  assert.equal(verdict.pass, true)
})

test('pay comes from the entry first, then a monthly stipend on the page, never the page at large', () => {
  const stipendPage = 'A three-month residency. Each resident receives $8,500 per month.'
  const fromPage = normaliseManual({ ...STEADRISE, kind: 'programme' }, stipendPage)
  assert.deepEqual([fromPage.salaryMin, fromPage.salaryCurrency, fromPage.salaryPeriod], [8500, 'USD', 'month'])

  const stated = normaliseManual({ ...STEADRISE, pay: '€2,000 per month' }, stipendPage)
  assert.deepEqual([stated.salaryMin, stated.salaryCurrency, stated.salaryPeriod], [2000, 'EUR', 'month'])

  // A job's page is not read for a stipend.
  const job = normaliseManual({ ...STEADRISE, kind: 'job' }, stipendPage)
  assert.equal(job.salaryMin, null)
})

test('an entry without a kind leaves it to the runner, and the summary leads the description', () => {
  const n = normaliseManual(
    { url: 'https://example.org/fellowship', title: 'Example Fellowship', employerName: 'Example', summary: 'Twelve weeks, paid.' },
    null,
  )
  assert.equal('listingKind' in n, false)
  assert.equal(n.description, 'Twelve weeks, paid.')
  assert.equal(n.locationRaw, null)
})

test('a Dutch location sets the country; a deadline closes at the end of its day', () => {
  const n = normaliseManual({ ...STEADRISE, location: 'Amsterdam, Netherlands', deadline: '2026-11-30' }, null)
  assert.equal(n.country, 'NL')
  assert.deepEqual(n.deadlineAt, new Date('2026-11-30T23:59:59Z'))
})

test('malformed entries are reported and skipped, not thrown', () => {
  assert.equal(manualEntryProblem(STEADRISE), null)
  assert.match(manualEntryProblem({ ...STEADRISE, title: ' ' })!, /title is required/)
  assert.match(manualEntryProblem({ ...STEADRISE, url: 'steadrise.org' })!, /url is not a valid URL/)
  assert.match(manualEntryProblem({ ...STEADRISE, applyUrl: 'mailto:hi@steadrise.org' })!, /applyUrl is not a web address/)
  assert.match(manualEntryProblem({ ...STEADRISE, kind: 'course' })!, /kind must be one of/)
  assert.match(manualEntryProblem({ ...STEADRISE, deadline: '30 Nov' })!, /deadline must be YYYY-MM-DD/)
  assert.match(manualEntryProblem({ ...STEADRISE, country: 'nl' })!, /two-letter/)

  const { entries, problems } = manualEntries({ listings: [STEADRISE, { url: 'https://x.org' }, 'nope'] })
  assert.equal(entries.length, 1)
  assert.deepEqual(problems, ['entry 1: title is required', 'entry 2: not an object'])
  assert.deepEqual(manualEntries({}), { entries: [], problems: [] })
})

test('seeding keeps entries added in the database, and the seed wins on the same URL', () => {
  const added = { url: 'https://example.org/job', title: 'Added by hand', employerName: 'Example' }
  const stale = { ...STEADRISE, url: 'https://steadrise.org/executive-catalyst/', title: 'Old title' }
  const merged = mergeManualListings([STEADRISE], [stale, added, { url: 'broken' }])
  assert.deepEqual(
    merged.map((e) => e.title),
    [STEADRISE.title, 'Added by hand'],
  )
  assert.deepEqual(mergeManualListings([STEADRISE], undefined), [STEADRISE])
})

test('the seeded manual source never claims a complete set, and every entry is valid', () => {
  const source = SEED_SOURCES.find((s) => s.adapter === 'manual')
  assert.ok(source)
  assert.equal(source.kind, 'manual')
  assert.equal(source.returnsCompleteSet, false)
  const { entries, problems } = manualEntries(source.config ?? {})
  assert.deepEqual(problems, [])
  assert.ok(entries.some((e) => e.employerName === 'SteadRise'))
})

test('through the runner: a manual programme is inserted, and leaving the list does not close it', async () => {
  const { getDb } = await import('../../db/client')
  const { migrate } = await import('../../db/migrate')
  const { runIngest } = await import('../run')
  const db = await getDb()
  await migrate(db)

  const other = { url: 'https://example.org/fellowship', title: 'Example Fellowship', employerName: 'Example' }
  // A fresh cache entry for each page, so the adapter never touches the network.
  const cache = Object.fromEntries(
    [STEADRISE, other].map((e) => [
      `programme-page:${new URL(e.url).origin}${new URL(e.url).pathname}`,
      { text: STEADRISE_PAGE, fetchedAt: Date.now() },
    ]),
  )
  const setListings = (listings: ManualListing[]) =>
    db.query(
      `insert into source (id, kind, adapter, config, returns_complete_set)
       values ('manual', 'manual', 'manual', $1::jsonb, false)
       on conflict (id) do update set config = excluded.config`,
      [JSON.stringify({ listings, __cache: cache })],
    )

  await setListings([STEADRISE, other])
  const first = await runIngest({ sourceIds: ['manual'] })
  assert.equal(first.results[0].ok, true, first.results[0].logs.join('\n'))
  assert.equal(first.totals.inserted + first.totals.updated, 2)

  const { rows } = await db.query<{ title: string; listing_kind: string; location_raw: string; description: string }>(
    `select title, listing_kind, location_raw, description from listing
      where source_id = 'manual' and external_id = 'https://steadrise.org/executive-catalyst'`,
  )
  assert.equal(rows[0].title, 'Executive Catalyst: Ops & Strategy')
  assert.equal(rows[0].listing_kind, 'programme')
  assert.equal(rows[0].location_raw, 'Remote')
  assert.match(rows[0].description, /No cost to you/)

  await setListings([STEADRISE])
  await runIngest({ sourceIds: ['manual'] })
  const { rows: open } = await db.query<{ external_id: string }>(
    `select external_id from listing where source_id = 'manual' and closed_at is null order by external_id`,
  )
  assert.deepEqual(
    open.map((r) => r.external_id),
    ['https://example.org/fellowship', 'https://steadrise.org/executive-catalyst'],
  )
})

test('the adapter is registered under the id the seed uses', async () => {
  const { getAdapter } = await import('../registry')
  assert.equal(getAdapter('manual'), manualListings)
})
