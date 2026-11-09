import assert from 'node:assert/strict'
import test from 'node:test'

import { inEuros, parseEcb } from './currency'

// ECB reference rates for 9 November 2026
const rates = parseEcb(`<Cube time='2026-11-09'><Cube currency='USD' rate='1.1193'/><Cube currency='GBP' rate='0.83430'/></Cube>`)

test('reads the ECB daily feed', () => {
  assert.deepEqual(rates, { USD: 1.1193, GBP: 0.8343 })
})

test('dollar and pound salaries become approximate euros', () => {
  assert.deepEqual(inEuros('USD 160.000–USD 250.000', rates), { text: 'About €143,000–€223,000', annual: true })
  assert.deepEqual(inEuros('USD 60.000', rates), { text: 'About €54,000', annual: true })
  assert.deepEqual(inEuros('£45,000 - £55,000', rates), { text: 'About €54,000–€66,000', annual: true })
  assert.deepEqual(inEuros('USD 4.500', rates), { text: 'About €4,000', annual: false })
})

test('euro salaries, unparseable text and missing rates are left alone', () => {
  assert.equal(inEuros('€4.818–€7.094', rates), null)
  assert.equal(inEuros('Competitive', rates), null)
  assert.equal(inEuros('USD 60.000', null), null)
  assert.equal(inEuros('CHF 90.000', rates), null)
})
