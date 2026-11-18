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

export function Glyph({ name, size, color }: { name: Fact['icon'] | 'arrow-right' | 'mail' | 'book' | 'bulb' | 'briefcase' | 'heart-handshake' | 'microscope' | 'shield-check' | 'scale'; size: number; color: string }) {
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

type GlyphName = Parameters<typeof Glyph>[0]['name']

export function Pill({ children, icon }: { children: string; icon?: GlyphName }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 28px',
        borderRadius: 999,
        backgroundColor: TOKENS.white,
        border: `2px solid ${TOKENS.primaryEmphasized}`,
        color: TOKENS.primaryFg,
        fontSize: 30,
        fontWeight: 600,
      }}
    >
      {icon ? <Glyph name={icon} size={34} color={TOKENS.primaryFg} /> : null}
      <div style={{ display: 'flex' }}>{children}</div>
    </div>
  )
}

export function Frame({
  logo,
  pill,
  pillIcon,
  footer,
  children,
}: {
  logo: string
  pill?: string
  /** The series' icon, on its pill: a briefcase for jobs, a book for essays, a handshake for charities. */
  pillIcon?: GlyphName
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
        {pill ? <Pill icon={pillIcon}>{pill}</Pill> : null}
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
 * The three weekly posts share the paper, the frame and the colours, and are
 * told apart by the mark on the cover's key phrase and the icon on the pill
 * (James, 18 Nov 2026): the jobs post keeps the yellow marker, the essay
 * explainer gets the website's teal pencil underline, the charity deep dive a
 * pale teal highlight. No colour is added to the design system.
 */
export type Mark = 'marker' | 'pencil' | 'teal'

/**
 * The website's pencil underline (the design system's pen-underline snippet):
 * one filled, variable-width stroke that rises a little and wobbles, generated
 * from the same fixed seed. Without its graphite grain: Satori has no SVG
 * filters. The viewBox is 240 x 50, where 50 units are half an em.
 */
function pencilStroke(): string {
  const W = 240
  const H = 50
  let seed = 48
  const r = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))
  const bez = (p: number[], t: number) => {
    const u = 1 - t
    return u * u * u * p[0] + 3 * u * u * t * p[1] + 3 * u * t * t * p[2] + t * t * t * p[3]
  }
  const f = (n: number) => n.toFixed(1)
  const x0 = W * 0.03 + (r() - 0.5) * 7
  const x1 = W * 0.97 + (r() - 0.5) * 7
  const yb = H * 0.55
  const cy = [1.8, -0.4, -0.2, -1.6].map((v) => yb + v * 5 + (r() - 0.5) * 2)
  const f1 = 1.5 + r() * 1.5
  const f2 = 4 + r() * 4
  const p1 = r() * 6.28
  const p2 = r() * 6.28
  const pts: [number, number][] = []
  const N = 120
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const y = bez(cy, t) + 0.7 * (Math.sin(6.283 * f1 * t + p1) * 0.65 + Math.sin(6.283 * f2 * t + p2) * 0.35)
    pts.push([x0 + (x1 - x0) * t, y])
  }
  const left: string[] = []
  const right: string[] = []
  const widths: number[] = []
  for (let k = 0; k <= N; k++) {
    const a = pts[Math.max(0, k - 1)]
    const b = pts[Math.min(N, k + 1)]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const nx = -(b[1] - a[1]) / len
    const ny = (b[0] - a[0]) / len
    const t = k / N
    const w = Math.max(0.6, 7.5 * clamp(t * 20, 0.4, 1) * clamp((1 - t) * 10, 0.3, 1))
    widths.push(w)
    left.push(`${f(pts[k][0] + (nx * w) / 2)} ${f(pts[k][1] + (ny * w) / 2)}`)
    right.push(`${f(pts[k][0] - (nx * w) / 2)} ${f(pts[k][1] - (ny * w) / 2)}`)
  }
  const caps = [0, N].map((k) => `<circle cx="${f(pts[k][0])}" cy="${f(pts[k][1])}" r="${f(widths[k] / 2)}"/>`).join('')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">` +
    `<g fill="${TOKENS.primarySolid}"><path d="M${left.join('L')}L${right.reverse().join('L')}Z"/>${caps}</g></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

const PENCIL = pencilStroke()

/**
 * A headline whose last words carry the series' mark. Satori lays out each
 * span as a box, so a highlighted phrase that wraps would get one solid block;
 * marking word by word, with the space inside the mark, follows the lines like
 * a highlighter. The pencil underline is one stroke, so its phrase is kept on
 * one line and drawn under as a whole; a phrase too long for a line is
 * underlined word by word instead.
 */
export function Marked({ plain, marked, size, mark = 'marker' }: { plain: string; marked: string; size: number; mark?: Mark }) {
  const gap = Math.round(size * 0.24)
  const words = marked ? marked.split(' ') : []
  const fill = mark === 'teal' ? TOKENS.primaryEmphasized : TOKENS.marker
  const stroke = (key: string, text: string, pad: number) => (
    <div key={key} style={{ display: 'flex', flexDirection: 'column', paddingRight: pad }}>
      <div style={{ display: 'flex', whiteSpace: 'nowrap' }}>{text}</div>
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders <img>, not next/image */}
      <img src={PENCIL} alt="" style={{ width: '100%', height: Math.round(size * 0.5), marginTop: -Math.round(size * 0.36), marginBottom: -Math.round(size * 0.14) }} />
    </div>
  )
  // Sentient runs at about half an em a character; the text column is 904px.
  const oneLine = marked.length * size * 0.54 <= WIDTH - 2 * PAD
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', fontFamily: 'Sentient', fontWeight: 500, fontSize: size, lineHeight: 1.1 }}>
      {plain.split(' ').map((word, i) => (
        <span key={`w${i}`} style={{ paddingRight: gap }}>
          {word}
        </span>
      ))}
      {mark === 'pencil'
        ? oneLine && words.length
          ? stroke('m', marked, 0)
          : words.map((word, i) => stroke(`m${i}`, word, i === words.length - 1 ? 0 : gap))
        : words.map((word, i) => (
            <span
              key={`m${i}`}
              style={{
                backgroundColor: fill,
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
        pillIcon="briefcase"
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
      <div style={{ display: 'flex', marginTop: 48, fontSize: 44, lineHeight: 1.4, backgroundColor: TOKENS.white }}>
        EA Netherlands sends a free monthly email: new jobs and programmes, events across the Netherlands, and one EA
        Forum essay worth your time.
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 40,
          fontSize: 42,
          lineHeight: 1.35,
          fontWeight: 600,
          color: TOKENS.primaryFg,
          backgroundColor: TOKENS.white,
        }}
      >
        Sign up at the address below. It’s free, and you can unsubscribe any time.
      </div>
    </Frame>
  )
}
