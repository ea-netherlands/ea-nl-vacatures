import assert from 'node:assert/strict'
import test from 'node:test'

import { musicReminderText, TRACKS, trackFor } from './music'

test('job postings get Gorillaz, content gets Dylan', () => {
  assert.equal(trackFor('jobs').artist, 'Gorillaz')
  assert.equal(trackFor('content').artist, 'Bob Dylan')
})

test('the reminder names the post, the link and the track', () => {
  const text = musicReminderText("Today's jobs post", 'https://www.instagram.com/p/abc/', TRACKS.jobs)
  assert.match(text, /^Today's jobs post is up on EA Netherlands' Instagram: https:\/\/www\.instagram\.com\/p\/abc\//)
  assert.match(text, /Add “Feel Good Inc\.” by Gorillaz/)
})
