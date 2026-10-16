/**
 * A tier's card list.
 *
 * ## It no longer truncates, and that is the point
 *
 * This used to show four cards and hide the rest behind a "show all" button.
 * The stated reason was sound in isolation: a long first tier pushes the second
 * tier's heading off the screen, and a reader might never learn a second kind
 * of listing exists.
 *
 * But it was solving that problem in the wrong place. This component only ever
 * renders in the index's *filtered* state — the browse page shows no listings
 * at all — which means it only ever appeared in front of a reader who had
 * already clicked something to ask for jobs. Answering "show me the jobs" with
 * four of them and another button is charging twice for the same request, and
 * two separate beta readers said so.
 *
 * So the list is whole, and the burying problem is solved by `TierJump` below:
 * both headings are named, counted and linked from directly above the results,
 * which tells the reader a second tier exists without making them click to see
 * the first one.
 *
 * The component keeps its name and its shape so the call sites are unchanged
 * and this note stays attached to the decision.
 */

import Link from 'next/link'
import type { Locale } from '../content/i18n'
import { t } from '../content/i18n'
import type { Band } from '../lib/bands'
import type { ListingView } from '../sanity/queries'
import { Icon, type IconName } from './Icon'
import { ListingCard } from './ListingCard'
import u from './ui.module.css'

export function ExpandableCardList({
  listings,
  locale,
}: {
  listings: ListingView[]
  locale: Locale
}) {
  return (
    <ul className={u.cardList}>
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} locale={locale} />
      ))}
    </ul>
  )
}

/** One glyph per band, shared by the tier headings, this strip and the front-page tiles. */
export const BAND_ICONS = {
  vetted: 'circle-check',
  routes: 'stairs',
  dutch: 'building',
} as const satisfies Record<Band, IconName>

/**
 * A one-line contents strip above the bands.
 *
 * Carries the job the truncation used to do — telling a reader that the list
 * has distinct parts — without hiding anything to do it. Lists only the bands
 * that have listings, and renders only when there are at least two; with one
 * it would be a label on the only thing present.
 */
export function TierJump({
  locale,
  counts,
}: {
  locale: Locale
  /** In display order. */
  counts: { band: Band; count: number; label: string }[]
}) {
  const copy = t(locale)
  const present = counts.filter((c) => c.count > 0)
  if (present.length < 2) return null

  return (
    <p className={u.tierJump}>
      <span className={u.tierJumpLabel}>{copy.tierJumpLabel}</span>
      {present.map((c) => (
        <a key={c.band} href={`#tier-${c.band}`}>
          <Icon name={BAND_ICONS[c.band]} />
          {c.label}
        </a>
      ))}
    </p>
  )
}
