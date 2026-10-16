/**
 * Probably Good, against a record cut from their Algolia index in October 2026.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { probablyGood, probablyGoodKind } from './ea-boards'

test('the persisted AlgoliaSearchKey query matches the one their front end sends', () => {
  // Their server matches the query text byte-for-byte. It dropped ours from
  // the whitelist when this field was added, and the source failed silently
  // for weeks with "no algolia_search_key".
  const source = readFileSync(new URL('./ea-boards.ts', import.meta.url), 'utf8')
  assert.match(source, /index_name_jobs_sorted_by_closes_at\n {8}jobs_object_id_field\n {6}\}/)
})

const GENERATOR_HIT = {
  objectID: 'generator-residency-kairos-project',
  title: 'Generator Residency',
  url_external: 'https://generatorresidency.org/',
  description:
    'A three-month residency for AI safety generalists to pitch, build, and ship projects with mentorship from experienced practitioners.\n- Receive $8,500 monthly stipend, office access at Constellation, and generous project budgets to execute and deliver outcomes.',
  salary_text: '',
  closes_at_unix: 1793516400,
  published_at_unix: 1792102643.611399,
  org: { name: 'Kairos Project' },
  tags_workload: [{ name: 'Fellowship' }],
  locations: [
    { algolia_filter_name: '[city] Berkeley CA, USA' },
    { algolia_filter_name: '[country] USA' },
  ],
}

test('a Probably Good fellowship normalises as a programme with its stipend', () => {
  assert.equal(probablyGoodKind(GENERATOR_HIT), 'programme')
  assert.equal(probablyGoodKind({ tags_workload: [{ name: 'Full-Time' }] }), 'job')

  const listing = probablyGood.normalise({ externalId: GENERATOR_HIT.objectID, payload: GENERATOR_HIT }, {})
  assert.ok(listing)
  assert.equal(listing.listingKind, 'programme')
  assert.equal(listing.employerName, 'Kairos Project')
  assert.equal(listing.locationRaw, 'Berkeley CA, USA, USA')
  assert.equal(listing.salaryMin, 8500)
  assert.equal(listing.salaryPeriod, 'month')
  assert.equal(listing.postedAt?.getUTCFullYear(), 2026)
})
