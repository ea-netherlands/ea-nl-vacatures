/**
 * Drafting a charity deep dive: one of Doneer Effectief's top charities, and
 * what the evaluator who recommends it found.
 *
 * The model reads the evaluator's report (and Doneer Effectief's own page,
 * for context) and writes the hook, the points and the caption's two parts.
 * As with the essay explainer, the code writes everything that has to be
 * right every time: what the series is, the credit, the links, and the three
 * things to do next (give through Doneer Effectief, take a pledge, get the
 * monthly email).
 *
 * An evaluation is a careful document: a best guess with its caveats. The
 * brief asks for the caveats to survive the summary, for every figure to keep
 * its unit, year and owner ("GiveWell estimates"), and for anything shaky to
 * come back as a flag for James.
 */

import { DRAFTING_MODEL, structuredCall } from '../../lib/anthropic'
import { LIMITS, newsletterCall, tidySlides, type Draft } from '../explainer/draft'
import type { SourceRef } from '../explainer/sources'
import type { ExplainerChannel, SlideText } from '../explainer/store'
import type { Charity, Report } from './catalogue'
import { DONEER_EFFECTIEF, DE_SITE, PLEDGE_PITCH, PLEDGE_SHOWN, PLEDGE_URL, possessive } from './copy'

const MIN_POINTS = 4

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['slides', 'opening', 'caption', 'hashtags', 'flags'],
  properties: {
    slides: {
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
    },
    opening: { type: 'string' },
    caption: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
    flags: { type: 'array', items: { type: 'string' } },
  },
} as const

const COMMON = `You write one of EA Netherlands' weekly charity deep dives: a carousel of slides plus a caption that walks through the research behind one charity. The charity is one of the top charities of ${DONEER_EFFECTIEF}, the Dutch platform for effective giving ("${DONEER_EFFECTIEF}" is a name: never translate it). You get the report of the independent evaluator that recommends the charity, and what ${DONEER_EFFECTIEF}'s own page says about it (in Dutch).

The reader is curious and sceptical: they have heard that some charities do far more good than others and want to know how anyone could know that. Show them the reasoning, not a sales pitch.

Slides:
- "cover": the hook, the slide that makes someone stop scrolling. Above the headline the code prints the charity's name and its cause, and below it who evaluated it, so the headline doesn't need to name them. "headline" is at most ${LIMITS.headline} characters and must be unmistakably about this one charity's work, never a general question about an idea that could head an essay (so not "Why do …" or "What happens when …"). Build it on one figure taken from the report or from ${DONEER_EFFECTIEF}'s page: an amount of money, a share, a count, a cost. State the figure, then ask the question it raises and the carousel answers ("83 cents of every dollar reaches someone in extreme poverty. Is that good enough?", "What does a $1,000 grant do for a family living on $2 a day?"). The figure follows every faithfulness rule below; if it is an estimate, "sub" says whose. If the report has no figure that can stand on a cover without its caveats, build the headline on the evaluator's main doubt instead ("Among the best-studied aid programmes there are. So what are evaluators still unsure about?"). "marked" is the last few words of the headline, copied exactly, which get a highlight. "sub" is one sentence, at most ${LIMITS.sub} characters, saying what the reader will get.
- The second slide is written by the code: it says what ${DONEER_EFFECTIEF} is and which charity and evaluator this week's is. Don't repeat it.
- "points": ${MIN_POINTS} to ${LIMITS.maxPoints} slides, each with a "heading" (at most ${LIMITS.heading} characters) and a "body" (at most ${LIMITS.body} characters, one to three short sentences). One idea per slide, in this order, leaving out a step the report doesn't cover:
  1. The problem: how big it is and who it affects.
  2. What the charity actually does about it.
  3. The evidence: how the evaluator knows it works (trials, monitoring, track record).
  4. What a donation buys: the evaluator's cost-effectiveness estimate, as theirs, with its unit and year.
  5. The doubts: the main uncertainty or weakness the evaluator names. Always include this one. An honest deep dive says what could be wrong.
  6. The takeaway: why the evaluator recommends it all the same.
- Don't write a credit, a call to donate or a closing slide; the code adds those.

Faithfulness:
- Use only what the report says, plus ${DONEER_EFFECTIEF}'s page where it adds something. No facts, figures or examples from your own memory.
- Put everything in your own words. The report is the evaluator's work: quote no more than a short phrase.
- Keep every figure exactly as given, with its currency, unit, place and year, and say whose it is ("GiveWell estimates", "by ${DONEER_EFFECTIEF}'s calculation"). Don't convert currencies. Don't round an estimate into a promise: "about $5,000 per life saved, by GiveWell's estimate", never "$5,000 saves a life".
- A "€100 ≈ …" figure from ${DONEER_EFFECTIEF}'s page may be used, attributed to ${DONEER_EFFECTIEF}. If it and the report's figures don't fit together, use the report's and add a flag.
- If the report is about a wider programme or a whole field and says little about this charity, say so in a flag and keep the claims as general as the report is.
- Don't make it sound more certain than the evaluator does.
- James may add guidance for a draft. Follow it. If it brings in context the report doesn't have (a current event, why this matters this week), you may use it, but as framing in James's or EA Netherlands' voice, never as something the evaluator said, and add a flag naming what you used.

"flags": short notes for James, in English. If the headline has a figure, the first flag starts "Cover figure:" and says exactly what the report says about it and where, so he can check the most visible number first. Then anything else to check before approving: figures that may be out of date, numbers you had to choose between, claims the report hedges that the slide states plainly, anything you simplified a lot. Empty if there is nothing.

The caption comes in two parts, "opening" and "caption"; the code adds the line saying what the series is, the credit, the links to the report, to ${DONEER_EFFECTIEF} and to the giving pledge, the newsletter and any hashtags. So don't describe ${DONEER_EFFECTIEF}, don't credit the evaluator's report, don't ask for donations and don't mention a pledge or the newsletter. Never write a URL.

Voice: plain, warm, honest, sentence case, no emoji, no exclamation marks, no hype, no guilt.`

const CHANNEL_BRIEF: Record<ExplainerChannel, string> = {
  linkedinPersonal: `This one is for James Herbert's own LinkedIn, in British English. James is co-director of EA Netherlands; his network is professionals in the Netherlands.

"opening": one or two short sentences that open the post and show before LinkedIn's "see more": the most striking thing the evaluation found, stated so people want to read on.
"caption": the rest, in James's first person, warm and direct. 60 to 130 words: what the charity does, what the evaluator found and what they are unsure about. Don't invent anything about James: no anecdotes, nothing about his own giving, and never what he thinks or felt about the charity. End by inviting people to swipe through the slides. No hashtags.
"hashtags": an empty list.`,
  instagram: `This one is for EA Netherlands' Instagram, in British English: plain English that Dutch readers with good but not native English follow easily (short sentences, everyday words, no idioms). The followers are people in the Netherlands aged 25 to 44, mostly new to effective altruism.

"opening": one or two short sentences that open the post: the most striking thing the evaluation found.
"caption": the rest, in EA Netherlands' voice (we/you, plain and warm). 40 to 100 words: what the charity does, what the evaluator found and what they are unsure about. End by pointing to the slides.
"hashtags": three to five lowercase hashtags without "#", as people in the Netherlands would use them (e.g. "effectivegiving", "effectiefaltruisme", "goededoelen").`,
}

type ModelDraft = { slides: SlideText; opening: string; caption: string; hashtags: string[]; flags: string[] }

function tracked(link: string, channel: ExplainerChannel, postDate: string): string {
  const url = new URL(link)
  url.searchParams.set('utm_source', channel === 'instagram' ? 'instagram' : 'linkedin')
  url.searchParams.set('utm_medium', 'social')
  url.searchParams.set('utm_campaign', `charity-${postDate}`)
  url.searchParams.set('utm_content', channel === 'instagram' ? 'ean' : 'james')
  return url.toString()
}

/** Says what the post is: one of the weekly deep dives, and which charity and evaluator. */
export function framing(channel: ExplainerChannel, source: SourceRef): string {
  const who = channel === 'linkedinPersonal' ? 'I take' : 'we take'
  return (
    `Each week ${who} one of the top charities of ${DONEER_EFFECTIEF}, the Dutch platform for effective giving, ` +
    `and walk through the research behind it. This week: ${source.title}, as evaluated by ${source.author}.`
  )
}

/**
 * The finished caption: the model's opening and summary, then the code's
 * framing, credit and three calls to action. LinkedIn gets real links;
 * Instagram can't, so it gets addresses short enough to type.
 */
export function composeCaption(
  channel: ExplainerChannel,
  source: SourceRef,
  draft: Pick<ModelDraft, 'opening' | 'caption' | 'hashtags'>,
  postDate: string,
): string {
  const parts = [draft.opening.trim(), framing(channel, source), draft.caption.trim()]
  const news = newsletterCall(channel, postDate, 'charity')
  if (channel === 'linkedinPersonal') {
    parts.push(
      `Summarised in my own words from ${possessive(source.author)} evaluation. It has the detail and the caveats: ${source.url}`,
      `Want to support ${source.title}? You can give through ${DONEER_EFFECTIEF}: ${tracked(source.donateUrl ?? source.pageUrl ?? `https://${DE_SITE}`, channel, postDate)}`,
      `${PLEDGE_PITCH} ${tracked(PLEDGE_URL, channel, postDate)}`,
      news,
    )
  } else {
    const tags = draft.hashtags
      .map((h) => h.replace(/^#/, '').replace(/\s+/g, '').toLowerCase())
      .filter(Boolean)
      .slice(0, 5)
      .map((h) => `#${h}`)
      .join(' ')
    parts.push(
      `Want to support ${source.title}? You can give through ${DONEER_EFFECTIEF} at ${DE_SITE}.`,
      `${PLEDGE_PITCH} See ${PLEDGE_SHOWN}`,
      news,
      `Summarised in our own words from ${possessive(source.author)} evaluation of ${source.title}.`,
      tags,
    )
  }
  return parts.filter(Boolean).join('\n\n')
}

/** Writes one account's deep dive from the reports that could be read. */
export async function draftCharity(
  charity: Charity,
  source: SourceRef,
  reports: (Report & { text: string })[],
  options: { channel: ExplainerChannel; postDate: string; guidance?: string },
): Promise<Draft> {
  const guidance = options.guidance?.trim()
  const user = [
    `The charity: ${charity.name}. Cause: ${charity.cause}. Evaluated by ${source.author}.`,
    ...reports.map((r, i) => `${i === 0 ? 'The evaluator’s report' : 'Also from an evaluator'} (${r.evaluator}, ${r.url}):\n\n${r.text}`),
    `What ${DONEER_EFFECTIEF}’s page says (in Dutch):\n\n${charity.pageText}`,
    ...(guidance
      ? [`James's guidance for this draft (he is reviewing it; the post goes out in the week of ${options.postDate}):\n${guidance}`]
      : []),
  ].join('\n\n---\n\n')

  const { value } = await structuredCall<ModelDraft>({
    model: DRAFTING_MODEL,
    system: `${COMMON}\n\n${CHANNEL_BRIEF[options.channel]}`,
    user,
    schema: SCHEMA,
    maxTokens: 12_000,
  })
  const slides = tidySlides(value.slides)
  if (slides.points.length < LIMITS.minPoints) {
    throw new Error('The draft came back with too few slides. Redraft, or pick another charity.')
  }
  return {
    slides,
    caption: composeCaption(options.channel, source, value, options.postDate),
    flags: value.flags.map((f) => f.trim()).filter(Boolean),
  }
}
