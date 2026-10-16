/**
 * The short-programme rule. Most of the phrasings here are cut from real
 * programme ads on the EA Opportunities board, October 2026.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { earningToGiveEligible } from '../taxonomy/gates'
import {
  looksLikeProgramme,
  mergeTerms,
  programmePaid,
  programmeTravelCovered,
  programmeWeeks,
  shortProgrammeVerdict,
} from './programme'
import { TRIAGE_SCHEMA } from './schema'

test('programmeWeeks reads the length of the programme and nothing else', () => {
  assert.equal(programmeWeeks('A three-month residency for AI safety generalists.'), 13)
  assert.equal(programmeWeeks('The core residency runs for 12 weeks.'), 12)
  assert.equal(programmeWeeks('Duration: ~5 months, full-time (fixed-term contract)'), 22)
  assert.equal(programmeWeeks('An eight-day program in Washington, DC.'), null)
  // The whole programme, not its first part.
  assert.equal(programmeWeeks('A two-week orientation, then a five-month placement.'), 22)
  assert.equal(programmeWeeks('This two-year fellowship (2027–2029) places fellows in litigation.'), 104)
  // Durations that are not the programme's.
  assert.equal(programmeWeeks('We aim to reply within two weeks of the deadline.'), null)
  assert.equal(programmeWeeks('Fellowship applicants need six months of experience in policy.'), null)
  assert.equal(programmeWeeks('Fellowship open to those aged 18 years and over.'), null)
  // Short and long durations on one page: the text cannot decide, the classifier reads it.
  assert.equal(
    programmeWeeks('A 15-week research fellowship in London. Alumni of the programme stayed on for 15 months.'),
    null,
  )
  assert.equal(programmeWeeks('A one-year fellowship, with a 12-month extension programme.'), 52)
})

test('programmePaid and programmeTravelCovered say false only when the ad does', () => {
  assert.equal(programmePaid('Each resident receives a fellowship stipend of $8,500 per month.'), true)
  assert.equal(programmePaid('Receive $8,500 monthly stipend and office access.'), true)
  assert.equal(programmePaid('Fellows are paid EUR 5,000/month.'), true)
  assert.equal(programmePaid('This is an unpaid fellowship.'), false)
  assert.equal(programmePaid('A free, part-time online course.'), null)

  assert.equal(programmeTravelCovered('Kairos also covers travel to and from Berkeley.'), true)
  assert.equal(programmeTravelCovered('Flights and accommodation are provided.'), true)
  assert.equal(programmeTravelCovered('We reimburse economy flights to London.'), true)
  assert.equal(programmeTravelCovered('Travel is not covered.'), false)
  assert.equal(programmeTravelCovered('Participants attend at their own expense.'), false)
  assert.equal(programmeTravelCovered('Office access at Constellation.'), null)
})

test('the rule: six months or less and paid — and anything unknown is undecided', () => {
  assert.equal(shortProgrammeVerdict({ weeks: 13, paid: true, travelCovered: true }).eligible, true)
  assert.equal(shortProgrammeVerdict({ weeks: 26, paid: true, travelCovered: null }).eligible, true)
  assert.equal(shortProgrammeVerdict({ weeks: 27, paid: true, travelCovered: true }).eligible, false)
  assert.equal(shortProgrammeVerdict({ weeks: 104, paid: null, travelCovered: null }).eligible, false)
  assert.equal(shortProgrammeVerdict({ weeks: 13, paid: false, travelCovered: true }).eligible, false)

  // Travel is recorded, not required.
  const noTravel = shortProgrammeVerdict({ weeks: 13, paid: true, travelCovered: false })
  assert.equal(noTravel.eligible, true)
  assert.match(noTravel.reason, /travel not covered/)

  const undecided = shortProgrammeVerdict({ weeks: 13, paid: null, travelCovered: true })
  assert.equal(undecided.eligible, null)
  assert.match(undecided.reason, /does not state pay$/)
})

test('the classifier only fills gaps; what the ad text says wins', () => {
  assert.deepEqual(
    mergeTerms({ weeks: 13, paid: null, travelCovered: null }, { weeks: 52, paid: true, travelCovered: true }),
    { weeks: 13, paid: true, travelCovered: true },
  )
  // Still undecided after both reads → the run treats it as not eligible.
  const merged = mergeTerms({ weeks: null, paid: null, travelCovered: null }, { weeks: null, paid: true, travelCovered: null })
  assert.equal(shortProgrammeVerdict(merged).eligible, null)
})

test('looksLikeProgramme is narrow: a fellowship yes, a research fellow no', () => {
  assert.equal(looksLikeProgramme('AI Safety Research Fellowship'), true)
  assert.equal(looksLikeProgramme('Generator Residency'), true)
  assert.equal(looksLikeProgramme('ML Bootcamp (ARENA 7.0)'), true)
  assert.equal(looksLikeProgramme('Senior Research Fellow, Infectious Disease Modelling'), false)
  assert.equal(looksLikeProgramme('Grantmaker-In-Residence'), false)
})

test('a programme never clears the earning-to-give gate, whatever it pays', () => {
  const employer = { e2g_allowlisted: true, e2g_salary_presumed: true, recommender_allowlisted: false }
  const listing = { salary_max: 120_000, salary_currency: 'EUR' }
  assert.equal(earningToGiveEligible(employer, listing, 'job'), true)
  assert.equal(earningToGiveEligible(employer, listing, 'programme'), false)
})

test('the triage schema asks for the kind and the three programme facts', () => {
  for (const field of ['listingKind', 'programmeWeeks', 'programmePaid', 'programmeTravelCovered']) {
    assert.ok((TRIAGE_SCHEMA.required as readonly string[]).includes(field), field)
  }
})
