/**
 * The share card — what WhatsApp, Slack, LinkedIn and the rest show when
 * someone pastes a link to the board.
 *
 * Until November 2026 the board sent no image at all, so a shared vacancy
 * arrived as a bare grey link while every other page on effectiefaltruisme.nl
 * arrived as a card. Same look as the main site's cards (logo top left, the
 * faint wave pattern on teal-50, a Sentient headline), plus what makes a job
 * worth clicking: who is hiring, where, and on which problem.
 *
 * Rendered by next/og (Satori), which cannot read CSS custom properties, so the
 * token values below are copied from theme/theme.css. Change them there first.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Mirrors theme/theme.css. Satori has no var(). Also used by ../social/slides. */
export const TOKENS = {
  bg: '#f6fdfe', // --primary-subtle (ea-teal-50)
  fg: '#09090b', // --fg (black)
  fgMuted: '#57534e', // --fg-muted (stone-600)
  primaryFg: '#106574', // --primary-fg (ea-teal-700)
  primaryMuted: '#dbf5fa', // --primary-muted (ea-teal-100)
  primaryEmphasized: '#aae8f3', // --primary-emphasized (ea-teal-200)
  white: '#ffffff', // --white
  border: '#d6d3d1', // --border-emphasized (stone-300)
  stone100: '#f5f5f4', // --stone-100, the graph paper's minor lines
  marker: '#fde68a', // --marker
} as const

const ASSET_DIR = join(process.cwd(), 'src/jobboard/og')

let assets: Promise<{
  fonts: { name: string; data: Buffer; weight: 400 | 500 | 600; style: 'normal' }[]
  logo: string
  pattern: string
}> | null = null

/** Read once per server instance; every card needs the same three files. */
export function loadAssets() {
  assets ??= (async () => {
    const [sentient, atkinson, atkinsonSemi, logo, pattern] = await Promise.all([
      readFile(join(ASSET_DIR, 'fonts/Sentient-Medium.ttf')),
      readFile(join(ASSET_DIR, 'fonts/AtkinsonHyperlegibleNext-Regular.ttf')),
      readFile(join(ASSET_DIR, 'fonts/AtkinsonHyperlegibleNext-SemiBold.ttf')),
      readFile(join(ASSET_DIR, 'ean-logo.png')),
      readFile(join(ASSET_DIR, 'pattern.png')),
    ])
    return {
      fonts: [
        { name: 'Sentient', data: sentient, weight: 500, style: 'normal' },
        { name: 'Atkinson', data: atkinson, weight: 400, style: 'normal' },
        { name: 'Atkinson', data: atkinsonSemi, weight: 600, style: 'normal' },
      ],
      logo: `data:image/png;base64,${logo.toString('base64')}`,
      pattern: `data:image/png;base64,${pattern.toString('base64')}`,
    }
  })()
  return assets
}

export type CardContent = {
  /** The pill above the headline: "Vacature", "Organisatie", … */
  eyebrow: string
  /** Small line above the headline — the employer, on a listing. */
  kicker?: string | null
  headline: string
  /** Facts under the dashed rule, joined with a middle dot. */
  facts: string[]
  /** Bottom right: where the link goes. */
  site: string
}

/** Long titles shrink before they wrap past three lines. */
function headlineSize(text: string): number {
  if (text.length <= 34) return 76
  if (text.length <= 60) return 64
  if (text.length <= 90) return 54
  return 46
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

export function Card({ content, logo, pattern }: { content: CardContent; logo: string; pattern: string }) {
  const headline = clip(content.headline, 120)
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: TOKENS.bg,
        color: TOKENS.fg,
        fontFamily: 'Atkinson',
        padding: '64px 80px',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${pattern})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '400px 400px',
          opacity: 0.4,
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders <img>, not next/image */}
        <img src={logo} height={72} width={173} alt="" />
        <div
          style={{
            display: 'flex',
            padding: '10px 24px',
            borderRadius: 999,
            backgroundColor: TOKENS.white,
            border: `2px solid ${TOKENS.primaryEmphasized}`,
            color: TOKENS.primaryFg,
            fontSize: 26,
            fontWeight: 600,
          }}
        >
          {content.eyebrow}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flexGrow: 1,
          paddingRight: 40,
        }}
      >
        {content.kicker ? (
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 600, color: TOKENS.primaryFg, marginBottom: 12 }}>
            {clip(content.kicker, 60)}
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            fontFamily: 'Sentient',
            fontWeight: 500,
            fontSize: headlineSize(headline),
            lineHeight: 1.12,
          }}
        >
          {headline}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 40,
          borderTop: `2px dashed ${TOKENS.border}`,
          paddingTop: 24,
          fontSize: 28,
          color: TOKENS.fgMuted,
        }}
      >
        <div style={{ display: 'flex', flexShrink: 1 }}>{clip(content.facts.filter(Boolean).join('  ·  '), 56)}</div>
        <div style={{ display: 'flex', flexShrink: 0, color: TOKENS.primaryFg, fontWeight: 600 }}>{content.site}</div>
      </div>
    </div>
  )
}
