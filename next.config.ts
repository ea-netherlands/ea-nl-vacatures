import type { NextConfig } from 'next'

/*
  Serving the board from effectiefaltruisme.nl (Next.js multi-zones).

  The main site forwards /vacatures, /en/jobs, the two public API routes and
  /vacatures-static to this deployment (see its next.config.ts). Everything
  this app ships to a reader's browser therefore has to live under one of
  those paths:

  • `assetPrefix` moves the JS and CSS from /_next/ to
    /vacatures-static/_next/, which would otherwise collide with the main
    site's own /_next/.
  • Fonts and images live in public/vacatures-static/ for the same reason —
    the main site has its own /fonts.

  The Studio, the review dashboard and the cron endpoints are not forwarded
  and stay on vacatures.effectiefaltruisme.nl (lib/seo.ts, ADMIN_ORIGIN).
*/
const ASSET_PREFIX = '/vacatures-static'

/**
 * Where the public pages should be read from. Set to https://effectiefaltruisme.nl
 * once the main site forwards the board's paths; until then, unset, and the
 * subdomain serves everything as it always has.
 *
 * When set, a visitor who lands on a public page on the subdomain is sent to
 * the same path on the main domain, permanently, so links and search ranking
 * move across. The redirect is conditional on the subdomain's host header,
 * because the main site forwards to this deployment's *.vercel.app address —
 * redirecting every request would bounce the main site's own forwarded
 * requests straight back to it.
 */
const PUBLIC_ORIGIN = process.env.REDIRECT_PUBLIC_PAGES_TO?.replace(/\/$/, '')
const BOARD_HOST = 'vacatures.effectiefaltruisme.nl'

const config: NextConfig = {
  assetPrefix: ASSET_PREFIX,
  // The ingestion worker runs as route handlers on Vercel Cron (spec §6.2a).
  // Long scrapes (AcademicTransfer) are chunked so they fit the timeout.
  serverExternalPackages: ['pg', '@electric-sql/pglite'],
  experimental: {
    // Sanity Studio ships its own client bundle; keep it out of the RSC graph.
    optimizePackageImports: ['sanity'],
  },
  async redirects() {
    const toMainSite = PUBLIC_ORIGIN
      ? ['/', '/vacatures', '/vacatures/:path*', '/en/jobs', '/en/jobs/:path*'].map((source) => ({
          source,
          has: [{ type: 'host' as const, value: BOARD_HOST }],
          destination: `${PUBLIC_ORIGIN}${source === '/' ? '/vacatures' : source}`,
          permanent: true,
        }))
      : []
    return [...toMainSite, { source: '/', destination: '/vacatures', permanent: false }]
  },
}

export default config
