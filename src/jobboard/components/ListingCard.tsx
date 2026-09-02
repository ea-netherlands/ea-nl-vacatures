/**
 * Listing card — spec §9.2.
 *
 * "Each card shows title, employer, location, cause tag, and the first line of
 * whyThisMattersNl. Not the job description excerpt — the editorial note. That
 * is the differentiator and it should be visible without clicking."
 */

import Link from 'next/link'
import { routes, t, type Locale } from '../content/i18n'
import { excerptFor, firstLine, noteFor, salaryFor } from '../lib/note'
import type { ListingView } from '../sanity/queries'
import { Icon } from './Icon'
import u from './ui.module.css'

export { excerptFor, firstLine, noteFor, salaryFor }

export function CauseBadge({
  cause,
  locale,
}: {
  cause: NonNullable<ListingView['primaryCause']>
  locale: Locale
}) {
  const copy = t(locale)
  const r = routes(locale)
  // Every cause tag, wherever it appears, links to that cause's explainer page.
  // This is the main discovery path into the explanatory layer and costs one
  // line of markup (§9.2).
  return (
    <Link href={r.cause(cause)} className={`${u.badge} ${u.badgeCause}`}>
      {copy.causeAreas[cause]}
    </Link>
  )
}

export function ListingCard({
  listing,
  locale,
}: {
  listing: ListingView
  locale: Locale
}) {
  const copy = t(locale)
  const r = routes(locale)
  const note = firstLine(noteFor(listing, locale))
  const location = listing.locationCity ?? listing.employer?.city ?? null
  const dutchRequired = listing.languageRequirement === 'dutch-required'
  const nationalityRequired = listing.workAuthorisation === 'dutch-nationality-required'

  return (
    <li>
      <Link href={r.detail(listing.slug)} className={u.card}>
        <h3 className={u.cardTitle}>{listing.title}</h3>

        <p className={u.cardMeta}>
          {listing.employer ? (
            <span className={u.cardMetaItem}>
              <Icon name="building" />
              {listing.employer.name}
            </span>
          ) : null}
          {location ? (
            <span className={u.cardMetaItem}>
              <Icon name="map-pin" />
              {location}
            </span>
          ) : null}
          {listing.locationMode ? (
            <span className={u.cardMetaItem}>{copy.locationModes[listing.locationMode]}</span>
          ) : null}
        </p>

        {note ? <p className={u.cardNote}>{note}</p> : null}

        <span className={u.cardTags}>
          {/* The sub-area, not the cause area, when we have one: "AI-veiligheid"
              tells a scanning reader more than "mondiale catastrofale risico's",
              and it is the label they most likely clicked to get here. The
              leverage archetype used to sit in this row and no longer does — it
              is internal now (see ../taxonomy). */}
          {listing.subArea ? (
            <span className={`${u.badge} ${u.badgeCause}`}>
              {copy.subAreas[listing.subArea]}
            </span>
          ) : listing.primaryCause ? (
            <span className={`${u.badge} ${u.badgeCause}`}>
              {copy.causeAreas[listing.primaryCause]}
            </span>
          ) : null}
          {listing.skills.slice(0, 2).map((skill) => (
            <span key={skill} className={`${u.badge} ${u.badgeOutline}`}>
              {copy.skills[skill]}
            </span>
          ))}
          {listing.seniority ? (
            <span className={`${u.badge} ${u.badgeNeutral}`}>
              {copy.seniorities[listing.seniority]}
            </span>
          ) : null}
          {/* These two are genuine blockers for part of the audience, and no
              other board surfaces them — so they show on the card, not just
              the detail page (§5.4). */}
          {dutchRequired ? (
            <span className={`${u.badge} ${u.badgeWarning}`}>
              <Icon name="language" />
              {copy.languageRequirements['dutch-required']}
            </span>
          ) : null}
          {nationalityRequired ? (
            <span className={`${u.badge} ${u.badgeWarning}`}>
              <Icon name="shield-lock" />
              {copy.workAuthorisations['dutch-nationality-required']}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  )
}

/**
 * Earning-to-give card: leads with compensation and seniority rather than cause
 * tag, since cause area is not the relevant axis (§9.6).
 */
export function EarningToGiveCard({
  listing,
  locale,
}: {
  listing: ListingView
  locale: Locale
}) {
  const copy = t(locale)
  const r = routes(locale)
  const note = firstLine(noteFor(listing, locale))

  return (
    <li>
      <Link href={r.detail(listing.slug)} className={u.card}>
        <p className={u.e2gPay}>{salaryFor(listing, copy) ?? copy.detailSalaryUnknown}</p>
        <p className={u.e2gSeniority}>
          {[
            listing.seniority ? copy.seniorities[listing.seniority] : null,
            listing.locationCity,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>

        <h3 className={u.cardTitle}>{listing.title}</h3>
        <p className={u.cardMeta}>
          {listing.employer ? (
            <span className={u.cardMetaItem}>
              <Icon name="building" />
              {listing.employer.name}
            </span>
          ) : null}
        </p>

        {note ? <p className={u.cardNote}>{note}</p> : null}

        <span className={u.cardTags}>
          {listing.mentions30PercentRuling ? (
            <span className={`${u.badge} ${u.badgeNeutral}`}>
              <Icon name="coin" />
              {copy.detailThirtyPercent}
            </span>
          ) : null}
          {listing.languageRequirement === 'english-sufficient' ? (
            <span className={`${u.badge} ${u.badgeNeutral}`}>
              {copy.languageRequirements['english-sufficient']}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  )
}
