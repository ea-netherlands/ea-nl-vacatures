/**
 * Tests for the deterministic core of the pipeline.
 *
 * These cover the parts that decide what reaches a curator without any model
 * involved: the Netherlands-eligibility filter, the two mechanical gates, and
 * deduplication. Getting any of them wrong is a silent failure — an
 * over-eager NL filter empties the board, a leaky gate erodes a category, and a
 * false dedup merge hides a real job.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { nlEligible, stage1 } from './classify/stage1'
import {
  climateAllowed,
  earningToGiveEligible,
  enforceGates,
  allowedCauseAreas,
  allowedLeverageTypes,
  E2G_SALARY_FLOOR,
  type EmployerGateFlags,
} from './taxonomy/gates'
import { computeDedupKey, looksLikeSameRole, pickCanonical, titleSimilarity } from './ingest/dedup'
import {
  canonicaliseUrl,
  decodeEntities,
  htmlToText,
  mentions30PercentRuling,
  parseLocaleNumber,
  parseSalaryText,
  urlWithoutQuery,
} from './lib/text'
import { splitStatements } from './db/migrate'
import { detectAts } from './ingest/adapters/ea-boards'
import { orgCodeFromUrl, extractWvnBody } from './ingest/adapters/dutch'
import { extractJsonLd, findJobPosting } from './ingest/adapters/jsonld'
import { meetsPromotionThreshold } from './taxonomy'
import { firstLine } from './lib/note'

const noFlags: EmployerGateFlags = {
  giving_green_listed: false,
  climate_exception: false,
  e2g_allowlisted: false,
  e2g_salary_presumed: false,
}

// ---------------------------------------------------------------------------
// Stage one: the Netherlands filter (§8.1)
// ---------------------------------------------------------------------------

test('nlEligible accepts Dutch locations and NL-eligible remote wordings', () => {
  const cases = [
    { location_raw: 'Den Haag', country: null },
    { location_raw: 'Amsterdam, Netherlands', country: null },
    { location_raw: null, country: 'NL' },
    { location_raw: 'Remote (Europe)', country: null },
    { location_raw: 'Remote, Global', country: null },
    { location_raw: 'Home-based', country: null },
    { location_raw: 'Bilthoven', country: null },
    { location_raw: 'Wageningen', country: null },
  ]
  for (const c of cases) {
    const verdict = nlEligible({ ...c, title: 'Policy officer', description: 'x'.repeat(400) })
    assert.equal(verdict.eligible, true, `expected eligible: ${JSON.stringify(c)} — ${verdict.reason}`)
  }
})

test('nlEligible rejects roles a Netherlands resident could not hold', () => {
  const cases = [
    { location_raw: 'San Francisco, CA', country: 'US' },
    { location_raw: 'Remote (US)', country: null },
    { location_raw: 'London', country: 'GB' },
    { location_raw: 'Remote — must be based in the US', country: null },
    { location_raw: 'Bangalore', country: 'IN' },
  ]
  for (const c of cases) {
    const verdict = nlEligible({ ...c, title: 'Engineer', description: 'x'.repeat(400) })
    assert.equal(verdict.eligible, false, `expected ineligible: ${JSON.stringify(c)}`)
  }
})

test('nlEligible does not let a boilerplate office mention rescue a US role', () => {
  // A tail like "we have offices in Amsterdam" must not make a US-located role
  // NL-eligible, which is why only the opening of the body is consulted.
  const verdict = nlEligible({
    location_raw: 'New York, NY',
    country: 'US',
    title: 'Program Associate',
    description: `${'Something about the role. '.repeat(60)} We also have offices in Amsterdam.`,
  })
  assert.equal(verdict.eligible, false)
})

test('nlEligible defers rather than dropping an 80k-style stub with no location', () => {
  // 80k carries no description and often no city; its ATS twin supplies both.
  // Dropping these would lose real roles.
  const verdict = nlEligible({
    location_raw: null,
    country: null,
    title: 'Investment Officer',
    description: null,
  })
  assert.equal(verdict.eligible, true)
})

test('stage1 holds a listing with too little text to classify', () => {
  const verdict = stage1({
    id: 1,
    title: 'Beleidsmedewerker',
    employer_name: 'Ministerie van EZK',
    location_raw: 'Den Haag',
    country: 'NL',
    description: 'Te kort.',
    salary_max: null,
    salary_currency: null,
    employer: noFlags,
  })
  assert.equal(verdict.pass, false)
  assert.match(verdict.pass === false ? verdict.reason : '', /too short/)
})

test('stage1 passes a real Dutch government listing and withholds gated labels', () => {
  const verdict = stage1({
    id: 2,
    title: 'Beleidsmedewerker kernenergie',
    employer_name: 'Ministerie van EZK',
    location_raw: 'Den Haag',
    country: 'NL',
    description: 'Dit ga je doen. '.repeat(40),
    salary_max: null,
    salary_currency: null,
    employer: noFlags,
  })
  assert.equal(verdict.pass, true)
  if (verdict.pass) {
    // The employer cleared neither gate, so neither label is on the menu.
    assert.ok(!verdict.allowedCauses.includes('climate'))
    assert.ok(!verdict.allowedLeverage.includes('earning-to-give'))
    assert.ok(verdict.allowedCauses.includes('ai-safety-governance'))
  }
})

// ---------------------------------------------------------------------------
// The climate gate (§5.1) — mechanical, never a judgement call
// ---------------------------------------------------------------------------

test('climate requires a Giving Green listing or an explicit manual exception', () => {
  assert.equal(climateAllowed(noFlags), false)
  assert.equal(climateAllowed(null), false)
  assert.equal(climateAllowed({ ...noFlags, giving_green_listed: true }), true)
  assert.equal(climateAllowed({ ...noFlags, climate_exception: true }), true)
})

test('climate is absent from the allowed causes unless the gate is cleared', () => {
  assert.ok(!allowedCauseAreas(noFlags).includes('climate'))
  assert.ok(allowedCauseAreas({ ...noFlags, giving_green_listed: true }).includes('climate'))
})

test('enforceGates strips a leaked climate label and reports it', () => {
  // A model told not to use a label will occasionally use it anyway, and this is
  // the one category where a single leak starts an erosion (§8.1).
  const result = enforceGates(
    { primaryCause: 'climate', secondaryCauses: ['climate', 'global-health-development'], leverage: 'direct-work' },
    noFlags,
    { salary_max: null, salary_currency: null },
  )
  assert.equal(result.primaryCause, null)
  assert.deepEqual(result.secondaryCauses, ['global-health-development'])
  assert.equal(result.leverage, 'direct-work')
  assert.equal(result.violations.length, 2)
})

test('enforceGates leaves a legitimately gated climate label alone', () => {
  const result = enforceGates(
    { primaryCause: 'climate', secondaryCauses: [], leverage: 'field-building' },
    { ...noFlags, giving_green_listed: true },
    { salary_max: null, salary_currency: null },
  )
  assert.equal(result.primaryCause, 'climate')
  assert.equal(result.violations.length, 0)
})

// ---------------------------------------------------------------------------
// The earning-to-give gate (§5.3) — allowlist AND salary floor
// ---------------------------------------------------------------------------

test('earning to give needs the allowlist, not just a high salary', () => {
  assert.equal(
    earningToGiveEligible(noFlags, { salary_max: 250_000, salary_currency: 'EUR' }),
    false,
    'a high salary at a non-allowlisted employer must not qualify',
  )
})

test('earning to give needs the salary floor, not just the allowlist', () => {
  const allowlisted = { ...noFlags, e2g_allowlisted: true }
  assert.equal(
    earningToGiveEligible(allowlisted, { salary_max: E2G_SALARY_FLOOR - 1, salary_currency: 'EUR' }),
    false,
  )
  assert.equal(
    earningToGiveEligible(allowlisted, { salary_max: E2G_SALARY_FLOOR, salary_currency: 'EUR' }),
    true,
  )
})

test('e2g_salary_presumed covers the trading firms that publish no numbers', () => {
  const presumed = { ...noFlags, e2g_allowlisted: true, e2g_salary_presumed: true }
  assert.equal(earningToGiveEligible(presumed, { salary_max: null, salary_currency: null }), true)
})

test('a salary floor in euros is not compared against another currency', () => {
  // Without an FX rate we deliberately do not carry, a USD figure above the
  // euro floor is not evidence of anything.
  const allowlisted = { ...noFlags, e2g_allowlisted: true }
  assert.equal(
    earningToGiveEligible(allowlisted, { salary_max: E2G_SALARY_FLOOR + 50_000, salary_currency: 'USD' }),
    false,
  )
})

test('earning-to-give is absent from allowed leverage unless the gate is cleared', () => {
  assert.ok(!allowedLeverageTypes(noFlags, { salary_max: null, salary_currency: null }).includes('earning-to-give'))
  assert.ok(
    allowedLeverageTypes(
      { ...noFlags, e2g_allowlisted: true, e2g_salary_presumed: true },
      { salary_max: null, salary_currency: null },
    ).includes('earning-to-give'),
  )
})

// ---------------------------------------------------------------------------
// Promotion threshold (§8.3)
// ---------------------------------------------------------------------------

test('promotion needs total >= 4 AND cause >= 2', () => {
  assert.equal(meetsPromotionThreshold(2, 2), true)
  assert.equal(meetsPromotionThreshold(3, 1), true)
  assert.equal(meetsPromotionThreshold(2, 1), false, 'total 3 is a near miss, not a promotion')
  // The cause condition is what stops a high-leverage role in an irrelevant
  // field sneaking through.
  assert.equal(meetsPromotionThreshold(1, 3), false)
})

// ---------------------------------------------------------------------------
// Deduplication (§7.7)
// ---------------------------------------------------------------------------

test('UTM-tagged 80k links collide with the direct ATS listing', () => {
  // This is the case the spec singles out: 80k links to the employer ATS URL we
  // already poll, with tracking params appended.
  const direct = computeDedupKey({
    applyUrl: 'https://job-boards.greenhouse.io/anthropic/jobs/5343907008',
    title: 'Research Engineer',
    employerId: 'anthropic',
    employerName: 'Anthropic',
  })
  const viaEightyK = computeDedupKey({
    applyUrl: 'https://job-boards.greenhouse.io/anthropic/jobs/5343907008?utm_source=80000hours&gh_src=abc',
    title: '  Research Engineer  ',
    employerId: 'anthropic',
    employerName: 'Anthropic',
  })
  assert.equal(direct, viaEightyK)
})

test('different roles at the same employer do not collide', () => {
  const a = computeDedupKey({
    applyUrl: 'https://example.com/jobs/1',
    title: 'Programme Officer',
    employerId: 'adessium',
    employerName: 'Adessium',
  })
  const b = computeDedupKey({
    applyUrl: 'https://example.com/jobs/2',
    title: 'Grants Administrator',
    employerId: 'adessium',
    employerName: 'Adessium',
  })
  assert.notEqual(a, b)
})

test('unmapped employers still collide via a normalised name', () => {
  const a = computeDedupKey({
    applyUrl: 'https://example.com/jobs/1',
    title: 'Analyst',
    employerId: null,
    employerName: 'Rabobank',
  })
  const b = computeDedupKey({
    applyUrl: 'https://example.com/jobs/1',
    title: 'Analyst',
    employerId: null,
    employerName: '  rabobank ',
  })
  assert.equal(a, b)
})

test('fuzzy matching stays conservative', () => {
  // A false merge hides a real job, which is worse than a duplicate a curator
  // deletes in two seconds.
  const base = { employerId: 'wur', employerName: 'WUR' }
  assert.equal(
    looksLikeSameRole({ ...base, title: 'PhD Position in Plant Sciences' }, { ...base, title: 'PhD position in plant sciences' }),
    true,
  )
  assert.equal(
    looksLikeSameRole({ ...base, title: 'PhD Position in Plant Sciences' }, { ...base, title: 'PhD Position in Animal Sciences' }),
    false,
  )
  assert.equal(
    looksLikeSameRole(
      { employerId: 'a', employerName: 'A', title: 'Policy Officer' },
      { employerId: 'b', employerName: 'B', title: 'Policy Officer' },
    ),
    false,
    'same title at different employers is not the same role',
  )
})

test('titleSimilarity is order-insensitive', () => {
  assert.equal(titleSimilarity('Senior Policy Officer', 'Policy Officer Senior'), 1)
})

test('pickCanonical prefers a direct ATS row with a description', () => {
  const rows = [
    { id: 1, source_kind: 'ea-board', description: null, first_seen_at: '2026-01-01' },
    { id: 2, source_kind: 'ats', description: 'Full text', first_seen_at: '2026-02-01' },
    { id: 3, source_kind: 'crawl', description: 'Some text', first_seen_at: '2026-01-15' },
  ]
  assert.equal(pickCanonical(rows).id, 2)
})

// ---------------------------------------------------------------------------
// Text normalisation — the adapter gotchas (§7.2)
// ---------------------------------------------------------------------------

test('Greenhouse double-encoded content decodes to real markup', () => {
  // Greenhouse returns `content` HTML-entity-encoded; the most common
  // integration bug is not unescaping it.
  const encoded = '&lt;p&gt;We need a &lt;strong&gt;policy officer&lt;/strong&gt;&lt;/p&gt;'
  assert.equal(htmlToText(decodeEntities(encoded)), 'We need a policy officer')
})

test('htmlToText preserves list and paragraph structure', () => {
  const html = '<p>Intro</p><ul><li>One</li><li>Two</li></ul>'
  assert.equal(htmlToText(html), 'Intro\n• One\n• Two')
})

test('canonicaliseUrl strips tracking and normalises the host', () => {
  assert.equal(
    canonicaliseUrl('http://WWW.Example.com/jobs/1/?utm_source=x&b=2&a=1#top'),
    'https://example.com/jobs/1?a=1&b=2',
  )
})

test('urlWithoutQuery drops the query entirely for the dedup key', () => {
  assert.equal(urlWithoutQuery('https://example.com/jobs/1?ref=abc&id=9'), 'https://example.com/jobs/1')
})

test('the 30% ruling is detected in both languages', () => {
  assert.equal(mentions30PercentRuling('Je komt mogelijk in aanmerking voor de 30%-regeling.'), true)
  assert.equal(mentions30PercentRuling('You may qualify for the 30% ruling.'), true)
  assert.equal(mentions30PercentRuling('A 30% bonus scheme applies.'), false)
})

test('a single separator is read by group length, not by locale guessing', () => {
  // "4.500" is 4500 in Dutch and 4.5 in English; a three-digit group settles it.
  assert.equal(parseLocaleNumber('4.500'), 4500)
  assert.equal(parseLocaleNumber('4,500'), 4500)
  assert.equal(parseLocaleNumber('1.234.567'), 1234567)
  assert.equal(parseLocaleNumber('4.5'), 4.5)
  assert.equal(parseLocaleNumber('4,50'), 4.5)
  assert.equal(parseLocaleNumber('18,7'), 18.7)
  // Both separators present: the last one is the decimal point.
  assert.equal(parseLocaleNumber('1.234,56'), 1234.56)
  assert.equal(parseLocaleNumber('1,234.56'), 1234.56)
})

test('salary parsing handles Dutch and English number conventions', () => {
  const nl = parseSalaryText('€ 4.500 - € 6.200 per maand')
  assert.equal(nl.min, 4500)
  assert.equal(nl.max, 6200)
  assert.equal(nl.currency, 'EUR')
  assert.equal(nl.period, 'month')

  const en = parseSalaryText('$120,000-$180,000 per year')
  assert.equal(en.min, 120_000)
  assert.equal(en.max, 180_000)
  assert.equal(en.currency, 'USD')
  assert.equal(en.period, 'year')

  assert.equal(parseSalaryText('Competitive').min, null)
})

// ---------------------------------------------------------------------------
// Source-specific parsing
// ---------------------------------------------------------------------------

test('detectAts recognises the ATS behind an outbound apply URL', () => {
  assert.deepEqual(detectAts('https://boards.greenhouse.io/mosameat/jobs/123'), {
    ats: 'greenhouse',
    token: 'mosameat',
  })
  assert.deepEqual(detectAts('https://jobs.ashbyhq.com/cradlebio/abc'), {
    ats: 'ashby',
    token: 'cradlebio',
  })
  assert.deepEqual(detectAts('https://clean-air-task-force.breezy.hr/p/xyz'), {
    ats: 'breezy',
    token: 'clean-air-task-force',
  })
  assert.equal(detectAts('https://example.com/careers'), null)
})

test('werkenvoornederland org codes come out of the slug suffix', () => {
  assert.equal(
    orgCodeFromUrl('https://www.werkenvoornederland.nl/vacatures/beleidsmedewerker-kernenergie-EZK-2026-3344'),
    'EZK',
  )
  assert.equal(orgCodeFromUrl('https://www.werkenvoornederland.nl/vacatures/iets-RIVM-2026-1'), 'RIVM')
  assert.equal(orgCodeFromUrl('https://www.werkenvoornederland.nl/over-ons'), null)
})

test('werkenvoornederland body extraction keeps signal and drops the tail', () => {
  // Its JSON-LD description is a one-liner, so the body comes from the page.
  const html = `
    <main>
      <section class="contrast--background" id="dit_ga_je_doen_anchor"><p>Je stuurt op kwaliteit van zorg.</p></section>
      <section class="contrast--background" id="dit_vragen_wij_anchor"><p>Je spreekt vloeiend Nederlands.</p></section>
      <section class="contrast--background" id="bijzonderheden_anchor"><p>Een VOG is vereist.</p></section>
      <section id="stel_gerust_je_vraag"><p>Bel Radjes Mangroe.</p></section>
      <h2>Relevante vacatures</h2><p>Andere baan</p>
    </main>`
  const body = extractWvnBody(html)
  assert.match(body, /kwaliteit van zorg/)
  assert.match(body, /vloeiend Nederlands/)
  assert.match(body, /VOG is vereist/)
  assert.doesNotMatch(body, /Radjes Mangroe/, 'contact block is furniture')
  assert.doesNotMatch(body, /Andere baan/, 'related vacancies are furniture')
})

test('JSON-LD extraction finds a JobPosting nested under mainEntity', () => {
  // AcademicTransfer publishes it this way; a top-level-only reader finds
  // nothing and wrongly concludes the site has no structured data.
  const html = `<script type="application/ld+json">
    {"@context":"http://schema.org","@type":"WebPage",
     "mainEntity":{"@type":"JobPosting","title":"PhD Position","description":"<p>Body</p>"}}
  </script>`
  const posting = findJobPosting(html)
  assert.equal(posting?.title, 'PhD Position')
})

test('JSON-LD extraction still handles @graph and bare arrays', () => {
  assert.equal(
    findJobPosting(
      '<script type="application/ld+json">{"@graph":[{"@type":"Organization"},{"@type":"JobPosting","title":"A"}]}</script>',
    )?.title,
    'A',
  )
  assert.equal(
    findJobPosting('<script type="application/ld+json">[{"@type":"JobPosting","title":"B"}]</script>')?.title,
    'B',
  )
})

test('malformed JSON-LD does not throw', () => {
  assert.equal(findJobPosting('<script type="application/ld+json">{ not json }</script>'), null)
  assert.deepEqual(extractJsonLd('<p>no scripts here</p>'), [])
})

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

test('firstLine takes one sentence without splitting on abbreviations', () => {
  assert.equal(
    firstLine('RaboResearch stuurt Europees kapitaal. Een analist hier beweegt meer dan advocacy.'),
    'RaboResearch stuurt Europees kapitaal.',
  )
  // A decimal or an abbreviation must not end the sentence.
  assert.equal(
    firstLine('Adessium verdeelde € 18,7 mln. over 95 organisaties in 2025.'),
    'Adessium verdeelde € 18,7 mln. over 95 organisaties in 2025.',
  )
  assert.equal(firstLine(null), '')
})

// ---------------------------------------------------------------------------
// Migration SQL splitter
// ---------------------------------------------------------------------------

test('splitStatements ignores semicolons in strings and comments', () => {
  const sql = `
    create table a (x text not null default '{}');
    -- a comment with a ; semicolon
    create table b (y text default 'has ; inside');
  `
  const statements = splitStatements(sql)
  assert.equal(statements.length, 2)
  assert.match(statements[1], /create table b/)
})
