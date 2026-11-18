/** The week's charity deep dives (@jobboard/social/charity); the page is shared with the explainers. */

import type { Metadata } from 'next'
import { SeriesPage } from '@jobboard/review/SeriesPage'
import { CHARITY } from '@jobboard/social/explainer/series'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Charity deep dives',
  robots: { index: false, follow: false },
}

export default function CharityPage() {
  return <SeriesPage series={CHARITY} />
}
