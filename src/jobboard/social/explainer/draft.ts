/**
 * Picking the week's source and drafting the explainer from it.
 *
 * Picking: the code gathers what may be used (sources.ts) minus anything used
 * or passed on before, then the model ranks a shortlist. Judging whether a
 * post still reads well in six months, whether it lands with people in the
 * Netherlands who are new to effective altruism, and whether it repeats last
 * week's topic is judgement, not arithmetic. If the model fails, the shortlist
 * falls back to the code's own order.
 *
 * Each account gets its own source (James, 11 Nov 2026): the model ranks the
 * shortlist separately for James's LinkedIn network and for EA Nederland's
 * Instagram followers, and the two never share a source.
 *
 * Drafting: one call per account writes its slides and caption, in English for
 * both (James, 11 Nov 2026). A Forum essay is summarised; a CEA post is read
 * off its slide images and kept close to CEA's own words. Facts come only from the source,
 * and anything a reader in the Netherlands could trip on (a US-only figure, a
 * date that will age) comes back as a flag for James instead of being changed
 * silently. The credit and the link are added by the code, never the model.
 */

import { DRAFTING_MODEL, structuredCall } from '../../lib/anthropic'
import {
  fetchImages,
  forumCandidates,
  ceaSourcesEnabled,
  FORUM_ABOUT,
  forumPostText,
  handbookCandidates,
  isCcBy,
  instagramSources,
  sourceKey,
  type Candidate,
  type InstagramSource,
  type SourceRef,
} from './sources'
import type { ExplainerChannel, SlideText, Suggestion } from './store'

/** Slide text budgets; the renderer shrinks type to fit these, not more. */
export const LIMITS = {
  headline: 80,
  sub: 160,
  heading: 70,
  body: 300,
  minPoints: 3,
  maxPoints: 6,
} as const

const SHORTLIST = 14

type Pool = 'recent' | 'instagram' | 'handbook' | 'classic'
const POOLS: Pool[] = ['recent', 'instagram', 'handbook', 'classic']
const RECENT_DAYS = 2 * 365

/** Which pool a candidate competes in, so old high-karma classics can't crowd out this year's posts. */
export function poolOf(c: Candidate, now = new Date()): Pool {
  if (c.kind === 'instagram') return 'instagram'
  if (c.via === 'handbook') return 'handbook'
  return now.getTime() - new Date(c.publishedAt).getTime() < RECENT_DAYS * 864e5 ? 'recent' : 'classic'
}

/** Highest score first within each pool (newest first among equals), the pools taken in turn. */
export function shortlist(candidates: Candidate[], used: Set<string>, size = SHORTLIST, now = new Date()): Candidate[] {
  const fresh = candidates.filter((c) => !used.has(sourceKey(c)))
  const queues = POOLS.map((pool) =>
    fresh
      .filter((c) => poolOf(c, now) === pool)
      .sort((a, b) => b.score - a.score || b.publishedAt.localeCompare(a.publishedAt)),
  )
  const out: Candidate[] = []
  while (out.length < size && queues.some((q) => q.length)) {
    for (const q of queues) if (q.length && out.length < size) out.push(q.shift()!)
  }
  return out
}

export type Gathered = { candidates: Candidate[]; instagram: InstagramSource[]; problems: string[] }

/** Everything that could be used this week, and what went wrong getting it. */
export async function gatherCandidates(options: { instagramToken?: string | null } = {}): Promise<Gathered> {
  const problems: string[] = []
  const [curated, handbook] = await Promise.all([
    forumCandidates().catch((err) => {
      problems.push((err as Error).message)
      return [] as Candidate[]
    }),
    handbookCandidates().catch((err) => {
      problems.push(`Handbook: ${(err as Error).message}`)
      return [] as Candidate[]
    }),
  ])
  // A curated post that is also in the handbook counts once, as the handbook's.
  const inHandbook = new Set(handbook.map((c) => c.id))
  const forum = [...handbook, ...curated.filter((c) => !inHandbook.has(c.id))]
  let instagram: InstagramSource[] = []
  if (ceaSourcesEnabled()) {
    if (!options.instagramToken) problems.push('CEA’s Instagram is switched on, but Instagram isn’t connected.')
    else
      instagram = await instagramSources(options.instagramToken).catch((err) => {
        problems.push((err as Error).message)
        return []
      })
  }
  return { candidates: [...forum, ...instagram.map((s) => s.candidate)], instagram, problems }
}

const PICK_SYSTEM = `You choose the sources for EA Netherlands' weekly explainers: short carousels that each explain one idea from effective altruism. There are two each week, from two different sources:
- "linkedinPersonal": in English on James Herbert's own LinkedIn (he is co-director of EA Netherlands). His network: professionals in the Netherlands, many thinking about their career, their giving or their organisation's work.
- "instagram": on EA Netherlands' Instagram, also in English. Its followers: people in the Netherlands aged 25 to 44, curious about doing good effectively, mostly new to effective altruism.

You get a shortlist of candidates: curated EA Forum posts, posts from the EA Forum's Introduction to Effective Altruism Handbook (written for newcomers, so often the most accessible), and posts from the Centre for Effective Altruism's Instagram. For each account, rank its best four. A good pick:
- explains an idea, a finding or an argument that someone new to effective altruism can follow in about six slides, without the Forum's jargon;
- still holds up today: not an announcement, a deadline, an event, a job ad, a fundraiser or a reply to another post;
- suits that account's audience;
- isn't on the same topic as the recent explainers listed, so the weeks rotate between causes and ideas;
- for Forum posts: a post whose core can be stated fairly in a few slides. Avoid heavy technical or internal debates (grant-sizing formulas, model critiques that need the original to make sense).

The two accounts' first picks must be different sources, and preferably on different topics. Older posts are welcome, and the Forum's classics often make the best explainers, but skip any whose facts or framing have clearly dated. Engagement (score) is a hint about what resonates, not the deciding factor.

For each pick give its id exactly as given, a one-sentence reason addressed to James ("A clear case for ..."), and a short topic label in English sentence case ("Farmed animal welfare", "AI safety", "Global health", "How to choose a career").`

const PICKS = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'reason', 'topic'],
    properties: { id: { type: 'string' }, reason: { type: 'string' }, topic: { type: 'string' } },
  },
} as const

const PICK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['linkedinPersonal', 'instagram'],
  properties: { linkedinPersonal: PICKS, instagram: PICKS },
} as const

export type Rankings = Record<ExplainerChannel, Suggestion[]>

type RawPick = { id: string; reason: string; topic: string }

/**
 * Each account's list, best first, with no source on both lists' first place.
 * A source both lists want goes to the account that ranked it higher (LinkedIn
 * on a tie), and drops off the other's list.
 */
export function splitPicks(raw: Record<ExplainerChannel, RawPick[]>, list: Candidate[]): Rankings {
  const byKey = new Map(list.map((c) => [sourceKey(c), c]))
  const resolve = (picks: RawPick[]) => {
    const seen = new Set<string>()
    return picks
      .filter((p) => byKey.has(p.id) && !seen.has(p.id) && seen.add(p.id))
      .map((p) => ({ ...ref(byKey.get(p.id)!), reason: p.reason, topic: p.topic }))
  }
  const li = resolve(raw.linkedinPersonal)
  const ig = resolve(raw.instagram)
  const rank = (arr: Suggestion[], key: string) => arr.findIndex((s) => sourceKey(s) === key)
  const liOut = li.filter((s) => {
    const r = rank(ig, sourceKey(s))
    return r === -1 || rank(li, sourceKey(s)) <= r
  })
  const kept = new Set(liOut.map(sourceKey))
  const igOut = ig.filter((s) => !kept.has(sourceKey(s)))
  return { linkedinPersonal: liOut.slice(0, 4), instagram: igOut.slice(0, 4) }
}

/** Fallback when the model can't rank: the shortlist's order, dealt out alternately. */
export function dealOut(list: Candidate[]): Rankings {
  const out: Rankings = { linkedinPersonal: [], instagram: [] }
  list.slice(0, 8).forEach((c, i) => {
    out[i % 2 === 0 ? 'linkedinPersonal' : 'instagram'].push({
      ...ref(c),
      reason: 'Highly rated on its source.',
      topic: c.topics[0] ?? '',
    })
  })
  return out
}

/** Both accounts' best four from the shortlist. */
export async function rankCandidates(list: Candidate[], recentTopics: string[]): Promise<Rankings> {
  if (!list.length) return { linkedinPersonal: [], instagram: [] }
  try {
    const user = [
      recentTopics.length ? `Recent explainers, newest first: ${recentTopics.join('; ')}.` : 'No explainers posted yet.',
      'Candidates:',
      JSON.stringify(
        list.map((c) => ({
          id: sourceKey(c),
          source: c.via === 'handbook' ? 'EA Handbook' : c.kind === 'forum' ? 'EA Forum (curated)' : 'CEA on Instagram',
          title: c.title,
          author: c.author,
          published: c.publishedAt.slice(0, 10),
          score: c.score,
          tags: c.topics,
          opening: c.summary,
        })),
        null,
        2,
      ),
    ].join('\n\n')
    const { value } = await structuredCall<Record<ExplainerChannel, RawPick[]>>({
      model: DRAFTING_MODEL,
      system: PICK_SYSTEM,
      user,
      schema: PICK_SCHEMA,
      maxTokens: 8000,
    })
    const ranked = splitPicks(value, list)
    return ranked.linkedinPersonal.length && ranked.instagram.length ? ranked : dealOut(list)
  } catch {
    return dealOut(list)
  }
}

export const ref = (c: SourceRef): SourceRef => ({
  kind: c.kind,
  id: c.id,
  url: c.url,
  title: c.title,
  author: c.author,
  publishedAt: c.publishedAt,
})

// ── Drafting ────────────────────────────────────────────────────────────────

const SLIDES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cover', 'points'],
  properties: {
    cover: {
      type: 'object',
      additionalProperties: false,
      required: ['headline', 'marked', 'sub'],
      properties: { headline: { type: 'string' }, marked: { type: 'string' }, sub: { type: 'string' } },
    },
    points: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['heading', 'body'],
        properties: { heading: { type: 'string' }, body: { type: 'string' } },
      },
    },
  },
} as const

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['slides', 'caption', 'hashtags', 'flags'],
  properties: {
    slides: SLIDES_SCHEMA,
    caption: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
    flags: { type: 'array', items: { type: 'string' } },
  },
} as const

const COMMON = `You adapt one piece of effective altruism writing into one of EA Netherlands' weekly explainers: a carousel of slides plus a caption.

Slides:
- "cover": the hook, the slide that makes someone stop scrolling. "headline" is the question or claim the carousel answers, at most ${LIMITS.headline} characters; make it intriguing, not a title. Don't mention the source, the Forum or the author on the cover: the next slide (written by the code) introduces them. "marked" is the last few words of the headline, copied exactly, which get a yellow highlighter: the phrase that matters most. "sub" is one sentence, at most ${LIMITS.sub} characters, saying what the reader will get.
- "points": ${LIMITS.minPoints} to ${LIMITS.maxPoints} slides that carry the argument in order. Each has a "heading" (at most ${LIMITS.heading} characters) and a "body" (at most ${LIMITS.body} characters, one to three short sentences). One idea per slide. The last point lands the takeaway.
- Don't write a credit, a call to action or a closing slide; the code adds those.

Faithfulness:
- Use only what the source says. No new facts, figures or examples. Keep numbers exactly as the source gives them, with their unit and place ("in the US").
- State the author's view as theirs when it's an argument rather than a finding ("Lewis Bollard argues ..."). Don't make it sound more certain than the source.
- If something would mislead or confuse a reader in the Netherlands (a US-only figure presented as general, a reference to a date or event that has passed, an unexplained acronym you couldn't avoid), keep it accurate and add a flag.
- For a post more than a couple of years old, say when it was written where a figure depends on it ("in 2014, ..."), and flag any figure or claim that has probably changed since.
- For a Centre for Effective Altruism post, the source is its slide images and caption: keep close to their wording and order, tightened to fit.
- For a Forum post: pick the core of the argument a newcomer can follow, not a summary of every section.

"flags": short notes for James, in English, about anything to check before approving: figures you couldn't verify from the slides, US-specific numbers, claims that may have changed since publication, anything you simplified a lot. Empty if there is nothing.

The caption is body text only: the code appends a line introducing the EA Forum, the credit, the links and any hashtags, so don't describe the Forum or credit the author yourself. Never write a URL.

Voice: plain, warm, honest, sentence case, no emoji, no exclamation marks, no hype.`

const CHANNEL_BRIEF: Record<ExplainerChannel, string> = {
  linkedinPersonal: `This one is for James Herbert's own LinkedIn, in British English. James is co-director of EA Netherlands; his network is professionals in the Netherlands.

"caption": in James's first person, warm and direct, as someone sharing an idea he thinks is worth a few minutes. 60 to 150 words. Open with the idea, not with "I came across". Don't invent anything about James: no anecdotes, nothing about people he knows, and never what he thinks or felt about the piece ("I found it…", "I thought it was a clarifying way to…", "this changed how I…"). Sharing it is the endorsement; let the idea carry the caption. End by inviting people to swipe through. No hashtags.
"hashtags": an empty list.`,
  instagram: `This one is for EA Netherlands' Instagram, in British English: plain English that Dutch readers with good but not native English follow easily (short sentences, everyday words, no idioms). The followers are people in the Netherlands aged 25 to 44, mostly new to effective altruism.

"caption": in EA Netherlands' voice (we/you, plain and warm). 40 to 120 words. End by pointing to the slides.
"hashtags": three to five lowercase hashtags without "#", as people in the Netherlands would use them (e.g. "effectivealtruism", "effectiefaltruisme", "animalwelfare").`,
}

export type Draft = { slides: SlideText; caption: string; flags: string[] }

type ModelDraft = { slides: SlideText; caption: string; hashtags: string[]; flags: string[] }

/** Keeps the marked phrase a real ending of the headline, so the slide never highlights text that isn't there. */
export function tidySlides(s: SlideText): SlideText {
  const headline = s.cover.headline.trim()
  let marked = s.cover.marked.trim()
  if (!marked || !headline.endsWith(marked)) {
    const words = headline.split(/\s+/)
    marked = words.slice(-Math.min(3, Math.max(1, words.length - 1))).join(' ')
  }
  return {
    cover: { headline, marked, sub: s.cover.sub.trim() },
    points: s.points
      .slice(0, LIMITS.maxPoints)
      .map((p) => ({ heading: p.heading.trim(), body: p.body.trim() }))
      .filter((p) => p.heading || p.body),
  }
}

const NEWSLETTER_URL = 'https://effectiefaltruisme.nl/en/newsletter'

/** The credit line, which the code writes so it is always right. */
export function credit(source: SourceRef): string {
  if (source.kind === 'instagram') {
    return 'Adapted from a post by the Centre for Effective Altruism (@effectivealtruismofficial).'
  }
  const where = source.via === 'handbook' ? 'in the EA Forum’s Introduction to Effective Altruism Handbook' : 'on the EA Forum'
  return isCcBy(source)
    ? `Adapted from “${source.title}” by ${source.author} ${where} (CC BY 4.0).`
    : `Adapted with permission from “${source.title}” by ${source.author} ${where}.`
}

/** The finished caption: the model's text, then the credit (and on LinkedIn the links). */
export function composeCaption(
  channel: ExplainerChannel,
  source: SourceRef,
  draft: Pick<ModelDraft, 'caption' | 'hashtags'>,
  postDate: string,
): string {
  if (channel === 'linkedinPersonal') {
    const newsletter = new URL(NEWSLETTER_URL)
    newsletter.searchParams.set('utm_source', 'linkedin')
    newsletter.searchParams.set('utm_medium', 'social')
    newsletter.searchParams.set('utm_campaign', `explainer-${postDate}`)
    newsletter.searchParams.set('utm_content', 'james')
    return [
      draft.caption.trim(),
      ...(source.kind === 'forum' ? [FORUM_ABOUT] : []),
      `${credit(source)} ${source.kind === 'forum' ? 'Read the whole post' : 'The original'}: ${source.url}`,
      `One EA Forum post worth your time, plus jobs and events in the Netherlands, once a month: ${newsletter}`,
    ].join('\n\n')
  }
  const tags = draft.hashtags
    .map((h) => h.replace(/^#/, '').replace(/\s+/g, '').toLowerCase())
    .filter(Boolean)
    .slice(0, 5)
    .map((h) => `#${h}`)
    .join(' ')
  return [draft.caption.trim(), source.kind === 'forum' ? FORUM_ABOUT : '', credit(source), tags]
    .filter(Boolean)
    .join('\n\n')
}

/** Writes one account's slides and caption from one source. */
export async function draftFrom(
  source: SourceRef,
  options: { channel: ExplainerChannel; postDate: string; instagram?: InstagramSource | null },
): Promise<Draft> {
  let user: string
  let images: Awaited<ReturnType<typeof fetchImages>> | undefined
  if (source.kind === 'forum') {
    const text = await forumPostText(source.id)
    user = [
      `Source: ${source.via === 'handbook' ? 'a post in the EA Forum’s Introduction to Effective Altruism Handbook' : 'a curated EA Forum post'}, “${source.title}” by ${source.author}, published ${source.publishedAt.slice(0, 10)}.`,
      'The full text:',
      text,
    ].join('\n\n')
  } else {
    if (!options.instagram) throw new Error('That Instagram post is no longer available.')
    images = await fetchImages(options.instagram.images)
    user = [
      `Source: a post by the Centre for Effective Altruism on Instagram, published ${source.publishedAt.slice(0, 10)}. Its ${images.length} slide images are above, in order.`,
      'Its caption:',
      options.instagram.caption,
    ].join('\n\n')
  }

  const { value } = await structuredCall<ModelDraft>({
    model: DRAFTING_MODEL,
    system: `${COMMON}\n\n${CHANNEL_BRIEF[options.channel]}`,
    user,
    schema: DRAFT_SCHEMA,
    maxTokens: 12_000,
    images,
  })
  const slides = tidySlides(value.slides)
  if (slides.points.length < LIMITS.minPoints) {
    throw new Error('The draft came back with too few slides. Redraft, or pick another source.')
  }
  return {
    slides,
    caption: composeCaption(options.channel, source, value, options.postDate),
    flags: value.flags.map((f) => f.trim()).filter(Boolean),
  }
}
