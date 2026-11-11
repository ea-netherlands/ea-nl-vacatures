/**
 * The weekly post's slides, drawn by next/og (Satori) at 1080×1350.
 *
 * The website's look: graph paper on white (as behind its hero and the board's
 * — layout.module.css `.paper`), the logo top left, a white teal-ringed pill
 * top right, a Sentient headline, a dashed rule above the footer. The yellow
 * marker goes behind one phrase on the cover and nowhere else. Tabler icons,
 * no emoji: the post we modelled this on uses flags and emoji, which the
 * design system rules out.
 *
 * Every slide says what kind of role it is, in the board's own three bands, so
 * a reader can tell a long-shot job at a vetted organisation from a way in.
 */

import { iconPath } from '../components/Icon'
import type { Band } from '../lib/bands'
import { TOKENS } from '../og/card'
import { NEWSLETTER, SITE, type Fact, type SlideContent } from './content'

export const PAD = 88
const WIDTH = 1080
const HEIGHT = 1350

/**
 * The website's graph paper (theme.css `--graph-paper-*`): teal-100 at 55% every
 * fifth line, stone-100 at 65% between, on white. Satori can't layer CSS
 * gradients, so it is drawn as an SVG. Scaled up from the site's 24px/120px
 * grid because a slide is 1080px wide but seen at about 390px on a phone; at
 * 1:1 the lines would vanish.
 */
const MINOR = 54
const MAJOR = MINOR * 5

function graphPaper(): string {
  const lines = (step: number, color: string, opacity: number, width: number) => {
    const out: string[] = []
    // Centred like the site's `background-position: center top`
    const x0 = ((WIDTH / 2) % step) - step
    for (let x = x0; x <= WIDTH; x += step) out.push(`<line x1="${x}" y1="0" x2="${x}" y2="${HEIGHT}"/>`)
    for (let y = 0; y <= HEIGHT; y += step) out.push(`<line x1="0" y1="${y}" x2="${WIDTH}" y2="${y}"/>`)
    return `<g stroke="${color}" stroke-opacity="${opacity}" stroke-width="${width}">${out.join('')}</g>`
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">` +
    lines(MINOR, TOKENS.stone100, 0.65, 2) +
    lines(MAJOR, TOKENS.primaryMuted, 0.55, 2.5) +
    `</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

const PAPER = graphPaper()

/** One role, so singular where the board's section headings are plural. */
const BAND = {
  vetted: {
    label: 'At a vetted organisation',
    note: 'An independent evaluator, an EA funder or an EA job board has already vetted this organisation.',
  },
  routes: {
    label: 'A way in',
    note: 'An internship, traineeship or paid programme: a step into the teams doing the work.',
  },
  dutch: {
    label: 'With leverage in the Netherlands',
    note: 'A role at a Dutch institution that moves money, rules or people at scale.',
  },
} as const satisfies Record<Band, { label: string; note: string }>

const FUNDING = {
  label: 'Funding to apply for',
  note: 'A grant or funding round for work on this problem, not a job.',
}

export function Glyph({ name, size, color }: { name: Fact['icon'] | 'arrow-right' | 'mail' | 'book' | 'bulb'; size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={iconPath(name)} />
    </svg>
  )
}

export function Pill({ children }: { children: string }) {
  return (
    <div
      style={{
        display: 'flex',
        padding: '12px 28px',
        borderRadius: 999,
        backgroundColor: TOKENS.white,
        border: `2px solid ${TOKENS.primaryEmphasized}`,
        color: TOKENS.primaryFg,
        fontSize: 30,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  )
}

export function Frame({
  logo,
  pill,
  footer,
  children,
}: {
  logo: string
  pill?: string
  footer: { left: React.ReactNode; right?: React.ReactNode }
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: TOKENS.white,
        color: TOKENS.fg,
        fontFamily: 'Atkinson',
        padding: `${PAD}px`,
        position: 'relative',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders <img>, not next/image */}
      <img src={PAPER} width={WIDTH} height={HEIGHT} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders <img>, not next/image */}
        <img src={logo} height={88} width={211} alt="" />
        {pill ? <Pill>{pill}</Pill> : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>{children}</div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `2px dashed ${TOKENS.border}`,
          paddingTop: 32,
          fontSize: 32,
          color: TOKENS.primaryFg,
          fontWeight: 600,
          backgroundColor: TOKENS.white,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>{footer.left}</div>
        {footer.right ? <div style={{ display: 'flex' }}>{footer.right}</div> : null}
      </div>
    </div>
  )
}

/** Long titles shrink before they wrap past four lines. */
function titleSize(text: string): number {
  if (text.length <= 30) return 96
  if (text.length <= 55) return 84
  if (text.length <= 85) return 72
  return 60
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

export const Swipe = ({ label = 'Swipe' }: { label?: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    {label}
    <Glyph name="arrow-right" size={36} color={TOKENS.primaryFg} />
  </div>
)

/**
 * A headline whose last words carry the marker. Satori lays out each span as a
 * box, so a marked phrase that wraps would get one solid block; marking word
 * by word, with the space inside the mark, follows the lines like a highlighter.
 */
export function Marked({ plain, marked, size }: { plain: string; marked: string; size: number }) {
  const gap = Math.round(size * 0.24)
  const words = marked.split(' ')
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', fontFamily: 'Sentient', fontWeight: 500, fontSize: size, lineHeight: 1.1 }}>
      {plain.split(' ').map((word, i) => (
        <span key={`w${i}`} style={{ paddingRight: gap }}>
          {word}
        </span>
      ))}
      {words.map((word, i) => (
        <span
          key={`m${i}`}
          style={{
            backgroundColor: TOKENS.marker,
            paddingLeft: i === 0 ? 10 : 0,
            paddingRight: i === words.length - 1 ? 10 : gap,
            marginLeft: i === 0 ? -10 : 0,
          }}
        >
          {word}
        </span>
      ))}
    </div>
  )
}

/** Themed headlines run longer ("7 jobs in AI safety and catastrophic risks, …"). */
function coverSize(text: string): number {
  if (text.length <= 42) return 112
  if (text.length <= 62) return 96
  return 84
}

export function Slide({ content, logo }: { content: SlideContent; logo: string }) {
  if (content.kind === 'cover') {
    return (
      <Frame
        logo={logo}
        pill={content.funding ? 'Opportunities this week' : 'Jobs this week'}
        footer={{ left: SITE, right: <Swipe /> }}
      >
        <Marked plain={content.plain} marked={content.marked} size={coverSize(content.plain + content.marked)} />
        <div style={{ display: 'flex', marginTop: 48, fontSize: 44, lineHeight: 1.35 }}>{content.sub}</div>
        <div style={{ display: 'flex', marginTop: 32, fontSize: 36, color: TOKENS.fgMuted }}>
          {`Picked from our job board · ${content.date}`}
        </div>
      </Frame>
    )
  }

  if (content.kind === 'job') {
    const title = clip(content.title, 110)
    const band = content.funding ? FUNDING : BAND[content.band]
    return (
      <Frame
        logo={logo}
        pill={band.label}
        footer={{
          left: SITE,
          // A wrapping div, not a fragment: Satori merges a fragment's children
          right: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
              <div style={{ display: 'flex', color: TOKENS.fgMuted }}>{`${content.index} of ${content.count}`}</div>
              {content.index < content.count ? <Swipe /> : null}
            </div>
          ),
        }}
      >
        <div style={{ display: 'flex', fontSize: 44, fontWeight: 600, color: TOKENS.primaryFg, marginBottom: 20 }}>
          {clip(content.employer, 48)}
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Sentient',
            fontWeight: 500,
            fontSize: titleSize(title),
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginTop: 56 }}>
          {content.facts.map((fact) => (
            <div key={fact.icon} style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 42 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 72,
                  height: 72,
                  flexShrink: 0,
                  borderRadius: 999,
                  backgroundColor: TOKENS.white,
                  border: `2px solid ${TOKENS.primaryEmphasized}`,
                }}
              >
                <Glyph name={fact.icon} size={38} color={TOKENS.primaryFg} />
              </div>
              <div style={{ display: 'flex' }}>{clip(fact.text, 40)}</div>
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 56,
            fontSize: 34,
            lineHeight: 1.4,
            color: TOKENS.fgMuted,
            backgroundColor: TOKENS.white,
          }}
        >
          {band.note}
        </div>
      </Frame>
    )
  }

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
      <div
        style={{
          display: 'flex',
          fontFamily: 'Sentient',
          fontWeight: 500,
          fontSize: 100,
          lineHeight: 1.1,
        }}
      >
        Get jobs like these in your inbox, once a month
      </div>
      <div style={{ display: 'flex', marginTop: 48, fontSize: 44, lineHeight: 1.4, color: TOKENS.fgMuted }}>
        New jobs and programmes, events across the Netherlands and one EA Forum post worth your time.
      </div>
      <div style={{ display: 'flex', marginTop: 56, fontSize: 44, fontWeight: 600 }}>
        It’s free, and you can unsubscribe any time.
      </div>
    </Frame>
  )
}
