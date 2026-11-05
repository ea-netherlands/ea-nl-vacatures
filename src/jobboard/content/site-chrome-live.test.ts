import assert from 'node:assert/strict'
import test from 'node:test'

import { checkSiteSync } from '../lib/site-sync'
import {
  absolute,
  consentMismatch,
  fallbackChrome,
  loadSiteChrome,
  parseSiteChrome,
} from './site-chrome-live'
import { SITE } from './site-chrome'
import snapshot from './site-chrome.snapshot.json'

const clone = () => JSON.parse(JSON.stringify(snapshot))

test('absolute: site paths get the origin, board paths and external links do not', () => {
  assert.equal(absolute('/carrieregids'), `${SITE}/carrieregids`)
  assert.equal(absolute('/vacatures'), '/vacatures')
  assert.equal(absolute('/vacatures/123?x=1'), '/vacatures/123?x=1')
  assert.equal(absolute('/en/jobs'), '/en/jobs')
  assert.equal(absolute('/en/jobsearch'), `${SITE}/en/jobsearch`)
  assert.equal(absolute('https://doneereffectief.nl'), 'https://doneereffectief.nl')
})

test('the saved snapshot renders in both languages, with every icon drawable', () => {
  for (const locale of ['nl', 'en'] as const) {
    const warnings: string[] = []
    const { nav, footer } = parseSiteChrome(snapshot, locale, (m) => warnings.push(m))
    assert.deepEqual(warnings, [])
    assert.ok(nav.pillars.length >= 5)
    assert.ok(footer.columns.length >= 5)
    assert.ok(nav.cta.label, 'board-only strings are merged in')
    assert.ok(footer.cookieSettings)
  }
  assert.equal(fallbackChrome('nl').source, 'fallback')
})

test('the board links to itself relatively, and to the rest of the site absolutely', () => {
  const { footer } = parseSiteChrome(snapshot, 'nl')
  const hrefs = footer.columns.flatMap((c) => c.links.map((l) => l.href))
  assert.ok(hrefs.includes('/vacatures'))
  assert.ok(hrefs.includes(`${SITE}/carrieregids`))
  const en = parseSiteChrome(snapshot, 'en').footer.columns.flatMap((c) => c.links.map((l) => l.href))
  assert.ok(en.includes('/en/jobs'))
})

test('an icon the board lacks is swapped and reported, not fatal', () => {
  const payload = clone()
  payload.nav.pillars[0].groups[0].links[0].icon = 'unicorn'
  const warnings: string[] = []
  const { nav } = parseSiteChrome(payload, 'nl', (m) => warnings.push(m))
  assert.equal(nav.pillars[0].groups[0].links[0].icon, 'arrow-right')
  assert.equal(warnings.length, 1)
})

test('a payload in a shape the board does not know is rejected whole', () => {
  const missing = clone()
  delete missing.nav.pillars[1].groups[0].links[0].href.en
  assert.throws(() => parseSiteChrome(missing, 'en'), /href\.en/)
  assert.doesNotThrow(() => parseSiteChrome(missing, 'nl'))

  const future = clone()
  future.version = 2
  assert.throws(() => parseSiteChrome(future, 'nl'), /version/)
})

test('consent: the snapshot matches the board, and a bump on the site is caught', () => {
  assert.equal(consentMismatch(snapshot), null)
  const bumped = clone()
  bumped.consent.version = 2
  assert.match(consentMismatch(bumped) ?? '', /version: site 2, board 1/)
  const extra = clone()
  extra.consent.categories.push('functional')
  assert.match(consentMismatch(extra) ?? '', /categories/)
})

test('site-sync reports nothing when all is well, and explains each failure', async () => {
  assert.deepEqual(await checkSiteSync(async () => clone()), [])

  const down = await checkSiteSync(async () => {
    throw new Error('timed out')
  })
  assert.equal(down.length, 1)
  assert.match(down[0], /could not read .*timed out/)

  const bumped = clone()
  bumped.consent.version = 2
  const problems = await checkSiteSync(async () => bumped)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /Cookie consent/)
})

test('loadSiteChrome falls back to the snapshot when the site is unreachable', async () => {
  const realFetch = globalThis.fetch
  const realWarn = console.warn
  globalThis.fetch = (async () => {
    throw new Error('offline')
  }) as typeof fetch
  console.warn = () => {}
  try {
    const chrome = await loadSiteChrome('en')
    assert.equal(chrome.source, 'fallback')
    assert.ok(chrome.nav.pillars.length >= 5)
  } finally {
    globalThis.fetch = realFetch
    console.warn = realWarn
  }
})

test('loadSiteChrome uses the site when it answers', async () => {
  const realFetch = globalThis.fetch
  const payload = clone()
  payload.nav.pillars[0].label.nl = 'Leren (nieuw)'
  globalThis.fetch = (async () => new Response(JSON.stringify(payload))) as typeof fetch
  try {
    const chrome = await loadSiteChrome('nl')
    assert.equal(chrome.source, 'site')
    assert.equal(chrome.nav.pillars[0].label, 'Leren (nieuw)')
  } finally {
    globalThis.fetch = realFetch
  }
})
