/**
 * The listing detail page — spec §9.3.
 *
 * "This is the most important page on the site, because it is where most
 * first-time visitors land from search. Design it to work with no prior
 * context."
 *
 * Rebuilt October 2026. The apply button used to sit below three stacked
 * caveats, the editorial note and a requirements table that was mostly
 * "Unclear" and "Not stated". Now: title, employer and the apply button
 * together; then our reason, with the beta caveat attached to it rather than
 * above it; then the excerpt. Known facts go in a side column and unknown ones
 * are left out — a row saying we do not know is not information. The
 * look-elsewhere-first line stays on every listing, in that column.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container, InternationalNote, OnwardStep, Section } from '../components/Chrome'
import { Icon } from '../components/Icon'
import { excerptFor, noteFor, salaryFor } from '../components/ListingCard'
import { Callout } from '../components/Prose'
import { ONWARD_LINKS, routes, t, type Locale } from '../content/i18n'
import { getListingBySlug } from '../sanity/queries'
import type { ListingView } from '../sanity/queries'
import s from '../components/layout.module.css'
import u from '../components/ui.module.css'

function formatDate(value: string | null, locale: Locale): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function isExpired(listing: ListingView): boolean {
  if (!listing.expiresAt) return false
  return new Date(listing.expiresAt).getTime() < Date.now()
}

/** Only what we know. Warnings (Dutch required, screening) render as badges. */
function factsFor(listing: ListingView, locale: Locale) {
  const copy = t(locale)
  const rows: { label: string; value: string; warn?: boolean }[] = []

  // A programme held abroad has no location mode — none of the three describe
  // a residency in Berkeley — so it shows its city on its own.
  if (listing.locationMode || listing.locationCity) {
    rows.push({
      label: copy.labelLocation,
      value: [
        listing.locationMode ? copy.locationModes[listing.locationMode] : null,
        listing.locationCity,
      ]
        .filter(Boolean)
        .join(' · '),
    })
  }
  if (listing.seniority) {
    rows.push({ label: copy.labelSeniority, value: copy.seniorities[listing.seniority] })
  }
  const salary = salaryFor(listing, copy)
  if (salary) {
    rows.push({
      label: listing.listingKind === 'programme' ? copy.detailStipend : copy.detailSalary,
      value: salary,
    })
  }
  if (listing.languageRequirement && listing.languageRequirement !== 'unclear') {
    rows.push({
      label: copy.labelLanguage,
      value: copy.languageRequirements[listing.languageRequirement],
      warn: listing.languageRequirement === 'dutch-required',
    })
  }
  if (listing.workAuthorisation && listing.workAuthorisation !== 'unclear') {
    rows.push({
      label: copy.labelWorkAuth,
      value: copy.workAuthorisations[listing.workAuthorisation],
      warn: listing.workAuthorisation === 'dutch-nationality-required',
    })
  }
  if (listing.securityScreening) {
    rows.push({
      label: copy.labelScreening,
      value: [copy.screeningYes, listing.securityNote].filter(Boolean).join(' — '),
      warn: true,
    })
  }
  const deadline = formatDate(listing.deadlineAt, locale)
  if (deadline) rows.push({ label: copy.detailDeadline, value: deadline })
  const posted = formatDate(listing.postedAt, locale)
  if (posted) rows.push({ label: copy.detailPostedAt, value: posted })
  return rows
}

function ApplyButton({ listing, locale, wide }: { listing: ListingView; locale: Locale; wide?: boolean }) {
  const copy = t(locale)
  return (
    // Outbound clicks go through a server-side redirect so the count survives
    // ad blockers (§9.7).
    <a
      className={`${u.btn} ${u.btnSolid} ${wide ? u.btnFull : ''}`}
      href={`/api/jobs/${encodeURIComponent(listing.id)}/apply?locale=${locale}`}
      rel="noopener"
      // Read by ApplyClickTracker for the apply_click conversion.
      data-apply-listing={listing.id}
      data-apply-employer={listing.employer?.name}
    >
      {copy.detailApply}
      <Icon name="external-link" />
    </a>
  )
}

export async function DetailPage({ locale, slug }: { locale: Locale; slug: string }) {
  const listing = await getListingBySlug(slug)
  if (!listing) notFound()

  const copy = t(locale)
  const r = routes(locale)
  const note = noteFor(listing, locale)
  const excerpt = excerptFor(listing, locale)
  const expired = isExpired(listing)
  const facts = factsFor(listing, locale)

  return (
    <Container>
      <Section first>
        <h1 className={u.detailTitle}>{listing.title}</h1>
        <p className={u.detailMeta}>
          {listing.employer ? (
            <Link href={r.employer(listing.employer.slug)} className={u.cardMetaItem}>
              <Icon name="building" />
              {listing.employer.name}
            </Link>
          ) : null}
          {listing.locationCity ? (
            <span className={u.cardMetaItem}>
              <Icon name="map-pin" />
              {listing.locationCity}
            </span>
          ) : null}
        </p>

        {expired ? (
          <div className={u.detailExpired}>
            <Callout tone="warning" icon="alert-triangle">
              <strong>{copy.expiredHeading}</strong>
              <br />
              {copy.expiredBody}
            </Callout>
          </div>
        ) : (
          <div className={u.detailApply}>
            <ApplyButton listing={listing} locale={locale} />
            <span className={u.detailApplyNote}>{copy.detailApplyNote}</span>
          </div>
        )}

        {/* Cause, sub-area and skills, each linking back into the filtered
            index. The leverage archetype used to sit here; it is internal now. */}
        <p className={u.detailTags}>
          {listing.primaryCause ? (
            <Link href={r.cause(listing.primaryCause)} className={`${u.badge} ${u.badgeCause}`}>
              {copy.causeAreas[listing.primaryCause]}
            </Link>
          ) : null}
          {listing.subArea ? (
            <Link
              href={`${r.index}?subarea=${listing.subArea}`}
              className={`${u.badge} ${u.badgeCause}`}
            >
              {copy.subAreas[listing.subArea]}
            </Link>
          ) : null}
          {listing.skills.map((skill) => (
            <Link
              key={skill}
              href={`${r.index}?skill=${skill}`}
              className={`${u.badge} ${u.badgeOutline}`}
            >
              {copy.skills[skill]}
            </Link>
          ))}
        </p>
      </Section>

      <Section tight>
        <div className={u.detailLayout}>
          <div className={u.detailMain}>
            {/* THE editorial field, first and visually distinct, with the
                caveat about it underneath rather than stacked above it. */}
            {note ? (
              <div className={u.whyBlock}>
                <h2 className={u.whyHeading}>{copy.detailWhyHeading}</h2>
                <p className={u.whyText}>{note}</p>
                <p className={u.whyCaveat}>
                  <Icon name="flask" />
                  <span>
                    {copy.detailWhyCaveat}{' '}
                    <Link href={r.suggest}>{copy.betaShortLink}</Link>
                    {' · '}
                    <Link href={r.method}>{copy.detailFrameLink}</Link>
                  </span>
                </p>
              </div>
            ) : null}

            {excerpt ? (
              <>
                <h2 className={u.detailHeading}>{copy.detailAboutHeading}</h2>
                {/* Deliberately an excerpt, not the full description: link out
                    instead. Both the legal norm among aggregators (§10) and the
                    right product decision — we are not trying to keep people on
                    the page. */}
                <p className={u.detailExcerpt}>{excerpt}</p>
              </>
            ) : null}

            {listing.mentions30PercentRuling ? (
              <div className={u.detailCallout}>
                <Callout icon="coin">
                  <strong>{copy.detailThirtyPercent}</strong>
                  <br />
                  {/* A flag, never a computed figure — this is the easiest place
                      on the board to accidentally give bad financial advice
                      (§5.3). */}
                  {copy.detailThirtyPercentNote}
                </Callout>
              </div>
            ) : null}

            <p className={u.linkRow}>
              {listing.employer ? (
                <Link href={r.employer(listing.employer.slug)}>
                  {copy.detailEmployerLink(listing.employer.name)}
                </Link>
              ) : null}
              {listing.primaryCause ? (
                <Link href={r.cause(listing.primaryCause)}>{copy.detailCauseLink}</Link>
              ) : null}
              <a href={ONWARD_LINKS.glossary}>
                {locale === 'nl' ? 'Begrippenlijst' : 'Glossary'}
              </a>
            </p>
          </div>

          <aside className={u.detailAside}>
            {facts.length ? (
              <div className={u.factCard}>
                <h2 className={u.factCardHeading}>{copy.detailFactsHeading}</h2>
                <dl className={u.factList}>
                  {facts.map((row) => (
                    <div key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>
                        {row.warn ? (
                          <span className={`${u.badge} ${u.badgeWarning}`}>{row.value}</span>
                        ) : (
                          row.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                {!expired ? <ApplyButton listing={listing} locale={locale} wide /> : null}
              </div>
            ) : null}
            {/* Most visitors arrive here rather than at the index, so the
                look-elsewhere-first point is made on this page too. */}
            <InternationalNote locale={locale} />
          </aside>
        </div>
      </Section>

      <Section tight>
        <OnwardStep locale={locale} />
      </Section>
    </Container>
  )
}
