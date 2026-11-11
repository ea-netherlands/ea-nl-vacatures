import assert from 'node:assert/strict'
import test from 'node:test'

import { musicReminderText, TRACKS, trackFor } from './music'

test('jobs posts get Gorillaz, Forum explainers get Dylan, CEA explainers nothing yet', () => {
  assert.equal(trackFor({ kind: 'jobs' }), TRACKS.jobs)
  assert.equal(trackFor({ kind: 'explainer', sourceKind: 'forum' }), TRACKS.forum)
  assert.equal(trackFor({ kind: 'explainer', sourceKind: 'instagram' }), null)
})

test('the reminder names the post, the link and the track', () => {
  const text = musicReminderText("Today's jobs post", 'https://www.instagram.com/p/abc/', TRACKS.jobs)
  assert.match(text, /^Today's jobs post is up on EA Netherlands' Instagram: https:\/\/www\.instagram\.com\/p\/abc\//)
  assert.match(text, /Add “Feel Good Inc\.” by Gorillaz/)
})
