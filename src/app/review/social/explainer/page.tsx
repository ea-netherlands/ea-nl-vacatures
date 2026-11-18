/** The week's essay explainers; the page itself is shared with the charity deep dives. */

import type { Metadata } from 'next'
import { SeriesPage } from '@jobboard/review/SeriesPage'
import { EXPLAINER } from '@jobboard/social/explainer/series'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Weekly explainer',
  robots: { index: false, follow: false },
}

export default function ExplainerPage() {
  return <SeriesPage series={EXPLAINER} />
}
