/**
 * The three captions for a week's post: EA Nederland's Instagram, its LinkedIn
 * page, and James's own LinkedIn.
 *
 * The model writes only the opening and closing lines and the hashtags, in EA
 * Nederland's voice. The job list and every link are put in by `compose`, from
 * the listings themselves, so a fact or a URL can never come from the model:
 * a wrong deadline or a broken link in a public post costs more than a plain
 * sentence does.
 *
 * Links carry UTM tags (source = platform, campaign = jobs-<date>) so GA4 can
 * tell which post sent a reader to an apply button. Instagram captions can't
 * hold clickable links, so there the list has no URLs and the closing points
 * to the link in bio.
 */

import { routes } from '../content/i18n'
import { DRAFTING_MODEL, structuredCall } from '../lib/anthropic'
import type { Band } from '../lib/bands'
import type { ListingView } from '../sanity/queries'
import { jobFacts, NEWSLETTER } from './content'
import type { CaptionParts, Channel } from './store'

/** Public origin: the main site serves the board's English pages at /en/jobs. */
const PUBLIC_ORIGIN = 'https://effectiefaltruisme.nl'

const BAND_PHRASE: Record<Band, string> = {
  vetted: 'at a vetted organisation',
  routes: 'a way in (internship, traineeship or paid programme)',
  dutch: 'with leverage in a Dutch institution',
}

export function tagged(url: string, channel: Channel, postDate: string): string {
  const u = new URL(url)
  u.searchParams.set('utm_source', channel === 'instagram' ? 'instagram' : 'linkedin')
  u.searchParams.set('utm_medium', 'social')
  u.searchParams.set('utm_campaign', `jobs-${postDate}`)
  if (channel !== 'instagram') u.searchParams.set('utm_content', channel === 'linkedinOrg' ? 'ean' : 'james')
  return u.toString()
}

export function jobUrl(listing: ListingView): string {
  return `${PUBLIC_ORIGIN}${routes('en').detail(listing.slug)}`
}

const newsletterUrl = () => `https://${NEWSLETTER}`

/** "Title, Organisation", unless the title already names it ("Director of Partnerships at Taimaka"). */
export function roleLine(listing: ListingView): string {
  const org = listing.employer?.name?.trim()
  if (!org || listing.title.toLowerCase().includes(org.toLowerCase())) return listing.title
  return `${listing.title}, ${org}`
}

/** The finished caption: the model's parts around the list the code builds. */
export function compose(channel: Channel, parts: CaptionParts, listings: ListingView[], postDate: string): string {
  const list =
    channel === 'instagram'
      ? listings.map((l) => `• ${roleLine(l)}`).join('\n')
      : listings.map((l, i) => `${i + 1}. ${roleLine(l)}\n${tagged(jobUrl(l), channel, postDate)}`).join('\n\n')

  const blocks = [parts.hook.trim(), list, parts.closing.trim()]
  if (channel === 'instagram') {
    blocks.push(`All roles: effectiefaltruisme.nl/en/jobs`)
  } else {
    // The closing already says the link follows, so it stands on its own line.
    blocks.push(tagged(newsletterUrl(), channel, postDate))
  }
  const tags = parts.hashtags.map((t) => `#${t.replace(/^#/, '').replace(/\s+/g, '')}`).filter((t) => t.length > 1)
  if (tags.length) blocks.push(tags.join(' '))
  return blocks.filter(Boolean).join('\n\n')
}

const PART_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['hook', 'closing', 'hashtags'],
  properties: {
    hook: { type: 'string' },
    closing: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
  },
} as const

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['instagram', 'linkedinOrg', 'linkedinPersonal'],
  properties: { instagram: PART_SCHEMA, linkedinOrg: PART_SCHEMA, linkedinPersonal: PART_SCHEMA },
} as const

const SYSTEM = `You write the captions for EA Netherlands' weekly jobs post: a carousel of roles from its job board, posted every Tuesday on Instagram and LinkedIn. EA Netherlands (Effective Altruism Netherlands) helps people in the Netherlands find the best ways to help others. The job board lists roles working on the world's most pressing problems that people based in the Netherlands can do: remote, hybrid or on site.

For each of three channels you write only:
- "hook": the opening, one to three short sentences. Say what this is (this week's jobs you can do from the Netherlands, on the world's most pressing problems) and name the problem areas that this week's roles actually cover, in plain words.
- "closing": one or two sentences after the list, inviting people to sign up for the monthly email (new jobs and programmes, events across the Netherlands, and one EA Forum post worth their time). It is free. On LinkedIn the sign-up link is put on its own line straight after the closing, so end the closing by pointing to it ("Sign up below.").
- "hashtags".

The code puts the list of jobs between the hook and the closing, and adds the links. So never list the jobs, never repeat titles, salaries or deadlines, and never write a URL.

The channels:
- "instagram": EA Netherlands' account. Links aren't clickable, so the closing says the sign-up link is in the bio. Three to five hashtags, lowercase, no spaces, e.g. "effectivealtruism", "impactjobs".
- "linkedinOrg": EA Netherlands' company page. Slightly more professional than Instagram. The sign-up link follows the closing, so the closing can say "link below". Zero to three hashtags.
- "linkedinPersonal": James Herbert's own profile; he is co-director of EA Netherlands. First person, warm and direct, as someone sharing roles he thinks are worth a look with his network. Don't invent anything about him: no anecdotes, no claims about people he knows or what he did. The sign-up link follows the closing. No hashtags.

Voice: plain, warm, honest, second person. British English. Sentence case. No emoji, no exclamation marks, no hype ("amazing", "exciting", "don't miss"). Don't overclaim: these are good roles to consider, not guaranteed impact. Write as EA Netherlands talks on its website, not as a recruiter.

Use only the facts given. Each channel's text should read on its own; don't make them identical.`

type JobBrief = {
  title: string
  organisation: string
  kind: string
  problemArea: string | null
  facts: string[]
}

function brief(listing: ListingView, band: Band): JobBrief {
  const facts = jobFacts(listing)
  return {
    title: listing.title,
    organisation: listing.employer?.name ?? '',
    kind: BAND_PHRASE[band],
    problemArea: facts.find((f) => f.icon === 'world')?.text ?? null,
    facts: facts.map((f) => f.text),
  }
}

export async function draftCaptionParts(
  jobs: { listing: ListingView; band: Band }[],
  postDay: string,
): Promise<Record<Channel, CaptionParts>> {
  const user = [
    `Posting day: ${postDay}.`,
    `${jobs.length} roles this week, in slide order:`,
    JSON.stringify(
      jobs.map((j) => brief(j.listing, j.band)),
      null,
      2,
    ),
  ].join('\n\n')
  const { value } = await structuredCall<Record<Channel, CaptionParts>>({
    model: DRAFTING_MODEL,
    system: SYSTEM,
    user,
    schema: SCHEMA,
    maxTokens: 8000,
  })
  return value
}
