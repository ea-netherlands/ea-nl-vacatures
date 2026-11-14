import test from 'node:test'
import assert from 'node:assert/strict'
import { byDateParams, legacySocialId, privateSocialId, privatiseSocialPosts, type MoveClient } from './private-ids'

test('weekly posts get dotted ids, which Sanity keeps private', () => {
  assert.equal(privateSocialId('socialPost', '2026-11-16'), 'socialPost.2026-11-16')
  assert.equal(privateSocialId('explainerPost', '2026-11-19'), 'explainerPost.2026-11-19')
  assert.equal(legacySocialId('explainerPost', '2026-11-19'), 'explainerPost-2026-11-19')
  assert.deepEqual(byDateParams('socialPost', '2026-11-16'), {
    id: 'socialPost.2026-11-16',
    legacy: 'socialPost-2026-11-16',
  })
})

type Doc = { _id: string; _type: string; [k: string]: unknown }

function fakeClient(docs: Doc[]) {
  const store = new Map(docs.map((d) => [d._id, d]))
  const client: MoveClient = {
    fetch: async <T>() => [...store.values()] as T,
    transaction() {
      const ops: (() => void)[] = []
      return {
        createIfNotExists(doc) {
          ops.push(() => {
            if (!store.has(doc._id)) store.set(doc._id, doc as Doc)
          })
        },
        delete(id) {
          ops.push(() => store.delete(id))
        },
        async commit() {
          ops.forEach((op) => op())
        },
      }
    },
  }
  return { client, store }
}

test('moves public posts onto private ids and keeps their content', async () => {
  const { client, store } = fakeClient([
    { _id: 'socialPost-2026-11-16', _type: 'socialPost', _rev: 'r1', postDate: '2026-11-16', status: 'draft' },
    { _id: 'explainerPost-2026-11-19', _type: 'explainerPost', _rev: 'r2', postDate: '2026-11-19', passed: [] },
    { _id: 'socialPost.2026-11-09', _type: 'socialPost', postDate: '2026-11-09', status: 'posted' },
  ])
  const report = await privatiseSocialPosts(client)
  assert.equal(report.found, 3)
  assert.equal(report.moved, 2)
  assert.equal(report.alreadyPrivate, 1)
  assert.deepEqual([...store.keys()].sort(), [
    'explainerPost.2026-11-19',
    'socialPost.2026-11-09',
    'socialPost.2026-11-16',
  ])
  const moved = store.get('socialPost.2026-11-16')!
  assert.equal(moved.status, 'draft')
  assert.equal(moved._rev, undefined)

  const again = await privatiseSocialPosts(client)
  assert.equal(again.moved, 0)
})

test('a dry run lists the moves and changes nothing', async () => {
  const { client, store } = fakeClient([
    { _id: 'explainerPost-2026-11-12', _type: 'explainerPost', postDate: '2026-11-12' },
  ])
  const report = await privatiseSocialPosts(client, { dryRun: true })
  assert.deepEqual(report.ids, ['explainerPost-2026-11-12 -> explainerPost.2026-11-12'])
  assert.ok(store.has('explainerPost-2026-11-12'))
})
