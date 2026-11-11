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
 * Drafting: one call writes the English slides, the Dutch slides and both
 * captions. A Forum essay is summarised; a CEA post is read off its slide
 * images and kept close to CEA's own words. Facts come only from the source,
 * and anything a reader in the Netherlands could trip on (a US-only figure, a
 * date that will age) comes back as a flag for James instead of being changed
 * silently. The credit and the link are added by the code, never the model.
 */

import { DRAFTING_MODEL, structuredCall } from '../../lib/anthropic'
import {
  fetchImages,
  forumCandidates,
  forumPostText,
  instagramSourceEnabled,
  instagramSources,
  sourceKey,
  type Candidate,
  type InstagramSource,
  type SourceRef,
} from './sources'
import type { ExplainerChannel, Lang, SlideText, Suggestion } from './store'

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

/** Highest score first, newest first among equals; Forum and Instagram interleaved. */
export function shortlist(candidates: Candidate[], used: Set<string>, size = SHORTLIST): Candidate[] {
  const fresh = candidates.filter((c) => !used.has(sourceKey(c)))
  const byKind = (kind: Candidate['kind']) =>
    fresh
      .filter((c) => c.kind === kind)
      .sort((a, b) => b.score - a.score || b.publishedAt.localeCompare(a.publishedAt))
  const forum = byKind('forum')
  const insta = byKind('instagram')
  const out: Candidate[] = []
  while (out.length < size && (forum.length || insta.length)) {
    if (forum.length) out.push(forum.shift()!)
    if (insta.length && out.length < size) out.push(insta.shift()!)
  }
  return out
}

export type Gathered = { candidates: Candidate[]; instagram: InstagramSource[]; problems: string[] }

/** Everything that could be used this week, and what went wrong getting it. */
export async function gatherCandidates(options: { instagramToken?: string | null } = {}): Promise<Gathered> {
  const problems: string[] = []
  const forum = await forumCandidates().catch((err) => {
    problems.push((err as Error).message)
    return [] as Candidate[]
  })
  let instagram: InstagramSource[] = []
  if (instagramSourceEnabled()) {
    if (!options.instagramToken) problems.push('CEA’s Instagram is switched on, but Instagram isn’t connected.')
    else
      instagram = await instagramSources(options.instagramToken).catch((err) => {
        problems.push((err as Error).message)
        return []
      })
  }
  return { candidates: [...forum, ...instagram.map((s) => s.candidate)], instagram, problems }
}

const PICK_SYSTEM = `You choose the source for EA Netherlands' weekly explainer: a short carousel that explains one idea from effective altruism, posted in Dutch on EA Netherlands' Instagram and in English on its co-director James Herbert's LinkedIn. The audience is people in the Netherlands, aged 25 to 44, curious about doing good effectively, mostly not yet involved in effective altruism.

You get a shortlist of candidates: curated EA Forum posts and posts from the Centre for Effective Altruism's Instagram. Rank the best four. A good pick:
- explains an idea, a finding or an argument that someone new to effective altruism can follow in six slides, without the Forum's jargon;
- still reads well months from now: not an announcement, a deadline, an event, a job ad, a fundraiser or a reply to another post;
- is about something EA Netherlands' audience can relate to;
- isn't on the same topic as the recent posts listed, so the weeks rotate between causes and ideas;
- for Forum posts: a post whose core can be stated fairly in a few slides. Avoid heavy technical or internal debates (grant-sizing formulas, model critiques that need the original to make sense).

Engagement (score) is a hint about what resonates, not the deciding factor.

For each pick give its id exactly as given, a one-sentence reason addressed to James ("A clear case for ..."), and a short topic label in English sentence case ("Farmed animal welfare", "AI safety", "Global health", "How to choose a career").`

const PICK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['picks'],
  properties: {
    picks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'reason', 'topic'],
        properties: { id: { type: 'string' }, reason: { type: 'string' }, topic: { type: 'string' } },
      },
    },
  },
} as const


/** The model's top four from the shortlist; falls back to the shortlist's order. */
export async function rankCandidates(list: Candidate[], recentTopics: string[]): Promise<Suggestion[]> {
  const fallback = () =>
    list.slice(0, 4).map((c) => ({ ...ref(c), reason: 'Highly rated on its source.', topic: c.topics[0] ?? '' }))
  if (!list.length) return []
  try {
    const user = [
      recentTopics.length ? `Recent explainers, newest first: ${recentTopics.join('; ')}.` : 'No explainers posted yet.',
      'Candidates:',
      JSON.stringify(
        list.map((c) => ({
          id: sourceKey(c),
          source: c.kind === 'forum' ? 'EA Forum (curated)' : 'CEA on Instagram',
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
    const { value } = await structuredCall<{ picks: { id: string; reason: string; topic: string }[] }>({
      model: DRAFTING_MODEL,
      system: PICK_SYSTEM,
      user,
      schema: PICK_SCHEMA,
      maxTokens: 6000,
    })
    const byKey = new Map(list.map((c) => [sourceKey(c), c]))
    const ranked = value.picks
      .map((p) => {
        const c = byKey.get(p.id)
        return c ? { ...ref(c), reason: p.reason, topic: p.topic } : null
      })
      .filter((r): r is Suggestion => r !== null)
    return ranked.length ? ranked.slice(0, 4) : fallback()
  } catch {
    return fallback()
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
  required: ['en', 'nl', 'linkedinPersonal', 'instagram', 'hashtags', 'flags'],
  properties: {
    en: SLIDES_SCHEMA,
    nl: SLIDES_SCHEMA,
    linkedinPersonal: { type: 'string' },
    instagram: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
    flags: { type: 'array', items: { type: 'string' } },
  },
} as const

const DRAFT_SYSTEM = `You adapt one piece of effective altruism writing into EA Netherlands' weekly explainer: a carousel of slides plus captions. English goes on James Herbert's own LinkedIn (he is co-director of EA Netherlands); Dutch goes on EA Netherlands' Instagram. The audience is people in the Netherlands, mostly new to effective altruism.

Slides, written first in English ("en"), then the same slides in Dutch ("nl"):
- "cover": "headline" is the question or claim the carousel answers, at most ${LIMITS.headline} characters. "marked" is the last few words of the headline, copied exactly, which get a yellow highlighter: the phrase that matters most. "sub" is one sentence, at most ${LIMITS.sub} characters, saying what the reader will get.
- "points": ${LIMITS.minPoints} to ${LIMITS.maxPoints} slides that carry the argument in order. Each has a "heading" (at most ${LIMITS.heading} characters) and a "body" (at most ${LIMITS.body} characters, one to three short sentences). One idea per slide. The last point lands the takeaway.
- Don't write a credit, a call to action or a closing slide; the code adds those.

Faithfulness:
- Use only what the source says. No new facts, figures or examples. Keep numbers exactly as the source gives them, with their unit and place ("in the US").
- State the author's view as theirs when it's an argument rather than a finding ("Lewis Bollard argues ..."). Don't make it sound more certain than the source.
- If something would mislead or confuse a reader in the Netherlands (a US-only figure presented as general, a reference to a date or event that has passed, an unexplained acronym you couldn't avoid), keep it accurate and add a flag.
- For a Centre for Effective Altruism post, the source is its slide images and caption: keep close to their wording and order, tightened to fit.
- For a Forum post: pick the core of the argument a newcomer can follow, not a summary of every section.

Captions (body text only; the code appends the credit and link, and Instagram hashtags):
- "linkedinPersonal": English, in James's first person, warm and direct, as someone sharing an idea he thinks is worth a few minutes. 60 to 150 words. Open with the idea, not with "I came across". Don't invent anything about James: no anecdotes, no opinions he hasn't stated, nothing about people he knows. End by inviting people to swipe through. No hashtags, no URLs.
- "instagram": Dutch, in EA Netherlands' voice (je/jij, plain and warm). 40 to 120 words. End by pointing to the slides. No hashtags, no URLs.
- "hashtags": three to five lowercase Instagram hashtags without "#", Dutch or English as people in the Netherlands would use them (e.g. "effectiefaltruisme", "effectivealtruism", "dierenwelzijn").

"flags": short notes for James about anything to check before approving: figures you couldn't verify from the slides, US-specific numbers, claims that may have changed since publication, wording you were unsure how to translate. Empty if there is nothing.

Voice in both languages: plain, warm, honest, sentence case, no emoji, no exclamation marks, no hype. British English. Dutch that reads as written in Dutch, not translated: natural word order, "je" not "u", common words over anglicisms where a Dutch word is normal, but keep established terms ("effectief altruïsme", "AI").`

export type Draft = {
  slides: Record<Lang, SlideText>
  captions: Record<ExplainerChannel, string>
  flags: string[]
}

type ModelDraft = {
  en: SlideText
  nl: SlideText
  linkedinPersonal: string
  instagram: string
  hashtags: string[]
  flags: string[]
}

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
export function credit(source: SourceRef, lang: Lang): string {
  if (source.kind === 'forum') {
    return lang === 'en'
      ? `Adapted from “${source.title}” by ${source.author} on the EA Forum (CC BY 4.0).`
      : `Gebaseerd op “${source.title}” van ${source.author} op het EA Forum (CC BY 4.0).`
  }
  return lang === 'en'
    ? 'Adapted from a post by the Centre for Effective Altruism (@effectivealtruismofficial).'
    : 'Gebaseerd op een post van het Centre for Effective Altruism (@effectivealtruismofficial).'
}

/** The finished captions: the model's text, then the credit (and on LinkedIn the links). */
export function composeCaptions(
  source: SourceRef,
  draft: Pick<ModelDraft, 'linkedinPersonal' | 'instagram' | 'hashtags'>,
  postDate: string,
): Record<ExplainerChannel, string> {
  const newsletter = new URL(NEWSLETTER_URL)
  newsletter.searchParams.set('utm_source', 'linkedin')
  newsletter.searchParams.set('utm_medium', 'social')
  newsletter.searchParams.set('utm_campaign', `explainer-${postDate}`)
  newsletter.searchParams.set('utm_content', 'james')
  const tags = draft.hashtags
    .map((h) => h.replace(/^#/, '').replace(/\s+/g, '').toLowerCase())
    .filter(Boolean)
    .slice(0, 5)
    .map((h) => `#${h}`)
    .join(' ')
  return {
    linkedinPersonal: [
      draft.linkedinPersonal.trim(),
      `${credit(source, 'en')} ${source.kind === 'forum' ? 'Read the whole post' : 'The original'}: ${source.url}`,
      `One EA Forum post worth your time, plus jobs and events in the Netherlands, once a month: ${newsletter}`,
    ].join('\n\n'),
    instagram: [draft.instagram.trim(), credit(source, 'nl'), tags].filter(Boolean).join('\n\n'),
  }
}

/** Writes the slides and captions for one source. */
export async function draftFrom(
  source: SourceRef,
  options: { postDate: string; instagram?: InstagramSource | null },
): Promise<Draft> {
  let user: string
  let images: Awaited<ReturnType<typeof fetchImages>> | undefined
  if (source.kind === 'forum') {
    const text = await forumPostText(source.id)
    user = [
      `Source: a curated EA Forum post, “${source.title}” by ${source.author}, published ${source.publishedAt.slice(0, 10)}.`,
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
    system: DRAFT_SYSTEM,
    user,
    schema: DRAFT_SCHEMA,
    maxTokens: 16_000,
    images,
  })
  const slides = { en: tidySlides(value.en), nl: tidySlides(value.nl) }
  if (slides.en.points.length < LIMITS.minPoints || slides.nl.points.length < LIMITS.minPoints) {
    throw new Error('The draft came back with too few slides. Redraft, or pick another source.')
  }
  return {
    slides,
    captions: composeCaptions(source, value, options.postDate),
    flags: value.flags.map((f) => f.trim()).filter(Boolean),
  }
}
