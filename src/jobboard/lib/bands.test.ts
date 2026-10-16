/**
 * The three bands, against listings shaped like the live board in October 2026.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { BANDS, bandOf, isBand, splitIntoBands } from './bands'

type Shape = Parameters<typeof bandOf>[0]
const listing = (over: Partial<Shape> = {}): Shape => ({
  title: 'Beleidsmedewerker',
  listingKind: 'job',
  seniority: 'mid',
  leverage: 'policy-regulation',
  ...over,
})

test('the bands display vetted first, then ways in, then Dutch', () => {
  assert.deepEqual([...BANDS], ['vetted', 'routes', 'dutch'])
})

test('a way in is a way in wherever it is, even at a vetted organisation', () => {
  assert.equal(
    bandOf(
      listing({
        title: 'Generator Residency',
        listingKind: 'programme',
        leverage: 'trusted-recommendation',
      }),
    ),
    'routes',
  )
  assert.equal(
    bandOf(listing({ title: 'Stage bij de Directie Veiligheidsbeleid', seniority: 'internship' })),
    'routes',
  )
  assert.equal(bandOf(listing({ title: 'BoFEB trainee', seniority: 'entry' })), 'routes')
  assert.equal(bandOf(listing({ title: 'Rijkstraineeship 2027', seniority: 'entry' })), 'routes')
  assert.equal(bandOf(listing({ leverage: 'career-capital' })), 'routes')
})

test('ordinary entry-level jobs stay with their organisation', () => {
  assert.equal(
    bandOf(
      listing({
        title: 'Marketing & Content Associate',
        seniority: 'entry',
        leverage: 'trusted-recommendation',
      }),
    ),
    'vetted',
  )
  assert.equal(
    bandOf(
      listing({
        title: 'Investment Analist Energy Ventures',
        seniority: 'entry',
        leverage: 'capital-allocation',
      }),
    ),
    'dutch',
  )
})

test('splitIntoBands keeps the list order inside each band', () => {
  const a = listing({ title: 'A', leverage: 'trusted-recommendation' })
  const b = listing({ title: 'B' })
  const c = listing({ title: 'C', leverage: 'trusted-recommendation' })
  const split = splitIntoBands([a, b, c])
  assert.deepEqual(
    split.vetted.map((l) => l.title),
    ['A', 'C'],
  )
  assert.deepEqual(
    split.dutch.map((l) => l.title),
    ['B'],
  )
  assert.deepEqual(split.routes, [])
})

test('isBand accepts the three bands and nothing else, so a stray ?band= cannot empty the list', () => {
  for (const b of BANDS) assert.equal(isBand(b), true)
  assert.equal(isBand('nonsense'), false)
  assert.equal(isBand(undefined), false)
})
