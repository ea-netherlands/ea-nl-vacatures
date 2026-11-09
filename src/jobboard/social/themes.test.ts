import assert from 'node:assert/strict'
import test from 'node:test'

import { themeForWeek } from './themes'

const tuesday = (iso: string) => new Date(`${iso}T08:00:00Z`)

test('the rotation: AI safety, ways in, the Netherlands, then global health or animals', () => {
  assert.equal(themeForWeek(tuesday('2026-11-10')), 'mixed') // before the first themed week
  assert.deepEqual(
    ['2026-11-17', '2026-11-24', '2026-12-01', '2026-12-08', '2026-12-15', '2026-12-22', '2026-12-29', '2027-01-05'].map(
      (d) => themeForWeek(tuesday(d)),
    ),
    ['ai-safety', 'ways-in', 'netherlands', 'global-health', 'ai-safety', 'ways-in', 'netherlands', 'animals'],
  )
})

test('summer time does not shift the rotation', () => {
  // 09:00 Amsterdam is 07:00 UTC in summer; 2027-06-01 is week 28 from the anchor
  assert.equal(themeForWeek(new Date('2027-06-01T07:00:00Z')), 'ai-safety')
})
