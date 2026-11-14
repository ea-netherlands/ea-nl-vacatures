import test from 'node:test'
import assert from 'node:assert/strict'
import { privateIdFor, privateSuggestionId, privatiseSuggestions, type MoveClient } from './suggestions'

test('new suggestion ids are on the private, dotted path', () => {
  const id = privateSuggestionId()
  assert.match(id, /^suggestion\.[0-9a-f-]{36}$/)
  assert.notEqual(id, privateSuggestionId())
})

test('public ids map to private ones; private ids are left alone', () => {
  assert.equal(privateIdFor('Ab3dEf'), 'suggestion.Ab3dEf')
  assert.equal(privateIdFor('drafts.Ab3dEf'), 'drafts.suggestion.Ab3dEf')
  assert.equal(privateIdFor('suggestion.Ab3dEf'), null)
  assert.equal(privateIdFor('drafts.suggestion.Ab3dEf'), null)
})

function fakeClient(docs: { _id: string; [k: string]: unknown }[]) {
  const store = new Map(docs.map((d) => [d._id, d]))
  const client: MoveClient = {
    fetch: async <T>() => [...store.values()] as T,
    transaction() {
      const ops: (() => void)[] = []
      return {
        createIfNotExists(doc) {
          ops.push(() => {
            if (!store.has(doc._id)) store.set(doc._id, doc)
          })
        },
        delete(id) {
          ops.push(() => void store.delete(id))
        },
        commit: async () => ops.forEach((op) => op()),
      }
    },
  }
  return { client, store }
}

test('the move copies each public suggestion to a private id and removes the original', async () => {
  const { client, store } = fakeClient([
    { _id: 'pub1', _rev: 'r1', _createdAt: 'x', _updatedAt: 'y', _type: 'suggestion', submitterEmail: 'a@example.org', why: 'hello' },
    { _id: 'drafts.pub2', _rev: 'r2', _type: 'suggestion', status: 'new' },
    { _id: 'suggestion.already', _type: 'suggestion' },
  ])

  const dry = await privatiseSuggestions(client, { dryRun: true })
  assert.deepEqual([dry.found, dry.moved, dry.alreadyPrivate], [3, 0, 1])
  assert.equal(store.has('pub1'), true)

  const report = await privatiseSuggestions(client)
  assert.deepEqual([report.found, report.moved, report.alreadyPrivate], [3, 2, 1])
  assert.deepEqual([...store.keys()].sort(), ['drafts.suggestion.pub2', 'suggestion.already', 'suggestion.pub1'])
  const moved = store.get('suggestion.pub1')!
  assert.equal(moved.submitterEmail, 'a@example.org')
  assert.equal('_rev' in moved, false)

  const again = await privatiseSuggestions(client)
  assert.deepEqual([again.moved, again.alreadyPrivate], [0, 3])
})
