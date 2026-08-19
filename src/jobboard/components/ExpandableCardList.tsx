'use client'

/**
 * A tier's card list, truncated to a handful of cards until the reader asks
 * for more.
 *
 * Without this, a large first tier pushes the second tier's heading off the
 * first screen — someone landing on the page would see thirty cards of one
 * kind and never learn a second kind exists. Truncating keeps both headings,
 * and a sample of both tiers, in view together.
 */

import { useState } from 'react'
import type { Locale } from '../content/i18n'
import { t } from '../content/i18n'
import type { ListingView } from '../sanity/queries'
import { ListingCard } from './ListingCard'
import u from './ui.module.css'

const INITIAL_COUNT = 4

export function ExpandableCardList({
  listings,
  locale,
}: {
  listings: ListingView[]
  locale: Locale
}) {
  const copy = t(locale)
  const [expanded, setExpanded] = useState(false)
  const hasMore = listings.length > INITIAL_COUNT
  const visible = expanded ? listings : listings.slice(0, INITIAL_COUNT)

  return (
    <>
      <ul className={u.cardList}>
        {visible.map((listing) => (
          <ListingCard key={listing.id} listing={listing} locale={locale} />
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          className={`${u.btn} ${u.btnGhost} ${u.btnSmall}`}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? copy.tierCollapse : copy.tierExpand(listings.length)}
        </button>
      ) : null}
    </>
  )
}
