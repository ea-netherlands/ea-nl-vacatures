/**
 * Root layout.
 *
 * Deliberately thin: it imports the board's theme file and its two fonts. There
 * is no global CSS and no assumption about the host app's styling (spec §6.2a),
 * so at merge time this file is discarded and the board's own `.jb-root`
 * wrapper carries everything it needs.
 */

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Script from 'next/script'
import localFont from 'next/font/local'
import '@jobboard/theme/theme.css'
import { SITE_URL } from '@jobboard/lib/seo'
import { consentDefaultsScript } from '@jobboard/lib/consent'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Vacatures — Effectief Altruïsme Nederland',
    template: '%s — Effectief Altruïsme Nederland',
  },
  description:
    'Een kleine, met de hand samengestelde lijst met banen in Nederland waarmee je veel goed kunt doen.',
}

/*
  The board's two typefaces, loaded the way the website loads them. next/font
  preloads the files from the document head and declares a fallback (Times New
  Roman, Arial) resized to each font's metrics. Before this, the fonts came from
  plain @font-face rules in theme.css with no preload: the hero painted in
  Georgia first and re-set itself in Sentient about 50ms later, line breaks and
  all. theme.css reads the two variables below as --font-heading and
  --font-body.
*/
const sentient = localFont({
  src: [
    { path: '../../public/vacatures-static/fonts/Sentient-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/vacatures-static/fonts/Sentient-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/vacatures-static/fonts/Sentient-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-board-heading',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
})

const atkinson = localFont({
  src: [
    { path: '../../public/vacatures-static/fonts/AtkinsonHyperlegibleNext-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/vacatures-static/fonts/AtkinsonHyperlegibleNext-RegularItalic.woff2', weight: '400', style: 'italic' },
    { path: '../../public/vacatures-static/fonts/AtkinsonHyperlegibleNext-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/vacatures-static/fonts/AtkinsonHyperlegibleNext-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: '../../public/vacatures-static/fonts/AtkinsonHyperlegibleNext-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-board-body',
  display: 'swap',
  adjustFontFallback: 'Arial',
})

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl" className={`${sentient.variable} ${atkinson.variable}`}>
      <head>
        {/* Google Consent Mode defaults: must run before any Google tag. The
            one exception to "nothing here": the board is served on the
            website's origin, and its tag manager (mounted in the Shell) needs
            the same defaults the website's layout sets. At merge time the
            website's own copy of this script takes over. */}
        <Script id="consent-default" strategy="beforeInteractive">
          {consentDefaultsScript}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  )
}
