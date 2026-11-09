import assert from 'node:assert/strict'
import test from 'node:test'

import type { ListingView } from '../sanity/queries'
import { compose, tagged } from './captions'

const listing = (title: string, org: string, slug: string) =>
  ({ id: slug, slug, title, employer: { name: org } }) as unknown as ListingView

const jobs = [listing('Project Manager', 'AVA International', 'ava-pm'), listing('Research Scientist', 'FutureSearch', 'fs-rs')]
const parts = { hook: 'Seven jobs you can do from the Netherlands.', closing: 'Want these monthly?', hashtags: ['#impactjobs', 'effective altruism'] }

test('links are tagged with platform, post and account', () => {
  const ig = new URL(tagged('https://effectiefaltruisme.nl/en/jobs/x', 'instagram', '2026-11-10'))
  assert.equal(ig.searchParams.get('utm_source'), 'instagram')
  assert.equal(ig.searchParams.get('utm_medium'), 'social')
  assert.equal(ig.searchParams.get('utm_campaign'), 'jobs-2026-11-10')
  assert.equal(ig.searchParams.get('utm_content'), null)
  const james = new URL(tagged('https://effectiefaltruisme.nl/en/newsletter', 'linkedinPersonal', '2026-11-10'))
  assert.equal(james.searchParams.get('utm_source'), 'linkedin')
  assert.equal(james.searchParams.get('utm_content'), 'james')
})

test('Instagram lists the jobs without links and keeps the hashtags', () => {
  const text = compose('instagram', parts, jobs, '2026-11-10')
  assert.match(text, /^Seven jobs you can do from the Netherlands\.\n\n• Project Manager, AVA International\n• Research Scientist, FutureSearch\n\nWant these monthly\?/)
  assert.doesNotMatch(text, /https?:\/\//)
  assert.match(text, /#impactjobs #effectivealtruism$/)
})

test('LinkedIn numbers the jobs with tagged links and ends with the sign-up link', () => {
  const text = compose('linkedinOrg', { ...parts, hashtags: [] }, jobs, '2026-11-10')
  assert.match(text, /1\. Project Manager, AVA International\nhttps:\/\/effectiefaltruisme\.nl\/en\/jobs\/ava-pm\?utm_source=linkedin/)
  assert.match(text, /Want these monthly\?\n\nhttps:\/\/effectiefaltruisme\.nl\/en\/newsletter\?utm_source=linkedin.*utm_content=ean$/)
})

test('a title that already names the organisation does not repeat it', () => {
  const text = compose('instagram', parts, [listing('Director of Partnerships at Taimaka', 'Taimaka', 't')], '2026-11-10')
  assert.match(text, /• Director of Partnerships at Taimaka\n/)
})

test('a themed LinkedIn caption links to the theme on the board, keeping "AI" in capitals', () => {
  const text = compose('linkedinOrg', { ...parts, hashtags: [] }, jobs, '2026-11-17', 'ai-safety')
  assert.match(text, /More roles in AI safety and catastrophic risks: https:\/\/effectiefaltruisme\.nl\/en\/jobs\?cause=global-catastrophic-risks&utm_source=linkedin/)
  assert.doesNotMatch(compose('instagram', parts, jobs, '2026-11-17', 'ai-safety'), /More roles/)
})

test('a programme abroad says how long, so it does not read as a move', async () => {
  const { jobFacts, stint } = await import('./content')
  assert.equal(stint(4), '4 weeks')
  assert.equal(stint(13), '3 months')
  assert.equal(stint(26), '6 months')
  const where = (over: Partial<ListingView>) =>
    jobFacts({ ...jobs[0], locationMode: 'temporary-abroad', salaryText: null, deadlineAt: null, subArea: null, primaryCause: null, languageRequirement: null, ...over } as ListingView).find((f) => f.icon === 'map-pin')?.text
  assert.equal(where({ locationCity: 'London', programmeWeeks: 13 }), 'London, for 3 months')
  assert.equal(where({ locationCity: 'Washington', programmeWeeks: null }), 'Washington, temporarily')
})
