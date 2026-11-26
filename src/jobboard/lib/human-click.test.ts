import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isHumanClick } from './human-click'

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const h = (init: Record<string, string>) => new Headers(init)

test('a person clicking in a browser is counted', () => {
  assert.equal(isHumanClick(h({ 'sec-fetch-user': '?1', 'user-agent': CHROME })), true)
})

test('a request without the user-activation header is not', () => {
  assert.equal(isHumanClick(h({ 'user-agent': CHROME })), false)
  assert.equal(isHumanClick(h({ 'sec-fetch-user': '?0', 'user-agent': CHROME })), false)
})

test('a self-declared bot is not, even with the header', () => {
  for (const ua of [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36',
    'python-requests/2.32.3',
    '',
  ]) {
    assert.equal(isHumanClick(h({ 'sec-fetch-user': '?1', 'user-agent': ua })), false, ua)
  }
})
