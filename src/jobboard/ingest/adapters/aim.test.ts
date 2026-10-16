/**
 * The AIM careers adapter, against fixtures cut from the live page, Drive
 * folder and PDFs as they stood in October 2026.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { nlEligible } from '../../classify/stage1'
import { TRIAGE_SYSTEM_PROMPT } from '../../classify/prompt'
import { aimCareerItems, aimCareers, aimPdfFacts, driveFolderFileIds } from './aim'

/** Squarespace HTML-escapes the section JSON into an attribute, and JSON-escapes the item HTML inside it. */
function squarespaceSection(items: unknown[]): string {
  const json = JSON.stringify({ userItems: items, layout: 'simple' })
  return `<section data-current-context="${json.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></section>`
}

const CAREERS_HTML = [
  // Other sections carry a context with no list in it.
  squarespaceSection([]).replace('userItems', 'video'),
  squarespaceSection([
    {
      title: 'Marketing & Content Associate',
      description:
        '<p><a href="https://drive.google.com/file/d/1EX01PpavM9VOSTEbVna4kfLFfXwEGWJD/view">View job description</a></p>',
      button: { buttonText: 'Apply here', buttonLink: 'https://tally.so/r/lbk8RN' },
    },
    {
      title: 'Various Research Roles',
      description:
        '<p><a href="https://drive.google.com/drive/folders/1uw3PDFXwA7cdZDIQZs9xaxCx3Wu3cR8e">View job descriptions</a></p>',
      button: { buttonText: 'Apply here', buttonLink: 'https://tally.so/r/lbJ4Wo' },
    },
    // A plain text item with no Drive link is not a role.
    { title: 'Not hiring for this', description: '<p>Check back soon.</p>', button: {} },
  ]),
].join('\n')

test('aimCareerItems reads titles, apply links and Drive ids from the section JSON', () => {
  const items = aimCareerItems(CAREERS_HTML)
  assert.equal(items.length, 2)
  assert.deepEqual(items[0], {
    title: 'Marketing & Content Associate',
    applyUrl: 'https://tally.so/r/lbk8RN',
    fileIds: ['1EX01PpavM9VOSTEbVna4kfLFfXwEGWJD'],
    folderIds: [],
  })
  assert.deepEqual(items[1].folderIds, ['1uw3PDFXwA7cdZDIQZs9xaxCx3Wu3cR8e'])
  assert.deepEqual(items[1].fileIds, [])
})

test('driveFolderFileIds lists the files in a folder, not the folder itself', () => {
  const html = `
    <div data-id="1uw3PDFXwA7cdZDIQZs9xaxCx3Wu3cR8e" data-target="folder"></div>
    <div data-id="1P0SFdqBHZCiQN38U8CHXHEnGh1N1yy_L" data-selection-key="0" data-target="doc" class="x"></div>
    <div data-id="1PPx8g4mB3s4cJAMykrT8lPtD9OmBLil3" data-selection-key="0" data-target="doc"></div>
    <div data-id="1PPx8g4mB3s4cJAMykrT8lPtD9OmBLil3" data-selection-key="0" data-target="doc"></div>`
  assert.deepEqual(driveFolderFileIds(html), [
    '1P0SFdqBHZCiQN38U8CHXHEnGh1N1yy_L',
    '1PPx8g4mB3s4cJAMykrT8lPtD9OmBLil3',
  ])
})

const RESEARCH_PDF = `Senior Research Manager, Animal Welfare
AIM is expanding its work in incubating animal welfare organisations.
Key Details
Capacity: Full-time
Location: London, United Kingdom (remote-friendly for the right candidate; visa sponsorship and
relocation support available).
Compensation: Based on needs and location; most of our salaries fall between £45,000–£90,000 (see
Remuneration Philosophy below).
Start date: ASAP.`

const FELLOW_PDF = `Visiting Research Fellow, Global Health &
Development
Global Health, Health Policy, Epidemiology, Medicine
Key Details
Location: In person preferred (London), Remote considered.
Duration: ~5 months, full-time (fixed-term contract)`

test('aimPdfFacts takes the title and the wrapped Key Details values', () => {
  const facts = aimPdfFacts(RESEARCH_PDF)
  assert.equal(facts.title, 'Senior Research Manager, Animal Welfare')
  assert.equal(
    facts.location,
    'London, United Kingdom (remote-friendly for the right candidate; visa sponsorship and relocation support available).',
  )
  assert.match(facts.compensation ?? '', /£45,000–£90,000 \(see Remuneration Philosophy below\)\.$/)
})

test('aimPdfFacts joins a title that wraps onto a second line', () => {
  const facts = aimPdfFacts(FELLOW_PDF)
  assert.equal(facts.title, 'Visiting Research Fellow, Global Health & Development')
  assert.equal(facts.location, 'In person preferred (London), Remote considered.')
  assert.equal(facts.compensation, null)
})

test('an AIM listing normalises to the PDF, in pounds, and passes the NL gate as remote', () => {
  const listing = aimCareers.normalise(
    {
      externalId: '1PPx8g4mB3s4cJAMykrT8lPtD9OmBLil3',
      payload: {
        fileId: '1PPx8g4mB3s4cJAMykrT8lPtD9OmBLil3',
        text: RESEARCH_PDF,
        applyUrl: 'https://tally.so/r/lbJ4Wo',
        pageTitle: 'Various Research Roles',
      },
    },
    { employerId: 'ambitious-impact', employerName: 'Ambitious Impact' },
  )
  assert.ok(listing)
  assert.equal(listing.title, 'Senior Research Manager, Animal Welfare')
  assert.equal(listing.employerId, 'ambitious-impact')
  // Two roles share one Tally form, so the form cannot be the apply URL: the
  // dedup key is built on it and would merge them.
  assert.equal(listing.applyUrl, 'https://drive.google.com/file/d/1PPx8g4mB3s4cJAMykrT8lPtD9OmBLil3/view')
  assert.match(listing.description ?? '', /Apply: https:\/\/tally\.so\/r\/lbJ4Wo$/)
  assert.equal(listing.salaryCurrency, 'GBP')
  assert.equal(listing.salaryMin, 45000)
  assert.equal(listing.salaryMax, 90000)
  assert.equal(listing.salaryPeriod, 'year')

  const gate = nlEligible({
    location_raw: listing.locationRaw,
    country: listing.country,
    title: listing.title,
    description: listing.description,
  })
  assert.equal(gate.eligible, true, gate.reason)
  assert.equal(
    nlEligible({ location_raw: aimPdfFacts(FELLOW_PDF).location, country: null, title: 'x', description: FELLOW_PDF })
      .eligible,
    true,
  )
})

test('the triage prompt keeps nationality requirements out of NL eligibility', () => {
  // Treating "Dutch nationality required" as ineligible dropped every ministry
  // internship, including the Foreign Ministry's AI-strategy placement.
  assert.match(TRIAGE_SYSTEM_PROMPT, /where the work can be done from/)
  assert.match(TRIAGE_SYSTEM_PROMPT, /requires Dutch nationality, a security screening, or Dutch language/)
  assert.match(TRIAGE_SYSTEM_PROMPT, /### Internships and traineeships/)
})
