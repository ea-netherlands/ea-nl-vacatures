import assert from 'node:assert/strict'
import test from 'node:test'

import { InstagramError, publishInstagramCarousel } from './instagram'
import { publishLinkedInImages } from './linkedin'
import { channelPostAt } from './publish'
import { seal, unseal } from './tokens'

type Call = { url: string; method: string; body: string | null; headers: Record<string, string> }

/** A fake fetch: answers by URL pattern, records every call. */
function fakeHttp(routes: [RegExp, (call: Call) => Response][]) {
  const calls: Call[] = []
  const http = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: init?.method ?? 'GET',
      body: init?.body instanceof URLSearchParams ? init.body.toString() : typeof init?.body === 'string' ? init.body : null,
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
    }
    calls.push(call)
    const route = routes.find(([re]) => re.test(`${call.method} ${call.url}`))
    if (!route) throw new Error(`unexpected request: ${call.method} ${call.url}`)
    return route[1](call)
  }) as typeof fetch
  return { http, calls }
}

const json = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' }, ...init })

test('each account posts at its own Amsterdam time, summer or winter', () => {
  assert.equal(channelPostAt('2026-11-17', 'linkedinPersonal').toISOString(), '2026-11-17T08:00:00.000Z')
  assert.equal(channelPostAt('2026-11-17', 'instagram').toISOString(), '2026-11-17T18:00:00.000Z')
  assert.equal(channelPostAt('2027-06-01', 'instagram').toISOString(), '2027-06-01T17:00:00.000Z')
})

test('tokens are sealed, and a tampered one is refused', () => {
  const sealed = seal('IGQVJ-secret-token')
  assert.ok(!sealed.includes('secret'))
  assert.equal(unseal(sealed), 'IGQVJ-secret-token')
  const [iv, tag, body] = sealed.split('.')
  assert.throws(() => unseal([iv, tag, body.slice(0, -2) + 'AA'].join('.')))
})

test('Instagram: a container per slide, a carousel with the caption, wait, publish', async () => {
  let polls = 0
  let child = 0
  const { http, calls } = fakeHttp([
    [/POST .*\/123\/media$/, (c) => json({ id: c.body!.includes('CAROUSEL') ? 'carousel-1' : `child-${++child}` })],
    [/GET .*\/carousel-1\?fields=status_code/, () => json({ status_code: ++polls < 2 ? 'IN_PROGRESS' : 'FINISHED' })],
    [/POST .*\/123\/media_publish$/, () => json({ id: 'media-9' })],
    [/GET .*\/media-9\?fields=permalink/, () => json({ permalink: 'https://www.instagram.com/p/abc/' })],
  ])
  const result = await publishInstagramCarousel({
    userId: '123',
    token: 't',
    imageUrls: ['https://x/1.jpg', 'https://x/2.jpg', 'https://x/3.jpg'],
    caption: 'Seven jobs',
    http,
    sleep: async () => {},
  })
  assert.deepEqual(result, { id: 'media-9', url: 'https://www.instagram.com/p/abc/' })
  const carousel = new URLSearchParams(calls.find((c) => c.body?.includes('CAROUSEL'))!.body!)
  assert.equal(carousel.get('children'), 'child-1,child-2,child-3')
  assert.equal(carousel.get('caption'), 'Seven jobs')
  assert.equal(new URLSearchParams(calls[0].body!).get('is_carousel_item'), 'true')
  assert.equal(polls, 2)
})

test('Instagram: an API error comes back as a readable message', async () => {
  const { http } = fakeHttp([
    [/POST .*\/media$/, () => json({ error: { message: 'Invalid OAuth access token' } }, { status: 400 })],
  ])
  await assert.rejects(
    publishInstagramCarousel({ userId: '1', token: 'bad', imageUrls: ['a', 'b'], caption: 'c', http }),
    (err: Error) => err instanceof InstagramError && /Invalid OAuth access token/.test(err.message),
  )
})

test('LinkedIn: register and upload each slide, then one post with every image', async () => {
  let n = 0
  const { http, calls } = fakeHttp([
    [
      /POST .*assets\?action=registerUpload/,
      () => {
        n++
        return json({
          value: {
            asset: `urn:li:digitalmediaAsset:A${n}`,
            uploadMechanism: {
              'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': { uploadUrl: `https://upload/${n}` },
            },
          },
        })
      },
    ],
    [/GET https:\/\/slides\//, () => new Response(new Uint8Array([1, 2, 3]))],
    [/PUT https:\/\/upload\//, () => new Response(null, { status: 201 })],
    [/POST .*ugcPosts/, () => new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:share:77' } })],
  ])
  const result = await publishLinkedInImages({
    token: 't',
    personUrn: 'urn:li:person:abc',
    imageUrls: ['https://slides/1.png', 'https://slides/2.png'],
    caption: 'Seven jobs',
    http,
  })
  assert.deepEqual(result, { id: 'urn:li:share:77', url: 'https://www.linkedin.com/feed/update/urn:li:share:77/' })
  const share = JSON.parse(calls.find((c) => c.url.includes('ugcPosts'))!.body!)
  const content = share.specificContent['com.linkedin.ugc.ShareContent']
  assert.equal(share.author, 'urn:li:person:abc')
  assert.equal(content.shareCommentary.text, 'Seven jobs')
  assert.deepEqual(
    content.media.map((m: { media: string }) => m.media),
    ['urn:li:digitalmediaAsset:A1', 'urn:li:digitalmediaAsset:A2'],
  )
  assert.equal(calls.filter((c) => c.method === 'PUT').length, 2)
})
