/**
 * The weekly explainer's slides: the jobs post's frame (graph paper, logo,
 * pill, dashed footer rule; ../slides.tsx) with a cover, one slide per point
 * and a closing slide that credits the source and offers the monthly email.
 *
 * The image URL carries only the date, the language and the slide number,
 * plus a hash of the slide text so an edit shows straight away instead of
 * after the CDN's hour. The text itself is read from the stored post, so the
 * route can't be used to draw an EA Nederland slide saying anything else.
 */

import { createHash } from 'node:crypto'
import { TOKENS } from '../../og/card'
import { NEWSLETTER } from '../content'
import { Frame, Glyph, Marked, Swipe } from '../slides'
import type { SourceRef } from './sources'
import { CHANNEL_FOR_LANG, type ExplainerPost, type Lang, type SlideText } from './store'

export const EXPLAINER_ROUTE = '/vacatures/social/explainer'
const SITE = 'effectiefaltruisme.nl'

const COPY = {
  en: {
    pill: 'Explainer',
    swipe: 'Swipe',
    of: 'of',
    from: (s: SourceRef) =>
      s.kind === 'forum' ? `From the EA Forum, by ${s.author}` : 'From the Centre for Effective Altruism',
    deeper: 'Want to go deeper?',
    read: (s: SourceRef) =>
      s.kind === 'forum'
        ? `Read “${s.title}” by ${s.author} on the EA Forum.`
        : 'This is adapted from a post by the Centre for Effective Altruism. Follow @effectivealtruismofficial for more.',
    licence: (s: SourceRef) => (s.kind === 'forum' ? 'Adapted under CC BY 4.0.' : ''),
    monthly: 'One EA Forum post worth your time, plus jobs and events in the Netherlands, once a month.',
    free: 'It’s free. Sign up at the link below.',
  },
  nl: {
    pill: 'Uitgelegd',
    swipe: 'Swipe',
    of: 'van',
    from: (s: SourceRef) =>
      s.kind === 'forum' ? `Van het EA Forum, door ${s.author}` : 'Van het Centre for Effective Altruism',
    deeper: 'Meer weten?',
    read: (s: SourceRef) =>
      s.kind === 'forum'
        ? `Lees “${s.title}” van ${s.author} op het EA Forum (in het Engels).`
        : 'Gebaseerd op een post van het Centre for Effective Altruism. Volg @effectivealtruismofficial voor meer.',
    licence: (s: SourceRef) => (s.kind === 'forum' ? 'Bewerkt onder CC BY 4.0.' : ''),
    monthly: 'Elke maand één EA Forum-post die je tijd waard is, plus vacatures en evenementen in Nederland.',
    free: 'Gratis. Aanmelden via de link in onze bio.',
  },
} as const

export type ExplainerSlideContent =
  | { kind: 'cover'; lang: Lang; text: SlideText['cover']; source: SourceRef; count: number }
  | { kind: 'point'; lang: Lang; point: SlideText['points'][number]; index: number; count: number }
  | { kind: 'close'; lang: Lang; source: SourceRef }

type Slidable = Pick<ExplainerPost, 'linkedinPersonal' | 'instagram'>

/** Every slide of one language's explainer (English is LinkedIn's, Dutch Instagram's), in order. */
export function explainerSlides(post: Slidable, lang: Lang): ExplainerSlideContent[] {
  const item = post[CHANNEL_FOR_LANG[lang]]
  const text = item?.slides
  const source = item?.source
  if (!text || !source) return []
  const count = text.points.length + 2
  return [
    { kind: 'cover', lang, text: text.cover, source, count },
    ...text.points.map((point, i) => ({ kind: 'point' as const, lang, point, index: i + 2, count })),
    { kind: 'close', lang, source },
  ]
}

export function slideHash(text: SlideText | undefined, source: SourceRef | null): string {
  return createHash('sha256')
    .update(JSON.stringify([text ?? null, source?.title ?? null, source?.author ?? null]))
    .digest('hex')
    .slice(0, 10)
}

export function explainerSlidePaths(
  post: Slidable & Pick<ExplainerPost, 'postDate'>,
  lang: Lang,
  format: 'png' | 'jpg' = 'png',
): string[] {
  const item = post[CHANNEL_FOR_LANG[lang]]
  const v = slideHash(item?.slides ?? undefined, item?.source ?? null)
  return explainerSlides(post, lang).map((_, i) => {
    const q = new URLSearchParams({ d: post.postDate, l: lang, i: String(i), v })
    if (format === 'jpg') q.set('format', 'jpg')
    return `${EXPLAINER_ROUTE}?${q}`
  })
}

/** Type steps down as text gets longer, so a full slide still fits. */
function headingSize(text: string): number {
  if (text.length <= 34) return 88
  if (text.length <= 54) return 76
  return 66
}
function bodySize(text: string): number {
  if (text.length <= 160) return 46
  if (text.length <= 240) return 42
  return 38
}
function coverSize(text: string): number {
  if (text.length <= 40) return 108
  if (text.length <= 64) return 92
  return 80
}

export function ExplainerSlide({ content, logo }: { content: ExplainerSlideContent; logo: string }) {
  const copy = COPY[content.lang]

  if (content.kind === 'cover') {
    const { headline, marked, sub } = content.text
    const plain = headline.endsWith(marked) ? headline.slice(0, headline.length - marked.length).trim() : headline
    return (
      <Frame logo={logo} pill={copy.pill} footer={{ left: SITE, right: <Swipe label={copy.swipe} /> }}>
        <Marked plain={plain} marked={headline.endsWith(marked) ? marked : ''} size={coverSize(headline)} />
        <div style={{ display: 'flex', marginTop: 48, fontSize: 44, lineHeight: 1.35 }}>{sub}</div>
        <div style={{ display: 'flex', marginTop: 32, fontSize: 34, color: TOKENS.fgMuted }}>
          {copy.from(content.source)}
        </div>
      </Frame>
    )
  }

  if (content.kind === 'point') {
    return (
      <Frame
        logo={logo}
        pill={copy.pill}
        footer={{
          left: SITE,
          right: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
              <div style={{ display: 'flex', color: TOKENS.fgMuted }}>{`${content.index} ${copy.of} ${content.count}`}</div>
              <Swipe label={copy.swipe} />
            </div>
          ),
        }}
      >
        <div
          style={{
            display: 'flex',
            fontFamily: 'Sentient',
            fontWeight: 500,
            fontSize: headingSize(content.point.heading),
            lineHeight: 1.1,
          }}
        >
          {content.point.heading}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 48,
            fontSize: bodySize(content.point.body),
            lineHeight: 1.4,
            backgroundColor: TOKENS.white,
          }}
        >
          {content.point.body}
        </div>
      </Frame>
    )
  }

  const licence = copy.licence(content.source)
  return (
    <Frame
      logo={logo}
      footer={{
        left: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Glyph name="mail" size={40} color={TOKENS.primaryFg} />
            {NEWSLETTER}
          </div>
        ),
      }}
    >
      <div style={{ display: 'flex', fontFamily: 'Sentient', fontWeight: 500, fontSize: 96, lineHeight: 1.1 }}>
        {copy.deeper}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginTop: 48, fontSize: 42, lineHeight: 1.4 }}>
        <div style={{ display: 'flex', flexShrink: 0, marginTop: 6 }}>
          <Glyph name="book" size={48} color={TOKENS.primaryFg} />
        </div>
        <div style={{ display: 'flex', backgroundColor: TOKENS.white }}>{copy.read(content.source)}</div>
      </div>
      {licence ? (
        <div style={{ display: 'flex', marginTop: 20, marginLeft: 72, fontSize: 32, color: TOKENS.fgMuted }}>{licence}</div>
      ) : null}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: 64,
          paddingTop: 40,
          borderTop: `2px dashed ${TOKENS.border}`,
          backgroundColor: TOKENS.white,
        }}
      >
        <div style={{ display: 'flex', fontSize: 42, lineHeight: 1.4 }}>{copy.monthly}</div>
        <div style={{ display: 'flex', marginTop: 24, fontSize: 38, fontWeight: 600, color: TOKENS.primaryFg }}>
          {copy.free}
        </div>
      </div>
    </Frame>
  )
}
