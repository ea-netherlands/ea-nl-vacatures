import assert from 'node:assert/strict'
import { test } from 'node:test'
import { INTERNAL_FLAG, isAutomatedVisit, isInternalVisit } from './analytics-filter'

function fakeStore() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
const person = { userAgent: CHROME, webdriver: false }

test('ordinary visitors are counted', () => {
  assert.equal(isInternalVisit('https://x.nl/vacatures/a', fakeStore()), false)
  assert.equal(isAutomatedVisit(person), false)
  // "bot" inside a phone's model name is not a crawler
  assert.equal(isAutomatedVisit({ ...person, userAgent: 'Mozilla/5.0 (Linux; Android 13; CUBOT NOTE 30) Chrome/141.0 Mobile Safari/537.36' }), false)
})

test('?internal=1 marks the browser as ours until ?internal=0', () => {
  const store = fakeStore()
  assert.equal(isInternalVisit('https://x.nl/vacatures?internal=1', store), true)
  assert.equal(store.data.get(INTERNAL_FLAG), '1')
  assert.equal(isInternalVisit('https://x.nl/vacatures/a', store), true)
  assert.equal(isInternalVisit('https://x.nl/?internal=0', store), false)
  assert.equal(isInternalVisit('https://x.nl/', store), false)
})

test('automation that gives itself away is not counted', () => {
  assert.equal(isAutomatedVisit({ ...person, webdriver: true }), true)
  assert.equal(isAutomatedVisit({ ...person, userAgent: CHROME.replace('Chrome/', 'HeadlessChrome/') }), true)
  assert.equal(isAutomatedVisit({ ...person, userAgent: 'Mozilla/5.0 (compatible; AhrefsBot/7.0)' }), true)
  assert.equal(isAutomatedVisit(null), false)
})
