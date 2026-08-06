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
import { isSanityConfigured } from '@jobboard/sanity/client'
import { SetupNeeded } from './SetupNeeded'

export const dynamic = 'force-static'

export default function StudioPage() {
  // Without a project id the Studio throws an unrecoverable error and shows a
  // raw stack trace. The public board degrades gracefully when Sanity is not yet
  // configured, so the curation route should too — the M0 checklist is more use
  // to whoever opens this first than a crash is.
  if (!isSanityConfigured) return <SetupNeeded />

  return <NextStudio config={config} />
}
