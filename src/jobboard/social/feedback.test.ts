import assert from 'node:assert/strict'
import test from 'node:test'

import type { ListingView } from '../sanity/queries'
import { applyChoice, feedbackPool, POOL_SIZE } from './feedback'
import { SELECTION, selectWeeklyJobs, type Pick } from './select'

const POST = new Date('2026-11-17T08:00:00Z')

let n = 0
function pick(over: Partial<ListingView> = {}, score = 1): Pick {
  n++
  const listing = {
    id: `l${n}`,
    title: `Role ${n}`,
    employer: { id: `e${n}`, name: `Org ${n}` },
    ...over,
  } as ListingView
  return { listing, band: 'vetted', score, reasons: [] }
}

test('the model can only choose from the pool', () => {
  const pool = [pick(), pick(), pick()]
  const chosen = applyChoice(pool, ['made-up', pool[2].listing.id, pool[0].listing.id])
  assert.deepEqual(chosen.map((p) => p.listing.id), [pool[2].listing.id, pool[0].listing.id])
})

test('feedback picks keep one role per organisation, one funding call and the maximum', () => {
  const sameOrg = { id: 'e-same', name: 'Same Org (Amsterdam)' } as ListingView['employer']
  const a = pick({ employer: sameOrg })
  const b = pick({ employer: { ...sameOrg!, id: 'e-other', name: 'Same Org' } })
  const f1 = pick({ title: 'Request for Proposals: Something' })
  const f2 = pick({ title: 'Seed Grants' })
  const rest = Array.from({ length: 10 }, () => pick())
  const pool = [a, b, f1, f2, ...rest]
  const chosen = applyChoice(pool, pool.map((p) => p.listing.id))
  const ids = chosen.map((p) => p.listing.id)
  assert.ok(ids.includes(a.listing.id) && !ids.includes(b.listing.id))
  assert.ok(ids.includes(f1.listing.id) && !ids.includes(f2.listing.id))
  assert.equal(chosen.length, SELECTION.max)
})

test('the pool keeps the current draft even when it falls outside the top', () => {
  const many = Array.from({ length: POOL_SIZE + 5 }, (_, i) => pick({}, 1000 - i))
  const last = many[many.length - 1]
  const selection = { ...selectWeeklyJobs([], { postAt: POST }), picks: [], runnersUp: many }
  const pool = feedbackPool(selection, [last.listing.id])
  assert.equal(pool.length, POOL_SIZE + 1)
  assert.ok(pool.some((p) => p.listing.id === last.listing.id))
})
