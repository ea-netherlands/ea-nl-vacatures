import assert from 'node:assert/strict'
import test from 'node:test'

import { aacMayBeNlEligible, animalAdvocacyCareers, type AacJob } from './animal-advocacy-careers'

const job = (over: Partial<AacJob> = {}): AacJob => ({
  id: 51499,
  date_gmt: '2026-11-03T11:38:20',
  link: 'https://animaladvocacycareers.org/job/head-of-programmes/',
  title: { rendered: 'Head of Programmes &#8211; Europe' },
  content: { rendered: '<p>We&#8217;re hiring.</p>' },
  meta: {
    _application: '',
    _company_name: 'The Humane League',
    _company_website: 'https://joinus.thehumaneleague.org.uk/jobs/8635322-head-of-programmes?utm_source=aac',
    _job_location: 'United Kingdom',
    _job_salary: '£64,582 or £71,041',
  },
  class_list: ['job_listing', 'job_listing_location-united-kingdom', 'job_remote-remote'],
  ...over,
})

test('keeps NL, worldwide and European remote roles; drops on-site abroad and US-only remote', () => {
  assert.equal(aacMayBeNlEligible(job()), true)
  assert.equal(aacMayBeNlEligible(job({ class_list: ['job_listing_location-netherlands', 'job_remote-on-site'] })), true)
  assert.equal(aacMayBeNlEligible(job({ class_list: ['job_listing_location-worldwide', 'job_remote-remote'] })), true)
  assert.equal(aacMayBeNlEligible(job({ class_list: ['job_listing_location-germany', 'job_remote-hybrid'] })), false)
  assert.equal(aacMayBeNlEligible(job({ class_list: ['job_listing_location-united-states', 'job_remote-remote'] })), false)
})

test('the apply URL is the outbound role link, not the AAC page', () => {
  const n = animalAdvocacyCareers.normalise({ externalId: '51499', payload: job() }, {})!
  assert.equal(n.employerName, 'The Humane League')
  assert.equal(n.title, 'Head of Programmes – Europe')
  assert.match(n.applyUrl, /^https:\/\/joinus\.thehumaneleague\.org\.uk\/jobs\/8635322-head-of-programmes/)
  assert.doesNotMatch(n.applyUrl, /utm_/)
  assert.equal(n.locationRaw, 'United Kingdom, Remote')
  assert.equal(n.salaryCurrency, 'GBP')
  assert.equal(n.postedAt?.toISOString(), '2026-11-03T11:38:20.000Z')
})

test('falls back to the AAC page when no outbound link is given', () => {
  const n = animalAdvocacyCareers.normalise(
    { externalId: '1', payload: job({ meta: { _company_name: 'X', _company_website: '' } }) },
    {},
  )!
  assert.equal(n.applyUrl, 'https://animaladvocacycareers.org/job/head-of-programmes')
})
