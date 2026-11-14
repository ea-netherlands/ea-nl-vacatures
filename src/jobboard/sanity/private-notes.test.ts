import test from 'node:test'
import assert from 'node:assert/strict'
import { stripPublishedReasoning, withoutPrivateFields, type SweepClient } from './private-notes'

test('a draft written as a published listing loses the reasoning and keeps the rest', () => {
  const draft = { _id: 'drafts.jobListing-1', title: 'Policy officer', llmReasoning: 'frank notes', llmScore: 7 }
  const out = withoutPrivateFields(draft)
  assert.equal('llmReasoning' in out, false)
  assert.equal(out.title, 'Policy officer')
  assert.equal(out.llmScore, 7)
  assert.equal(draft.llmReasoning, 'frank notes', 'the draft itself is not changed')
})

function fakeClient(ids: string[]) {
  const patched: string[] = []
  let commits = 0
  let query = ''
  const client: SweepClient = {
    fetch: async <T>(q: string) => {
      query = q
      return ids as T
    },
    transaction() {
      const batch: string[] = []
      return {
        patch(id, ops) {
          assert.deepEqual(ops, { unset: ['llmReasoning'] })
          batch.push(id)
        },
        async commit() {
          commits++
          patched.push(...batch)
        },
      }
    },
  }
  return { client, patched, commits: () => commits, query: () => query }
}

test('the sweep unsets the reasoning on published listings only, in batches', async () => {
  const ids = Array.from({ length: 250 }, (_, i) => `jobListing-${i}`)
  const fake = fakeClient(ids)
  const report = await stripPublishedReasoning(fake.client)
  assert.deepEqual(report, { found: 250, cleaned: 250 })
  assert.equal(fake.patched.length, 250)
  assert.equal(fake.commits(), 3)
  assert.match(fake.query(), /!\(_id in path\("drafts\.\*\*"\)\)/)
})

test('a dry run only counts', async () => {
  const fake = fakeClient(['jobListing-1'])
  assert.deepEqual(await stripPublishedReasoning(fake.client, { dryRun: true }), { found: 1, cleaned: 0 })
  assert.equal(fake.commits(), 0)
})
