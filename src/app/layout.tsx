/**
 * Root layout.
 *
 * Deliberately thin: it imports the board's theme file and nothing else. There
 * is no global CSS and no assumption about the host app's styling (spec §6.2a),
 * so at merge time this file is discarded and the board's own `.jb-root`
 * wrapper carries everything it needs.
 */

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Script from 'next/script'
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
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
