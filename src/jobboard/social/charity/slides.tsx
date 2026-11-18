/**
 * The charity deep dive's slides. Same frame and graph paper as the other
 * weekly posts (../slides.tsx), with a handshake on the pill and a pale teal
 * highlight as the cover's mark, so it reads as a third series beside the
 * jobs post and the essay explainer.
 *
 * The cover opens with the charity's own logo, large and white on a solid
 * teal panel, with its name and cause: nobody takes it for an essay, and the
 * series builds recognition of the charities (James, 18 Nov 2026). Then the
 * hook, and who evaluated it. The second slide says what the series
 * is. Then one slide per point, and a closing slide with three things to do:
 * give through Doneer Effectief, take a pledge, get the monthly email. All of
 * that is written by the code; the model only writes the hook and the points.
 */

import { TOKENS } from '../../og/card'
import type { ExplainerSlideContent } from '../explainer/slides'
import { Frame, Glyph, Marked, Swipe } from '../slides'
import type { CharityLogo } from './logo'
import { DE_ABOUT, DE_SITE, DONEER_EFFECTIEF, PLEDGE_SHOWN, possessive } from './copy'

const PILL = 'Charity deep dive'
/** The footer is ours on every slide (James, 18 Nov 2026); Doneer Effectief's address is on the closing slide, where giving is the point. */
const SITE = 'effectiefaltruisme.nl'
const NEWSLETTER = 'effectiefaltruisme.nl/en/newsletter'

type GlyphName = Parameters<typeof Glyph>[0]['name']

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
  if (text.length <= 40) return 84
  if (text.length <= 60) return 72
  return 62
}

/** The logo as large as the panel allows: a wide wordmark fills the width, a square mark the height. */
const LOGO_BOX = { width: 760, height: 210 }
function logoSize(logo: CharityLogo): { width: number; height: number } {
  const scale = Math.min(LOGO_BOX.width / logo.width, LOGO_BOX.height / logo.height)
  return { width: Math.round(logo.width * scale), height: Math.round(logo.height * scale) }
}

const Counter = ({ index, count }: { index: number; count: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
    <div style={{ display: 'flex', color: TOKENS.fgMuted }}>{`${index} of ${count}`}</div>
    <Swipe />
  </div>
)

/** An icon in a teal-ringed circle with a line or two beside it, as on the jobs post's facts. */
function Row({ icon, label, text, size = 40 }: { icon: GlyphName; label?: string; text: string; size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
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
        <Glyph name={icon} size={38} color={TOKENS.primaryFg} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        {label ? <div style={{ display: 'flex', fontSize: 28, color: TOKENS.fgMuted }}>{label}</div> : null}
        <div style={{ display: 'flex', fontSize: size, lineHeight: 1.25 }}>{text}</div>
      </div>
    </div>
  )
}

/** The white card with the heavier bottom edge: the site's pressable key, scaled up. */
function Card({ children, marginTop = 0 }: { children: React.ReactNode; marginTop?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        marginTop,
        padding: '36px 40px',
        borderRadius: 32,
        backgroundColor: TOKENS.white,
        border: `2px solid ${TOKENS.primaryEmphasized}`,
        borderBottom: `8px solid ${TOKENS.primaryEmphasized}`,
      }}
    >
      {children}
    </div>
  )
}

export function CharitySlide({
  content,
  logo,
  charityLogo,
}: {
  content: ExplainerSlideContent
  logo: string
  charityLogo?: CharityLogo | null
}) {
  if (content.kind === 'cover') {
    const { headline, marked, sub } = content.text
    const ends = headline.endsWith(marked)
    const plain = ends ? headline.slice(0, headline.length - marked.length).trim() : headline
    const s = content.source
    return (
      <Frame logo={logo} pill={PILL} pillIcon="heart-handshake" footer={{ left: SITE, right: <Swipe /> }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 22,
            padding: '40px 44px 34px',
            marginBottom: 36,
            borderRadius: 32,
            backgroundColor: TOKENS.primarySolid,
            color: TOKENS.white,
          }}
        >
          {charityLogo ? (
            // eslint-disable-next-line @next/next/no-img-element -- Satori renders <img>, not next/image
            <img src={charityLogo.src} alt="" {...logoSize(charityLogo)} />
          ) : (
            <div style={{ display: 'flex', fontFamily: 'Sentient', fontWeight: 500, fontSize: s.title.length > 24 ? 76 : 96, lineHeight: 1.05 }}>
              {s.title}
            </div>
          )}
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 600 }}>
            {charityLogo ? [s.title, s.cause].filter(Boolean).join(' · ') : (s.cause ?? '')}
          </div>
        </div>
        <Marked plain={plain} marked={ends ? marked : ''} size={coverSize(headline)} mark="teal" />
        <div style={{ display: 'flex', marginTop: 28, fontSize: 36, lineHeight: 1.35, backgroundColor: TOKENS.white }}>{sub}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 32, fontSize: 32, color: TOKENS.fgMuted, backgroundColor: TOKENS.white }}>
          <Glyph name="microscope" size={38} color={TOKENS.primaryFg} />
          <div style={{ display: 'flex' }}>{`Evaluated by ${s.author}`}</div>
        </div>
      </Frame>
    )
  }

  if (content.kind === 'about') {
    const s = content.source
    return (
      <Frame
        logo={logo}
        pill={PILL}
        pillIcon="heart-handshake"
       
        footer={{ left: SITE, right: <Counter index={content.index} count={content.count} /> }}
      >
        <div style={{ display: 'flex', fontFamily: 'Sentient', fontWeight: 500, fontSize: 80, lineHeight: 1.1 }}>
          {`One of ${DONEER_EFFECTIEF}’s top charities`}
        </div>
        <div style={{ display: 'flex', marginTop: 48, fontSize: 42, lineHeight: 1.4, backgroundColor: TOKENS.white }}>{DE_ABOUT}</div>
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
            <Glyph name="microscope" size={48} color={TOKENS.primaryFg} />
          </div>
          <div style={{ display: 'flex', flex: 1, minWidth: 0 }}>
            {`This week: ${s.title}, as evaluated by ${s.author}.`}
          </div>
        </div>
      </Frame>
    )
  }

  if (content.kind === 'point') {
    return (
      <Frame
        logo={logo}
        pill={PILL}
        pillIcon="heart-handshake"
       
        footer={{ left: SITE, right: <Counter index={content.index} count={content.count} /> }}
      >
        <div style={{ display: 'flex', fontFamily: 'Sentient', fontWeight: 500, fontSize: headingSize(content.point.heading), lineHeight: 1.1 }}>
          {content.point.heading}
        </div>
        <div style={{ display: 'flex', marginTop: 48, fontSize: bodySize(content.point.body), lineHeight: 1.4, backgroundColor: TOKENS.white }}>
          {content.point.body}
        </div>
      </Frame>
    )
  }

  const s = content.source
  const bio = content.channel === 'instagram'
  return (
    <Frame logo={logo} footer={{ left: SITE }}>
      <div style={{ display: 'flex', fontFamily: 'Sentient', fontWeight: 500, fontSize: s.title.length > 28 ? 72 : 84, lineHeight: 1.1 }}>
        {`Want to support ${s.title}?`}
      </div>
      <Card marginTop={44}>
        <Row icon="heart-handshake" label={`Give through ${DONEER_EFFECTIEF}`} text={bio ? DE_SITE : `${DE_SITE} (link in the post)`} size={38} />
        <div style={{ display: 'flex', borderTop: `2px dashed ${TOKENS.border}` }} />
        <Row icon="scale" label="Make it a habit: take a giving pledge" text={bio ? PLEDGE_SHOWN : 'Giving What We Can (link in the post)'} size={bio ? 32 : 38} />
        <div style={{ display: 'flex', borderTop: `2px dashed ${TOKENS.border}` }} />
        <Row icon="mail" label="More like this, once a month" text={bio ? 'Our free email: link in our bio' : NEWSLETTER} size={bio ? 38 : 34} />
      </Card>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 20,
          marginTop: 44,
          fontSize: 32,
          lineHeight: 1.4,
          color: TOKENS.fgMuted,
          backgroundColor: TOKENS.white,
        }}
      >
        <div style={{ display: 'flex', flexShrink: 0, marginTop: 4 }}>
          <Glyph name="book" size={38} color={TOKENS.primaryFg} />
        </div>
        <div style={{ display: 'flex', flex: 1, minWidth: 0 }}>
          {`Summarised in our own words from ${possessive(s.author)} evaluation of ${s.title}. Read the full report for the detail and the caveats.`}
        </div>
      </div>
    </Frame>
  )
}
