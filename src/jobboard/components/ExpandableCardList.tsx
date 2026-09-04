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
import type { ListingView } from '../sanity/queries'
import { Icon } from './Icon'
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

/**
 * A one-line contents strip above the two tiers.
 *
 * Carries the job the truncation used to do — telling a reader that the list
 * has two distinct halves — without hiding anything to do it. Renders only when
 * both tiers actually have listings; with one tier it would be a label on the
 * only thing present.
 */
export function TierJump({
  locale,
  recommended,
  dutch,
}: {
  locale: Locale
  recommended: number
  dutch: number
}) {
  const copy = t(locale)
  if (!recommended || !dutch) return null

  return (
    <p className={u.tierJump}>
      <span className={u.tierJumpLabel}>{copy.tierJumpLabel}</span>
      <a href="#tier-recommended">
        <Icon name="circle-check" />
        {copy.tierRecommendedCount(recommended)}
      </a>
      <a href="#tier-dutch">
        <Icon name="building" />
        {copy.tierDutchCount(dutch)}
      </a>
    </p>
  )
}
