import assert from 'node:assert/strict'
import test from 'node:test'

import { passesSourceFilters } from './filters'
import { optiverBody } from './adapters/e2g-employers'

test('onlyLocations keeps Netherlands roles and drops the rest', () => {
  const config = { onlyLocations: ['Amsterdam', 'Netherlands'] }
  assert.equal(passesSourceFilters({ title: 'C++ Software Engineer', locationRaw: 'Amsterdam' }, config), true)
  assert.equal(
    passesSourceFilters({ title: 'C++ Software Engineer', locationRaw: 'Utrecht, Netherlands' }, config),
    true,
  )
  assert.equal(passesSourceFilters({ title: 'C++ Software Engineer', locationRaw: 'Chicago' }, config), false)
  assert.equal(passesSourceFilters({ title: 'C++ Software Engineer', locationRaw: null }, config), false)
})

test('e2gRolesOnly applies the gate role test at ingest', () => {
  const config = { e2gRolesOnly: true }
  assert.equal(passesSourceFilters({ title: 'Graduate Trader', locationRaw: 'Amsterdam' }, config), true)
  assert.equal(passesSourceFilters({ title: 'Office Manager', locationRaw: 'Amsterdam' }, config), false)
  assert.equal(passesSourceFilters({ title: 'Trader Intern', locationRaw: 'Amsterdam' }, config), false)
})

test('a source with no filters keeps everything', () => {
  assert.equal(passesSourceFilters({ title: 'Office Manager', locationRaw: null }, {}), true)
})

test('optiverBody keeps the ad and drops the header and related jobs', () => {
  const page = `<html><body><nav>Menu</nav><main><h1>Graduate Trader</h1><a>Apply</a>
    <p>You will trade options.</p><ul><li>Maths</li></ul>
    <h2>Open positions</h2><a>Other job</a></main><footer>x</footer></body></html>`
  const body = optiverBody(page) ?? ''
  assert.ok(body.startsWith('<p>You will trade options.</p>'))
  assert.ok(body.includes('<li>Maths</li>'))
  assert.ok(!body.includes('Other job'))
  assert.ok(!body.includes('Apply'))
})
