/**
 * Listings no source carries, added by a curator from the page's URL. Read by
 * the `manual` adapter (../ingest/adapters/manual.ts); after the fetch they go
 * through stage one, the classifier and review like everything else.
 *
 * Add one here (or, without a deploy, with `src/scripts/add-listing.ts`). Give
 * only what the page does not reliably say itself: the title, who runs it,
 * where it is held. The page's own text is fetched and handed to the
 * classifier, so duration and pay need not be repeated. Removing an entry
 * stops it being refreshed; it does not take the listing off the board.
 */

import type { ManualListing } from '../ingest/adapters/manual'

export const MANUAL_LISTINGS: ManualListing[] = [
  {
    // On none of 80,000 Hours, Probably Good or EA Opportunities as of
    // 18 October 2026. Three months of one-to-one sessions alongside a
    // full-time job, at no cost; the page names no venue, and a programme
    // run as fortnightly check-ins is not one you travel for — hence Remote.
    // Rolling: starts November, then takes new participants monthly.
    url: 'https://steadrise.org/executive-catalyst',
    title: 'Executive Catalyst: Ops & Strategy',
    employerName: 'SteadRise',
    kind: 'programme',
    location: 'Remote',
    addedOn: '2026-10-18',
  },
]
