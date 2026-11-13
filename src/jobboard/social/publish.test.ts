import assert from 'node:assert/strict'
import test from 'node:test'

import { graphBase, instagramAccount, InstagramError, publishInstagramCarousel } from './instagram'
import { postSlides } from './content'
import { littleText, publishLinkedInDocument } from './linkedin'
import { jpegsToPdf } from './pdf'
import { channelPostAt, jobsDocumentTitle } from './publish'
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
  assert.equal(channelPostAt('2026-11-17', 'instagram').toISOString(), '2026-11-17T17:00:00.000Z')
  assert.equal(channelPostAt('2027-06-01', 'instagram').toISOString(), '2027-06-01T16:00:00.000Z')
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

test('LinkedIn: the slides as one PDF, uploaded as a document, then one post', async () => {
  let polls = 0
  const jpeg = tinyJpeg(1080, 1350)
  const { http, calls } = fakeHttp([
    [/GET https:\/\/slides\//, () => new Response(jpeg)],
    [
      /POST .*\/rest\/documents\?action=initializeUpload/,
      () => json({ value: { uploadUrl: 'https://upload/doc', document: 'urn:li:document:D1' } }),
    ],
    [/PUT https:\/\/upload\/doc/, () => new Response(null, { status: 201 })],
    [/GET .*\/rest\/documents\/urn%3Ali%3Adocument%3AD1/, () => json({ status: ++polls < 2 ? 'PROCESSING' : 'AVAILABLE' })],
    [/POST .*\/rest\/posts$/, () => new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:share:77' } })],
  ])
  const result = await publishLinkedInDocument({
    token: 't',
    personUrn: 'urn:li:person:abc',
    imageUrls: ['https://slides/1.jpg', 'https://slides/2.jpg', 'https://slides/3.jpg'],
    title: 'Jobs this week, 17 November',
    caption: 'Seven jobs (remote too) #EffectiveAltruism',
    http,
    sleep: async () => {},
  })
  assert.deepEqual(result, { id: 'urn:li:share:77', url: 'https://www.linkedin.com/feed/update/urn:li:share:77/' })
  assert.equal(polls, 2)

  const init = calls.find((c) => c.url.includes('initializeUpload'))!
  assert.equal(JSON.parse(init.body!).initializeUploadRequest.owner, 'urn:li:person:abc')
  assert.match(init.headers['linkedin-version'], /^\d{6}$/)

  const put = calls.find((c) => c.method === 'PUT')!
  assert.equal(put.headers['content-type'], 'application/pdf')

  const share = JSON.parse(calls.find((c) => c.url.endsWith('/rest/posts'))!.body!)
  assert.equal(share.author, 'urn:li:person:abc')
  assert.deepEqual(share.content, { media: { title: 'Jobs this week, 17 November', id: 'urn:li:document:D1' } })
  assert.equal(share.commentary, 'Seven jobs \\(remote too\\) {hashtag|\\#|EffectiveAltruism}')
})

test('the PDF has a page per slide, each the size of its image', () => {
  const pdf = new TextDecoder('latin1').decode(jpegsToPdf([tinyJpeg(1080, 1350), tinyJpeg(1080, 1350)], 'Jobs’ week'))
  assert.match(pdf, /^%PDF-1\.4/)
  assert.match(pdf, /\/Type \/Pages \/Kids \[4 0 R 7 0 R\] \/Count 2/)
  assert.equal(pdf.match(/\/MediaBox \[0 0 1080 1350\]/g)?.length, 2)
  assert.equal(pdf.match(/\/Filter \/DCTDecode/g)?.length, 2)
  // Every xref offset points at its object.
  const xref = Number(pdf.match(/startxref\n(\d+)/)![1])
  const offsets = pdf.slice(xref).match(/^\d{10} 00000 n/gm)!.map((l) => Number(l.slice(0, 10)))
  offsets.forEach((at, i) => assert.ok(pdf.startsWith(`${i + 1} 0 obj`, at), `object ${i + 1}`))
})

test('little text: markup characters are escaped, hashtags still link', () => {
  assert.equal(littleText('Apply @ EA (NL) by 1 Dec_'), 'Apply \\@ EA \\(NL\\) by 1 Dec\\_')
  assert.equal(littleText('#EA #AI_safety.'), '{hashtag|\\#|EA} {hashtag|\\#|AI_safety}.')
})

test("the jobs document's title is the cover's pill and the day", () => {
  assert.equal(jobsDocumentTitle(postSlides([{ id: 'a', title: 'Researcher' }], '2026-11-17')), 'Jobs this week, 17 November')
  assert.equal(
    jobsDocumentTitle([{ kind: 'cover', count: 2, date: '2027-06-01', theme: 'mixed', funding: true }, { kind: 'cta' }]),
    'Opportunities this week, 1 June',
  )
})

/** The smallest JPEG jpegSize reads: SOI, a baseline frame header, EOI. */
function tinyJpeg(width: number, height: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff, 0x03,
    0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xd9,
  ])
}

test('a system-user token posts through graph.facebook.com, an Instagram token through graph.instagram.com', () => {
  assert.match(graphBase('EAAB-system-user'), /^https:\/\/graph\.facebook\.com\//)
  assert.match(graphBase('IGAA-instagram-user'), /^https:\/\/graph\.instagram\.com\//)
})

test('a system-user token is checked against the Instagram account id, not /me', async () => {
  const { http, calls } = fakeHttp([
    [/GET https:\/\/graph\.facebook\.com\/v[\d.]+\/17841455139503724\?fields=id%2Cusername/, () => json({ id: '17841455139503724', username: 'ea_netherlands' })],
  ])
  assert.deepEqual(await instagramAccount('EAAB-system-user', http), { userId: '17841455139503724', username: 'ea_netherlands' })
  assert.equal(calls.length, 1)
})
