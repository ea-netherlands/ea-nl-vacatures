import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CHARITY } from '../explainer/series'
import { explainerSlidePaths, explainerSlides } from '../explainer/slides'
import type { ExplainerItem } from '../explainer/store'
import { explainerPostAt, nextExplainerTime } from '../explainer/weekly'
import { asCandidate, causeLinks, charityLinks, parseCharity, reportFrom, type Charity } from './catalogue'
import { composeCaption } from './draft'
import { rotation } from './weekly'

const page = (inner: string) => `<html><body><nav><a href="https://doneereffectief.nl/toporganisatie/in-the-menu/">x</a></nav><main>${inner}</main></body></html>`

test('the overview gives the cause pages; a cause page gives its charities but not its fund', () => {
  const overview = page(
    '<a href="https://doneereffectief.nl/toporganisaties/armoede/">a</a><a href="/toporganisaties/klimaat/">k</a><a href="https://doneereffectief.nl/toporganisaties/armoede/">again</a>',
  )
  assert.deepEqual(causeLinks(overview), [
    'https://doneereffectief.nl/toporganisaties/armoede/',
    'https://doneereffectief.nl/toporganisaties/klimaat/',
  ])
  const cause = page(
    '<a class="button button-outline" href="https://doneereffectief.nl/toporganisatie/doneer-effectief-fonds-klimaat/">Lees meer</a>' +
      '<a class="button button-outline" href="https://doneereffectief.nl/toporganisatie/amf/">Lees meer</a>',
  )
  assert.deepEqual(charityLinks(cause), ['https://doneereffectief.nl/toporganisatie/amf/'])
})

test('a report link: an evaluator’s page about the charity, cleaned up; nothing else', () => {
  assert.deepEqual(reportFrom(' https://animalcharityevaluators.org/charity-review/greener-by-default/#review'), {
    url: 'https://animalcharityevaluators.org/charity-review/greener-by-default/',
    evaluator: 'Animal Charity Evaluators',
  })
  assert.equal(
    reportFrom('https://www.givewell.org/international/technical/programs/insecticide-treated-nets&sa=D&source=docs&ust=1')?.url,
    'https://www.givewell.org/international/technical/programs/insecticide-treated-nets',
  )
  assert.equal(reportFrom('http://givinggreen.earth')?.url, undefined)
  assert.equal(reportFrom('https://www.givewell.org/charities/top-charities'), null)
  assert.equal(reportFrom('https://assets.ctfassets.net/x/guide.pdf'), null)
  assert.equal(reportFrom('https://founderspledge.com/research/report.pdf'), null)
  assert.equal(reportFrom('https://www.againstmalaria.com/'), null)
  assert.equal(reportFrom('javascript:void(0)'), null)
})

const AMF = page(`
  <div class="breadcrumbs"><span><a href="https://doneereffectief.nl/toporganisatie/">Top goede doelen</a> | <span class="breadcrumb_last" aria-current="page">Armoede &amp; gezondheid</span></span></div>
  <h1 class="">Against Malaria Foundation </h1>
  <div class="rec-label d-flex"><img src="x.png"><p class="m-0">Aanbevolen door GiveWell</p></div>
  <div class="desc"><p>AMF deelt netten uit<sup><a href="https://www.givewell.org/charities/top-charities">1</a></sup>.</p></div>
  <!-- <a href="https://www.givewell.org/charities/commented-out">Website</a> -->
  <div class="news-slider-wrapper"><a href="https://www.givewell.org/research/grants/some-news">news</a></div>
  <div class="block more-information"><div class="buttons">
    <a class="button blue-2 inverted" href="https://www.givewell.org">Evaluator</a>
    <a class="button blue-2 inverted" href="https://www.givewell.org/charities/amf">Onderzoeksrapport</a>
    <a class="button blue-2 inverted" href="https://www.againstmalaria.com/">Organisatie</a>
  </div></div>`)

test('a charity’s page: name, cause in English, evaluator, the research report; not the news carousel', () => {
  const c = parseCharity(AMF, 'https://doneereffectief.nl/toporganisatie/amf/')!
  assert.equal(c.slug, 'amf')
  assert.equal(c.name, 'Against Malaria Foundation')
  assert.equal(c.cause, 'Global health and poverty')
  assert.equal(c.recommendedBy, 'GiveWell')
  assert.deepEqual(c.reports, [{ url: 'https://www.givewell.org/charities/amf', evaluator: 'GiveWell' }])
  assert.match(c.pageText, /AMF deelt netten uit/)
  assert.equal(parseCharity(page(''), 'https://doneereffectief.nl/toporganisatie/bandhan/'), null)
})

const charity = (slug: string, cause: string): Charity => ({
  slug,
  name: slug.toUpperCase(),
  cause,
  pageUrl: `https://doneereffectief.nl/toporganisatie/${slug}/`,
  recommendedBy: 'GiveWell',
  reports: [{ url: `https://www.givewell.org/charities/${slug}`, evaluator: 'GiveWell' }],
  pageText: '',
})
const LIST = [charity('a', 'Health'), charity('b', 'Health'), charity('c', 'Climate'), charity('d', 'Animals')]
const featured = (slug: string, status: ExplainerItem['status']) =>
  ({ status, source: { kind: 'charity', id: slug } }) as unknown as ExplainerItem

test('the rotation: causes in turn, Instagram starting halfway, longest ago first', () => {
  const slugs = (cs: Charity[]) => cs.map((c) => c.slug).join('')
  assert.equal(slugs(rotation(LIST, [], 'linkedinPersonal')), 'acdb')
  assert.equal(slugs(rotation(LIST, [], 'instagram')), 'dbac')
  const history = [
    { postDate: '2026-11-30', linkedinPersonal: featured('c', 'posted'), instagram: featured('d', 'draft'), passed: [] },
    { postDate: '2026-11-23', linkedinPersonal: featured('a', 'skipped'), instagram: null, passed: [] },
  ]
  // Never featured first, then the oldest; the other account's history doesn't count, nor does a draft.
  assert.equal(slugs(rotation(LIST, history, 'linkedinPersonal')), 'dbac')
  assert.equal(slugs(rotation(LIST, history, 'instagram')), 'dbac')
})

const source = { ...asCandidate(LIST[0]), title: 'Against Malaria Foundation' }
const draft = { opening: 'Open.', caption: 'Body.', hashtags: ['#Effective Giving', 'goededoelen'] }

test('captions: framing, credit, and the give, pledge and email calls; links only on LinkedIn', () => {
  const li = composeCaption('linkedinPersonal', source, draft, '2026-11-23').split('\n\n')
  assert.equal(li[0], 'Open.')
  assert.match(li[1], /^Each week I take one of the top charities of Doneer Effectief, the Dutch platform for effective giving/)
  assert.match(li[1], /This week: Against Malaria Foundation, as evaluated by GiveWell\.$/)
  assert.match(li[3], /in my own words from GiveWell’s evaluation.*https:\/\/www\.givewell\.org\/charities\/a$/)
  assert.match(li[4], /give through Doneer Effectief: https:\/\/doneereffectief\.nl\/toporganisatie\/a\/\?utm_source=linkedin&utm_medium=social&utm_campaign=charity-2026-11-23&utm_content=james$/)
  assert.match(li[5], /10% Pledge.*https:\/\/www\.givingwhatwecan\.org\/pledge\/ea-netherlands\?utm_source=linkedin/)
  assert.match(li[6], /newsletter\?utm_source=linkedin.*utm_campaign=charity-2026-11-23/)

  const ig = composeCaption('instagram', source, draft, '2026-11-23')
  assert.doesNotMatch(ig, /https?:\/\//)
  assert.match(ig, /Each week we take/)
  assert.match(ig, /give through Doneer Effectief at doneereffectief\.nl\./)
  assert.match(ig, /givingwhatwecan\.org\/pledge\/ea-netherlands/)
  assert.match(ig, /link in our bio/)
  assert.match(ig, /#effectivegiving #goededoelen$/)
})

test('the week: named after its Monday; LinkedIn that morning, Instagram on Thursday evening', () => {
  assert.equal(explainerPostAt('2026-11-23', 'linkedinPersonal', CHARITY).toISOString(), '2026-11-23T08:00:00.000Z')
  assert.equal(explainerPostAt('2026-11-23', 'instagram', CHARITY).toISOString(), '2026-11-26T17:00:00.000Z')
  const week = (at: string) => nextExplainerTime(new Date(at), CHARITY).toISOString().slice(0, 10)
  // Friday's cron drafts next Monday's; the page stays on a week until its Thursday post is out.
  assert.equal(week('2026-11-20T10:30:00Z'), '2026-11-23')
  assert.equal(week('2026-11-26T12:00:00Z'), '2026-11-23')
  assert.equal(week('2026-11-26T17:30:00Z'), '2026-11-30')
  // The explainer's week is untouched.
  assert.equal(nextExplainerTime(new Date('2026-11-20T10:30:00Z')).toISOString().slice(0, 10), '2026-11-19')
})

test('slides: hook, about the series, the points, the closing; their own address', () => {
  const item = {
    status: 'draft',
    source,
    slides: {
      cover: { headline: 'What does a net cost?', marked: 'a net cost?', sub: 'Sub.' },
      points: [1, 2, 3, 4].map((n) => ({ heading: `H${n}`, body: `B${n}` })),
    },
  } as unknown as ExplainerItem
  const post = { postDate: '2026-11-23', linkedinPersonal: item, instagram: null }
  assert.deepEqual(
    explainerSlides(post, 'linkedinPersonal').map((s) => s.kind),
    ['cover', 'about', 'point', 'point', 'point', 'point', 'close'],
  )
  const paths = explainerSlidePaths(post, 'linkedinPersonal', 'jpg', CHARITY)
  assert.match(paths[0], /^\/vacatures\/social\/explainer\?d=2026-11-23&c=li&i=0&v=[0-9a-f]{10}&s=c&format=jpg$/)
})
