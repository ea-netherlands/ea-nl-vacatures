/**
 * The listing detail page — spec §9.3.
 *
 * "This is the most important page on the site, because it is where most
 * first-time visitors land from search. Design it to work with no prior
 * context."
 *
 * Layout order is load-bearing: the one-line frame, then whyThisMattersNl in a
 * visually distinct block, then the neutral excerpt, then the eligibility table,
 * then the outbound apply button, then the employer and cause links, then one
 * quiet onward step.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container, OnwardStep, Section } from '../components/Chrome'
import { Icon } from '../components/Icon'
import { noteFor } from '../components/ListingCard'
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

function EligibilityTable({ listing, locale }: { listing: ListingView; locale: Locale }) {
  const copy = t(locale)
  const rows: { label: string; value: string; warn?: boolean }[] = []

  if (listing.languageRequirement) {
    rows.push({
      label: copy.labelLanguage,
      value: copy.languageRequirements[listing.languageRequirement],
      warn: listing.languageRequirement === 'dutch-required',
    })
  }
  if (listing.workAuthorisation) {
    rows.push({
      label: copy.labelWorkAuth,
      value: copy.workAuthorisations[listing.workAuthorisation],
      warn: listing.workAuthorisation === 'dutch-nationality-required',
    })
  }
  rows.push({
    label: copy.labelScreening,
    value: listing.securityScreening
      ? [copy.screeningYes, listing.securityNote].filter(Boolean).join(' — ')
      : copy.screeningNo,
    warn: Boolean(listing.securityScreening),
  })
  if (listing.locationMode) {
    rows.push({
      label: copy.labelLocation,
      value: [copy.locationModes[listing.locationMode], listing.locationCity]
        .filter(Boolean)
        .join(' · '),
    })
  }
  if (listing.seniority) {
    rows.push({ label: copy.labelSeniority, value: copy.seniorities[listing.seniority] })
  }
  rows.push({
    label: copy.detailSalary,
    value: listing.salaryText ?? copy.detailSalaryUnknown,
  })
  const posted = formatDate(listing.postedAt, locale)
  if (posted) rows.push({ label: copy.detailPostedAt, value: posted })
  rows.push({
    label: copy.detailDeadline,
    value: formatDate(listing.deadlineAt, locale) ?? copy.detailNoDeadline,
  })

  return (
    <table className={u.factTable}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>
              {row.warn ? (
                <span className={`${u.badge} ${u.badgeWarning}`}>{row.value}</span>
              ) : (
                row.value
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export async function DetailPage({ locale, slug }: { locale: Locale; slug: string }) {
  const listing = await getListingBySlug(slug)
  if (!listing) notFound()

  const copy = t(locale)
  const r = routes(locale)
  const note = noteFor(listing, locale)
  const expired = isExpired(listing)

  return (
    <Container>
      <Section first>
        <div className={s.prose}>
          <h1 className={s.heroTitle}>{listing.title}</h1>
          <p className={u.cardMeta} style={{ marginTop: 'var(--space-3)' }}>
            {listing.employer ? (
              <span className={u.cardMetaItem}>
                <Icon name="building" />
                {listing.employer.name}
              </span>
            ) : null}
            {listing.locationCity ? (
              <span className={u.cardMetaItem}>
                <Icon name="map-pin" />
                {listing.locationCity}
              </span>
            ) : null}
            {listing.primaryCause ? (
              <Link href={r.cause(listing.primaryCause)} className={`${u.badge} ${u.badgeCause}`}>
                {copy.causeAreas[listing.primaryCause]}
              </Link>
            ) : null}
            {listing.leverage ? (
              <span className={`${u.badge} ${u.badgeOutline}`}>
                {copy.leverage[listing.leverage]}
              </span>
            ) : null}
          </p>
        </div>
      </Section>

      <Section tight>
        <div className={s.prose}>
          {expired ? (
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <Callout tone="warning" icon="alert-triangle">
                <strong>{copy.expiredHeading}</strong>
                <br />
                {copy.expiredBody}
              </Callout>
            </div>
          ) : null}

          {/* The one-line frame. Always present, costs almost nothing, and turns
              an unexplained editorial judgement into an invitation (§9.5). */}
          <p className={u.frame}>
            {copy.detailFrame}{' '}
            <Link href={r.method}>
              {copy.detailFrameLink} <Icon name="arrow-right" />
            </Link>
          </p>

          {/* THE editorial field, above the role summary, visually distinct. */}
          {note ? (
            <div className={u.whyBlock}>
              <h2 className={u.whyHeading}>{copy.detailWhyHeading}</h2>
              <p className={u.whyText}>{note}</p>
            </div>
          ) : null}

          {listing.excerpt ? (
            <>
              <h2 className={s.sectionHeading}>{copy.detailAboutHeading}</h2>
              {/* Deliberately an excerpt, not the full description: link out
                  instead. Both the legal norm among aggregators (§10) and the
                  right product decision — we are not trying to keep people on
                  the page. */}
              <p style={{ color: 'var(--fg-muted)', lineHeight: 'var(--lh-relaxed)' }}>
                {listing.excerpt}
              </p>
            </>
          ) : null}
        </div>
      </Section>

      <Section tight>
        <div className={s.prose}>
          <h2 className={s.sectionHeading}>{copy.detailEligibilityHeading}</h2>
          <EligibilityTable listing={listing} locale={locale} />

          {listing.mentions30PercentRuling ? (
            <div style={{ marginTop: 'var(--space-6)' }}>
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
        </div>
      </Section>

      <Section tight>
        <div className={s.prose}>
          {!expired ? (
            <>
              {/* Outbound clicks go through a server-side redirect so the count
                  survives ad blockers (§9.7). */}
              <a
                className={`${u.btn} ${u.btnSolid}`}
                href={`/api/jobs/${encodeURIComponent(listing.id)}/apply?locale=${locale}`}
                rel="noopener"
              >
                {copy.detailApply}
                <Icon name="external-link" />
              </a>
              <p
                style={{
                  marginTop: 'var(--space-3)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--fg-subtle)',
                }}
              >
                {copy.detailApplyNote}
              </p>
            </>
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
      </Section>

      <Section tight>
        <OnwardStep locale={locale} />
      </Section>
    </Container>
  )
}
