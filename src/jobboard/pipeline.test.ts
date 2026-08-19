/**
 * Tests for the deterministic core of the pipeline.
 *
 * These cover the parts that decide what reaches a curator without any model
 * involved: the Netherlands-eligibility filter, the earning-to-give gate, the
 * cause vocabulary, and deduplication. Getting any of them wrong is a silent
 * failure — an over-eager NL filter empties the board, a leaky gate erodes a
 * category, and a false dedup merge hides a real job.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { nlEligible, stage1 } from './classify/stage1'
import {
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
import { extractSuccessfactorsBody } from './ingest/adapters/ats'
import { orgCodeFromUrl, extractWvnBody, partosFacts } from './ingest/adapters/dutch'
import { extractJsonLd, findJobPosting } from './ingest/adapters/jsonld'
import { SEED_EMPLOYERS } from './seed/employers'
import {
  CAUSE_AREAS,
  LEGACY_LOCATION_MODE_MAP,
  LOCATION_MODES,
  SKILL_DEFINITIONS,
  SKILLS,
  CAUSE_AREA_DEFINITIONS,
  SUB_AREA_CAUSE,
  SUB_AREA_DEFINITIONS,
  SUB_AREAS,
  SUB_AREAS_BY_CAUSE,
  EXCLUDED_TOPICS,
  GATED_CAUSE_AREAS,
  LEVERAGE_TYPES,
  meetsPromotionThreshold,
} from './taxonomy'
import { firstLine } from './lib/note'

const noFlags: EmployerGateFlags = {
  e2g_allowlisted: false,
  e2g_salary_presumed: false,
  recommender_allowlisted: false,
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
    // The employer is not on the earning-to-give allowlist, so that label is
    // not on the menu. Every cause area is.
    assert.ok(!verdict.allowedLeverage.includes('earning-to-give'))
    assert.deepEqual([...verdict.allowedCauses].sort(), [...CAUSE_AREAS].sort())
  }
})

// ---------------------------------------------------------------------------
// The cause vocabulary (§5.1)
//
// The board presents exactly five problem areas. These tests exist because the
// vocabulary is duplicated into the Sanity dropdowns, the classifier's schema,
// the filter UI and both locales' label maps — so the failure mode is drift
// between layers rather than an outright bug.
//
// `movement-building` was added in August 2026, deliberately reversing the
// earlier decision that meta work is categorised by the problem it serves. The
// reversal is narrow: it covers community building and public-facing effective
// giving — organisations whose product *is* the movement — and nothing else. A
// researcher at GiveWell is still filed under global health. If that boundary
// slips, the area becomes the drawer every EA-org role falls into.
// ---------------------------------------------------------------------------

test('there are exactly five cause areas and none of them is gated', () => {
  assert.deepEqual(
    [...CAUSE_AREAS],
    [
      'global-health-wellbeing',
      'farmed-animal-welfare',
      'global-catastrophic-risks',
      'better-futures',
      'movement-building',
    ],
  )
  assert.deepEqual([...GATED_CAUSE_AREAS], [], 'no cause area is gated any more')
  assert.deepEqual([...allowedCauseAreas()].sort(), [...CAUSE_AREAS].sort())
})

test('climate is not a cause area, and is recorded as an excluded topic with a referral', () => {
  // The board used to carry a `climate` category behind a Giving Green
  // allowlist. It is now out of scope, and the referral is the whole substitute
  // for it — an exclusion with nowhere to send people is just a gap.
  assert.ok(!(CAUSE_AREAS as readonly string[]).includes('climate'))
  const climate = EXCLUDED_TOPICS.find((t) => t.id === 'climate')
  assert.ok(climate, 'climate must stay documented as a deliberate exclusion')
  assert.match(climate.referralUrl, /^https:\/\//)
  assert.ok(climate.referralName.length > 0)
})

test('the retired cause labels are gone from the vocabulary entirely', () => {
  // Each of these was a cause area before August 2026. Anything still emitting
  // one is reading a stale copy of the taxonomy.
  for (const retired of [
    'ai-safety-governance',
    'biosecurity-pandemics',
    'animal-welfare-alt-protein',
    'global-health-development',
    'global-catastrophic-risk',
    'effective-giving-meta',
    'climate',
  ]) {
    assert.ok(
      !(CAUSE_AREAS as readonly string[]).includes(retired),
      `${retired} must not be a cause area`,
    )
  }
  // `career-capital` moved axes rather than disappearing: it is a statement
  // about leverage, not about a problem.
  assert.ok(!(CAUSE_AREAS as readonly string[]).includes('career-capital'))
  assert.ok((LEVERAGE_TYPES as readonly string[]).includes('career-capital'))
})

test('movement-building excludes field building aimed at a single problem', () => {
  /*
    The boundary that took two passes to get right. Kairos is an AI-safety
    fellowship and talent pipeline: community-shaped work, but the field it
    grows is AI safety, so it is global-catastrophic-risks. The classifier
    called it movement-building on two of three listings and not the third —
    a coin flip, which is why the employer seed now settles it.

    Two things hold that line, and this test guards both.
  */
  const definition = CAUSE_AREA_DEFINITIONS['movement-building']
  assert.match(
    definition,
    /field building aimed at ONE problem/,
    'the definition must exclude single-problem field building',
  )

  // Kairos must stay seeded to its problem area and away from movement-building,
  // because the backfill refuses to move a listing into movement-building when
  // the employer's seed omits it.
  const kairos = SEED_EMPLOYERS.find((e) => e.id === 'kairos-project')
  assert.ok(kairos, 'Kairos must stay in the seed')
  assert.ok(
    kairos.causeAreas.includes('global-catastrophic-risks'),
    'Kairos is field building for AI safety',
  )
  assert.ok(
    !kairos.causeAreas.includes('movement-building'),
    'Kairos must not be eligible for movement-building',
  )

  // The consumer-facing giving organisations, by contrast, must be eligible —
  // the same gate that blocks Kairos would otherwise block them too.
  for (const id of ['doneer-effectief', 'tien-procent-club']) {
    const org = SEED_EMPLOYERS.find((e) => e.id === id)
    assert.ok(org, `${id} must stay in the seed`)
    assert.ok(
      org.causeAreas.includes('movement-building'),
      `${id} is consumer-facing effective giving and must be eligible`,
    )
  }
})

test('sub-areas are unique, and each maps back to exactly one cause area', () => {
  // Sub-area ids appear in URLs and are the label most readers actually click.
  // A duplicate id across two causes would make SUB_AREA_CAUSE ambiguous and
  // silently file listings under the wrong tile.
  assert.equal(new Set(SUB_AREAS).size, SUB_AREAS.length, 'sub-area ids must be unique')
  for (const sub of SUB_AREAS) {
    const cause = SUB_AREA_CAUSE[sub]
    assert.ok(cause, `${sub} must map to a cause area`)
    assert.ok(
      (SUB_AREAS_BY_CAUSE[cause] as readonly string[]).includes(sub),
      `${sub} must appear under the cause it maps to`,
    )
    assert.ok(SUB_AREA_DEFINITIONS[sub], `${sub} needs a definition for the classifier`)
  }
})

test('the skill axis is Probably Good\u2019s, and every skill is defined', () => {
  // Adopted rather than invented: a reader who has browsed
  // jobs.probablygood.org should not have to learn a second vocabulary. If
  // someone adds a category here, check it against theirs first.
  assert.deepEqual(
    [...SKILLS],
    [
      'communications',
      'data',
      'engineering',
      'finance',
      'information-security',
      'legal',
      'management',
      'operations',
      'policy',
      'research',
      'software-engineering',
    ],
  )
  for (const skill of SKILLS) assert.ok(SKILL_DEFINITIONS[skill], `${skill} needs a definition`)
})

test('where-you-work is three options, and every retired one maps forward', () => {
  // The four-value vocabulary answered two questions at once. Anything still
  // emitting an old value must land somewhere rather than falling through to
  // an unlabelled listing.
  assert.deepEqual([...LOCATION_MODES], ['remote', 'on-site-nl', 'nl-flexible'])
  for (const legacy of ['on-site', 'hybrid', 'remote-nl', 'remote-eu']) {
    const mapped = LEGACY_LOCATION_MODE_MAP[legacy]
    assert.ok(mapped, `${legacy} must map forward`)
    assert.ok((LOCATION_MODES as readonly string[]).includes(mapped))
  }
})

test('every cause area has sub-areas, and AI work is split across two of them', () => {
  for (const cause of CAUSE_AREAS) {
    assert.ok(SUB_AREAS_BY_CAUSE[cause]?.length, `${cause} needs sub-areas to be browsable`)
  }
  // The split is the substance of the revision: catastrophe-shaped AI risk on
  // one side, lock-in and power concentration on the other. If a future edit
  // collapses AI into one area this test is the thing that should complain.
  const gcr = SUB_AREAS_BY_CAUSE['global-catastrophic-risks']
    .map((sub) => SUB_AREA_DEFINITIONS[sub])
    .join(' ')
  const better = SUB_AREAS_BY_CAUSE['better-futures']
    .map((sub) => SUB_AREA_DEFINITIONS[sub])
    .join(' ')
  assert.match(gcr, /AI/)
  assert.match(better, /AI/)
})

test('enforceGates strips a cause label that is no longer in the vocabulary', () => {
  // A model handed a stale prompt, or a listing classified before the revision,
  // must not be able to reintroduce a retired label.
  const result = enforceGates(
    {
      primaryCause: 'climate',
      secondaryCauses: ['climate', 'global-health-wellbeing'],
      leverage: 'direct-work',
    },
    noFlags,
    { salary_max: null, salary_currency: null },
  )
  assert.equal(result.primaryCause, null)
  assert.deepEqual(result.secondaryCauses, ['global-health-wellbeing'])
  assert.equal(result.leverage, 'direct-work')
  assert.equal(result.violations.length, 2)
})

test('enforceGates leaves the current cause areas alone', () => {
  for (const cause of CAUSE_AREAS) {
    const result = enforceGates(
      { primaryCause: cause, secondaryCauses: [], leverage: 'field-building' },
      noFlags,
      { salary_max: null, salary_currency: null },
    )
    assert.equal(result.primaryCause, cause)
    assert.equal(result.violations.length, 0)
  }
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
  assert.deepEqual(detectAts('https://example-org.breezy.hr/p/xyz'), {
    ats: 'breezy',
    token: 'example-org',
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

test('SuccessFactors body survives nested joblayouttoken divs', () => {
  /*
    The blocks nest, so a non-greedy `</div>` match stops at the first inner
    close and returns a few dozen characters. That is how every FMO listing
    first arrived with a null description — which then dies at stage 1 as "too
    short to classify" and reads like the employer published nothing.
  */
  const page = `
    <html><body>
      <nav>Cookie Preferences</nav>
      <div class="joblayouttoken displayDTM">
        <div class="row"><div class="col-xs-12"><span>Associate Private Equity</span></div></div>
        <div class="row"><div class="inner">
          ${'Your Role. You work with Investment Officers to grow a portfolio of investments in emerging markets and build relationships with investees. '.repeat(4)}
        </div></div>
      </div>
      <div class="unifyJobFooter">About FMO. FMO delivers economic development worldwide.</div>
    </body></html>`

  const body = extractSuccessfactorsBody(page)
  assert.ok(body, 'a real ad body must not come back null')
  assert.ok(body!.length > 200, 'the nested divs must not truncate the body')
  assert.match(body!, /Investment Officers/)
  // The boilerplate About block is identical on every listing and would
  // dominate a short vacancy, so it stays out.
  assert.doesNotMatch(body!, /delivers economic development worldwide/)
})

test('a SuccessFactors page with no job body returns null rather than chrome', () => {
  const page = '<html><body><nav>Cookie Preferences</nav><p>No results</p></body></html>'
  assert.equal(extractSuccessfactorsBody(page), null)
})

test('Partos employer detection ignores the site chrome around the vacancy', () => {
  /*
    Partos has no JSON-LD, so the employer is resolved from the first outbound
    link on the page. Every Partos page wraps the vacancy in shared header and
    footer chrome carrying social icons — and a vacancy at Partos itself has no
    genuine outbound link, so a whole-page scan reached the footer and reported
    bsky.app as the employer (that is what happened to listing 65).

    Two things stop it, and this covers both: the scan is confined to
    `<main id="main">`, and the social-host denylist now includes the networks
    that postdate the original list.
  */
  const page = `
    <html><body>
      <header><a href="https://bsky.app/profile/partos.nl">Bluesky</a></header>
      <main id="main">
        <h1>Programmamedewerker</h1>
        <h2>Over Dorcas</h2>
        <p>Locatie: Almere</p>
        <p>Solliciteren voor: 12-09-2026</p>
        <a href="https://www.dorcas.nl/vacatures/programmamedewerker">Solliciteer</a>
      </main>
      <footer><a href="https://www.linkedin.com/company/partos">LinkedIn</a></footer>
    </body></html>`

  const facts = partosFacts(page)
  assert.equal(facts.employerHost, 'dorcas.nl')
  assert.equal(facts.applyUrl, 'https://www.dorcas.nl/vacatures/programmamedewerker')
  assert.equal(facts.employerNameHint, 'Dorcas')
  assert.equal(facts.location, 'Almere')
  assert.equal(facts.deadline?.toISOString().slice(0, 10), '2026-09-12')
})

test('a Partos vacancy with no outbound link reports no employer, not a social host', () => {
  // The failing case in its purest form: a vacancy at Partos itself. The right
  // answer is "we do not know", because a wrong employer is worse than none —
  // it breaks dedup against that employer's own feed and mislabels the card.
  const page = `
    <html><body>
      <header><a href="https://bsky.app/profile/partos.nl">Bluesky</a></header>
      <main id="main">
        <h1>Beleidsadviseur</h1>
        <p>Locatie: Amsterdam</p>
      </main>
      <footer>
        <a href="https://www.instagram.com/partos">Instagram</a>
        <a href="https://x.com/partos">X</a>
      </footer>
    </body></html>`

  assert.equal(partosFacts(page).employerHost, null)
  assert.equal(partosFacts(page).applyUrl, null)
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
