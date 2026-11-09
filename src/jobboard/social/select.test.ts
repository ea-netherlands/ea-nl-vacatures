import assert from 'node:assert/strict'
import test from 'node:test'

import type { ListingView } from '../sanity/queries'
import { isFundingCall, nextPostTime, SELECTION, selectWeeklyJobs } from './select'

const POST = new Date('2026-11-10T08:00:00Z') // Tuesday 09:00 in Amsterdam
const days = (n: number) => new Date(POST.getTime() + n * 864e5).toISOString()

let n = 0
function listing(over: Partial<ListingView> = {}): ListingView {
  n++
  return {
    id: `l${n}`,
    slug: `l${n}`,
    title: `Role ${n}`,
    listingKind: 'job',
    programmeWeeks: null,
    applyUrl: 'https://example.org',
    whyThisMattersNl: null,
    whyThisMattersEn: null,
    excerpt: null,
    excerptEn: null,
    primaryCause: 'global-health-wellbeing',
    secondaryCauses: [],
    subArea: null,
    skills: [],
    leverage: 'trusted-recommendation',
    section: null,
    listedByEaBoard: null,
    locationCity: null,
    locationMode: 'remote',
    seniority: 'mid',
    languageRequirement: 'english-sufficient',
    workAuthorisation: null,
    securityScreening: null,
    securityNote: null,
    salaryText: null,
    salaryPeriod: null,
    mentions30PercentRuling: null,
    postedAt: days(-3),
    deadlineAt: null,
    expiresAt: null,
    pipelineListingId: null,
    employer: {
      id: `e${n}`,
      name: `Org ${n}`,
      slug: `org-${n}`,
      city: null,
      website: null,
      notEndorsement: null,
      e2gAllowlisted: null,
    },
    ...over,
  }
}

const causes = ['global-health-wellbeing', 'farmed-animal-welfare', 'global-catastrophic-risks'] as const
const spread = (count: number, over: Partial<ListingView> = {}) =>
  Array.from({ length: count }, (_, i) => listing({ primaryCause: causes[i % causes.length], ...over }))

test('takes at most seven roles', () => {
  const s = selectWeeklyJobs(spread(12), { postAt: POST })
  assert.equal(s.picks.length, SELECTION.max)
  assert.equal(s.runnersUp.length, 5)
  assert.equal(s.enough, true)
})

test('leaves out roles closing within two days of posting, keeps later ones', () => {
  const soon = listing({ deadlineAt: days(1) })
  const later = listing({ deadlineAt: days(3) })
  const s = selectWeeklyJobs([soon, later], { postAt: POST })
  assert.deepEqual(
    s.picks.map((p) => p.listing.id),
    [later.id],
  )
  assert.equal(s.skipped[0].reason, 'Closes too soon after posting')
})

test('one role per organisation', () => {
  const employer = listing().employer
  const s = selectWeeklyJobs([listing({ employer }), listing({ employer })], { postAt: POST })
  assert.equal(s.picks.length, 1)
  assert.equal(s.runnersUp.length, 1)
})

test('at most three roles on one problem area', () => {
  const s = selectWeeklyJobs(spread(5, { primaryCause: 'farmed-animal-welfare' }), { postAt: POST })
  assert.equal(s.picks.length, SELECTION.maxPerCause)
})

test('a way in gets a place even when vetted roles outscore it', () => {
  const vetted = spread(9, { deadlineAt: days(10) })
  const route = listing({ listingKind: 'programme', postedAt: days(-30) })
  const s = selectWeeklyJobs([...vetted, route], { postAt: POST })
  assert.equal(s.picks.length, SELECTION.max)
  assert.ok(s.picks.some((p) => p.listing.id === route.id))
  // ...but it doesn't jump the queue on the slides
  assert.equal(s.picks.at(-1)!.listing.id, route.id)
})

test('funding calls are not jobs', () => {
  const s = selectWeeklyJobs([listing({ title: 'Funding for Increasing Vaccine Impact' }), listing()], {
    postAt: POST,
  })
  assert.equal(s.picks.length, 1)
  assert.equal(s.skipped[0].reason, 'Funding call, not a job')
})

test('tells funding calls from jobs about funding (live titles, November 2026)', () => {
  const calls = [
    'Funding for Increasing Vaccine Impact',
    'Funding: Strep A/Rheumatic Heart Disease Vaccine Development',
    'Funding, AI Safety',
    'Seed Grants',
    'Research Grants',
    'Autumn Documentary Grant Cycle',
    'Career Transition Grants, AI Safety and Biosecurity',
    'Reporting Grants & Fellowships',
    'Request for Proposals: Project Tailwind',
  ]
  const jobs = [
    'Grants Associate',
    'Grants Associate, Grantmaking',
    'Program Lead, Career Transition Grants',
    'Technical Grant Writer',
    'Senior AI Governance Grantmaker',
    'Grantmaker-In-Residence',
    'Call for expressions of interest: GPPAC Board Member',
    'Open Call for Consultants, Health Policy Advocacy and Communications',
  ]
  for (const title of calls) assert.equal(isFundingCall(title), true, title)
  for (const title of jobs) assert.equal(isFundingCall(title), false, title)
})

test('at most two ways in', () => {
  const s = selectWeeklyJobs(spread(4, { listingKind: 'programme' }), { postAt: POST })
  assert.equal(s.picks.filter((p) => p.band === 'routes').length, SELECTION.maxRoutes)
})

test('skips roles featured recently and earning-to-give roles', () => {
  const featured = listing()
  const e2g = listing({ leverage: 'earning-to-give' })
  const s = selectWeeklyJobs([featured, e2g], { postAt: POST, recentlyFeatured: new Set([featured.id]) })
  assert.equal(s.picks.length, 0)
  assert.equal(s.enough, false)
  assert.deepEqual(
    s.skipped.map((x) => x.reason).sort(),
    ['Earning to give', `Featured in the last ${SELECTION.repeatWeeks} weeks`],
  )
})

test('vetted roles closing soon lead; Dutch-only roles come last', () => {
  const dutch = listing({ leverage: 'policy-regulation', primaryCause: 'farmed-animal-welfare' })
  const dutchOnly = listing({ languageRequirement: 'dutch-required', primaryCause: 'global-catastrophic-risks' })
  const closing = listing({ deadlineAt: days(10) })
  const s = selectWeeklyJobs([dutch, dutchOnly, closing], { postAt: POST })
  assert.deepEqual(
    s.picks.map((p) => p.listing.id),
    [closing.id, dutch.id, dutchOnly.id],
  )
})

test('the post goes out on the next Tuesday at 09:00 Amsterdam time', () => {
  // Monday 9 November 2026, midday: tomorrow, 08:00 UTC (winter time)
  assert.equal(nextPostTime(new Date('2026-11-09T11:00:00Z')).toISOString(), '2026-11-10T08:00:00.000Z')
  // Tuesday at 10:00 Amsterdam: already gone, so a week later
  assert.equal(nextPostTime(new Date('2026-11-10T09:00:00Z')).toISOString(), '2026-11-17T08:00:00.000Z')
  // Summer time: 07:00 UTC
  assert.equal(nextPostTime(new Date('2026-06-01T12:00:00Z')).toISOString(), '2026-06-02T07:00:00.000Z')
})
