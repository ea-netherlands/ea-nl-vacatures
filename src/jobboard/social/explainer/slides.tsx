/**
 * The weekly explainer's slides: the jobs post's frame (graph paper, logo,
 * pill, dashed footer rule; ../slides.tsx). The cover is the hook. For an
 * essay from the Forum, the second slide says what the carousel is: an
 * interesting essay shared on the EA Forum, which essay and by whom (James,
 * 11 Nov 2026); a reworked CEA post goes straight on. Then one slide per
 * point, and a closing slide that credits the source and offers the monthly
 * email.
 *
 * The image URL carries only the date, the account and the slide number,
 * plus a hash of the slide text so an edit shows straight away instead of
 * after the CDN's hour. The text itself is read from the stored post, so the
 * route can't be used to draw an EA Nederland slide saying anything else.
 */

import { createHash } from 'node:crypto'
import { TOKENS } from '../../og/card'
import { NEWSLETTER } from '../content'
import { Frame, Glyph, Marked, Swipe } from '../slides'
import { FORUM_ABOUT, isCcBy, isClassic, NEWSLETTER_PITCH, type SourceRef } from './sources'
import { CHANNEL_CODE, type ExplainerChannel, type ExplainerPost, type SlideText } from './store'

export const EXPLAINER_ROUTE = '/vacatures/social/explainer'
const SITE = 'effectiefaltruisme.nl'

const COPY = {
  pill: 'Explainer',
  of: 'of',
  cea: 'From the Centre for Effective Altruism',
  aboutHeading: (s: SourceRef) =>
    `${isClassic(s) ? 'A classic' : 'An essay'} from the EA Forum${s.via === 'handbook' ? '’s handbook' : ''}`,
  thisWeek: (s: SourceRef) => `This week: “${s.title}” by ${s.author}.`,
  written: (s: SourceRef, now = new Date()) => {
    const year = Number(s.publishedAt.slice(0, 4))
    return year && year < now.getFullYear() - 1 ? `Written in ${year}.` : ''
  },
  more: 'Want more like this?',
  signUp: (c: ExplainerChannel) =>
    c === 'instagram'
      ? 'Sign up through the link in our bio. It’s free, and you can unsubscribe any time.'
      : 'Sign up with the link in the post. It’s free, and you can unsubscribe any time.',
  read: (s: SourceRef) =>
    s.kind === 'forum'
      ? `The full essay: “${s.title}” by ${s.author}, on the EA Forum.`
      : 'Adapted from a post by the Centre for Effective Altruism. Follow @effectivealtruismofficial for more.',
  licence: (s: SourceRef) => (s.kind !== 'forum' ? '' : isCcBy(s) ? 'Adapted under CC BY 4.0.' : 'Adapted with permission.'),
} as const

export type ExplainerSlideContent =
  | { kind: 'cover'; text: SlideText['cover']; source: SourceRef; count: number }
  | { kind: 'about'; source: SourceRef; index: number; count: number }
  | { kind: 'point'; point: SlideText['points'][number]; index: number; count: number }
  | { kind: 'close'; channel: ExplainerChannel; source: SourceRef }

type Slidable = Pick<ExplainerPost, 'linkedinPersonal' | 'instagram'>

/** Every slide of one account's explainer, in order. */
export function explainerSlides(post: Slidable, channel: ExplainerChannel): ExplainerSlideContent[] {
  const item = post[channel]
  const text = item?.slides
  const source = item?.source
  if (!text || !source) return []
  const about = source.kind === 'forum'
  const first = about ? 3 : 2
  const count = text.points.length + first
  return [
    { kind: 'cover', text: text.cover, source, count },
    ...(about ? [{ kind: 'about' as const, source, index: 2, count }] : []),
    ...text.points.map((point, i) => ({ kind: 'point' as const, point, index: i + first, count })),
    { kind: 'close', channel, source },
  ]
}

/**
 * Bump whenever the slides' layout or order changes. The CDN keeps a slide for
 * an hour and may serve a stale one while it refreshes; without this, a URL
 * whose text hasn't changed could still hand Instagram the old layout.
 */
const LAYOUT_VERSION = 3

export function slideHash(text: SlideText | undefined, source: SourceRef | null): string {
  return createHash('sha256')
    .update(JSON.stringify([LAYOUT_VERSION, text ?? null, source?.title ?? null, source?.author ?? null]))
    .digest('hex')
    .slice(0, 10)
}

export function explainerSlidePaths(
  post: Slidable & Pick<ExplainerPost, 'postDate'>,
  channel: ExplainerChannel,
  format: 'png' | 'jpg' = 'png',
): string[] {
  const item = post[channel]
  const v = slideHash(item?.slides ?? undefined, item?.source ?? null)
  return explainerSlides(post, channel).map((_, i) => {
    const q = new URLSearchParams({ d: post.postDate, c: CHANNEL_CODE[channel], i: String(i), v })
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
  const copy = COPY

  if (content.kind === 'cover') {
    const { headline, marked, sub } = content.text
    const plain = headline.endsWith(marked) ? headline.slice(0, headline.length - marked.length).trim() : headline
    return (
      <Frame logo={logo} pill={copy.pill} footer={{ left: SITE, right: <Swipe /> }}>
        <Marked plain={plain} marked={headline.endsWith(marked) ? marked : ''} size={coverSize(headline)} />
        <div style={{ display: 'flex', marginTop: 48, fontSize: 44, lineHeight: 1.35 }}>{sub}</div>
        {content.source.kind === 'instagram' ? (
          <div style={{ display: 'flex', marginTop: 32, fontSize: 34, color: TOKENS.fgMuted }}>{copy.cea}</div>
        ) : null}
      </Frame>
    )
  }

  if (content.kind === 'about') {
    const written = copy.written(content.source)
    return (
      <Frame
        logo={logo}
        pill={copy.pill}
        footer={{
          left: SITE,
          right: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
              <div style={{ display: 'flex', color: TOKENS.fgMuted }}>{`${content.index} ${copy.of} ${content.count}`}</div>
              <Swipe />
            </div>
          ),
        }}
      >
        <div style={{ display: 'flex', fontFamily: 'Sentient', fontWeight: 500, fontSize: 84, lineHeight: 1.1 }}>
          {copy.aboutHeading(content.source)}
        </div>
        <div style={{ display: 'flex', marginTop: 48, fontSize: 44, lineHeight: 1.4, backgroundColor: TOKENS.white }}>
          {FORUM_ABOUT}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 24,
            marginTop: 56,
            paddingTop: 40,
            borderTop: `2px dashed ${TOKENS.border}`,
            fontSize: 42,
            lineHeight: 1.4,
            backgroundColor: TOKENS.white,
          }}
        >
          <div style={{ display: 'flex', flexShrink: 0, marginTop: 6 }}>
            <Glyph name="book" size={48} color={TOKENS.primaryFg} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex' }}>{copy.thisWeek(content.source)}</div>
            {written ? (
              <div style={{ display: 'flex', marginTop: 12, fontSize: 34, color: TOKENS.fgMuted }}>{written}</div>
            ) : null}
          </div>
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
              <Swipe />
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
        {copy.more}
      </div>
      <div style={{ display: 'flex', marginTop: 44, fontSize: 44, lineHeight: 1.4, backgroundColor: TOKENS.white }}>
        {NEWSLETTER_PITCH}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 28,
          fontSize: 40,
          lineHeight: 1.35,
          fontWeight: 600,
          color: TOKENS.primaryFg,
          backgroundColor: TOKENS.white,
        }}
      >
        {copy.signUp(content.channel)}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 20,
          marginTop: 56,
          paddingTop: 36,
          borderTop: `2px dashed ${TOKENS.border}`,
          fontSize: 34,
          lineHeight: 1.4,
          color: TOKENS.fgMuted,
          backgroundColor: TOKENS.white,
        }}
      >
        <div style={{ display: 'flex', flexShrink: 0, marginTop: 4 }}>
          <Glyph name="book" size={40} color={TOKENS.primaryFg} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex' }}>{copy.read(content.source)}</div>
          {licence ? <div style={{ display: 'flex', marginTop: 8, fontSize: 30 }}>{licence}</div> : null}
        </div>
      </div>
    </Frame>
  )
}
