import type { NextConfig } from 'next'

const config: NextConfig = {
  // The ingestion worker runs as route handlers on Vercel Cron (spec §6.2a).
  // Long scrapes (AcademicTransfer) are chunked so they fit the timeout.
  serverExternalPackages: ['pg', '@electric-sql/pglite'],
  experimental: {
    // Sanity Studio ships its own client bundle; keep it out of the RSC graph.
    optimizePackageImports: ['sanity'],
  },
  async redirects() {
    return [{ source: '/', destination: '/vacatures', permanent: false }]
  },
}

export default config
