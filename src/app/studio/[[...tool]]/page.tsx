/**
 * Sanity Studio, mounted inside the app at /studio.
 *
 * The Studio IS the curation UI (spec §6.1) — draft/publish workflow, the
 * Structure Builder review queue, and role-based access all come for free, so
 * there is no bespoke admin panel to build or host.
 */

'use client'

import { NextStudio } from 'next-sanity/studio'
import config from '../../../../sanity.config'

export const dynamic = 'force-static'

export default function StudioPage() {
  return <NextStudio config={config} />
}
