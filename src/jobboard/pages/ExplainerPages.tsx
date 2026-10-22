/**
 * The explanatory layer — spec §9.4, §9.5, §9.6.
 *
 * These pages are the product's core, not a wrapper around it. They are also
 * the board's single best SEO asset: listings expire in weeks and take their
 * rankings with them, while a cause explainer accrues authority for years
 * (§9.8).
 *
 * Every page here is written to be worth reading independently of the job board.
 * A page that only makes sense as a wrapper around vacancies will neither rank
 * nor deserve to.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  BetaBand,
  ClimateNote,
  Container,
  Eyebrow,
  FeedbackBand,
  Hero,
  InternationalFirst,
  OnwardStep,
  Section,
} from '../components/Chrome'
import { BandGrid } from '../components/BrowseGrid'
import { Icon } from '../components/Icon'
import { EarningToGiveCard, ListingCard } from '../components/ListingCard'
import { Callout, RichText, SourceAttribution, Uncertainties } from '../components/Prose'
import { SuggestForm } from '../components/SuggestForm'
import { BANDS, bandOf, type Band } from '../lib/bands'
import { ONWARD_LINKS, routes, t, type Locale } from '../content/i18n'
import {
  getEarningToGiveListings,
  getEmployer,
  getEmployerListings,
  getEmployersWithRoles,
  getExplainer,
  getLiveListings,
} from '../sanity/queries'
import { CAUSE_AREAS, SUB_AREAS_BY_CAUSE, type CauseArea } from '../taxonomy'
import s from '../components/layout.module.css'
import u from '../components/ui.module.css'

// ---------------------------------------------------------------------------
// Cause explainer (§9.5) — linked from every cause tag anywhere on the site
// ---------------------------------------------------------------------------

export async function CausePage({ locale, slug }: { locale: Locale; slug: string }) {
  if (!CAUSE_AREAS.includes(slug as CauseArea)) notFound()
  const cause = slug as CauseArea
  const copy = t(locale)
  const r = routes(locale)

  const [explainer, listings] = await Promise.all([
    getExplainer('cause', locale, cause),
    getLiveListings(),
  ])
  const relevant = listings.filter(
    (l) => l.primaryCause === cause || l.secondaryCauses.includes(cause),
  )

  return (
    <>
      <Hero
        title={explainer?.title ?? copy.causeAreas[cause]}
        lead={explainer?.summary ?? undefined}
      />
      <Container>
        {/*
          Four cause areas are coarse enough that the name alone does not tell a
          reader whether their field is inside one. As of August 2026 the
          sub-areas are a real filter, so each one links straight to its own
          filtered list rather than only answering "does my work count?".
        */}
        <Section first>
          <Eyebrow>
            <Icon name="filter" />
            {locale === 'nl' ? 'Wat hieronder valt' : 'What this covers'}
          </Eyebrow>
          <ul className={u.subareaList}>
            {SUB_AREAS_BY_CAUSE[cause].map((sub) => (
              <li key={sub}>
                <Link href={`${r.index}?subarea=${sub}`}>{copy.subAreas[sub]}</Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section>
          {explainer ? (
            <>
              <SourceAttribution sources={explainer.sources ?? []} locale={locale} />
              <RichText value={explainer.body} />
            </>
          ) : (
            // The explainer layer is M5b and "not optional, not deferrable".
            // Until the page exists the route still resolves and still lists
            // roles, rather than 404-ing and losing the indexing head start.
            <div className={s.prose}>
              <Callout>
                {locale === 'nl'
                  ? 'De uitleg bij dit probleemgebied wordt nog geschreven. De vacatures hieronder staan er al wel.'
                  : 'The explainer for this problem area is still being written. The jobs below are already live.'}
              </Callout>
            </div>
          )}
          {explainer ? <Uncertainties locale={locale} text={explainer.uncertainties} /> : null}
        </Section>

        <Section>
          <Eyebrow>
            <Icon name="filter" />
            {copy.causeRolesHeading}
          </Eyebrow>
          {relevant.length ? (
            <ul className={u.cardList}>
              {relevant.map((listing) => (
                <ListingCard key={listing.id} listing={listing} locale={locale} />
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--fg-muted)' }}>{copy.causeNoRoles}</p>
          )}
          <p className={u.linkRow}>
            <Link href={r.index}>{copy.causeAllRoles}</Link>
            <Link href={r.method}>{copy.indexIntroMethodLink}</Link>
          </p>
        </Section>

        {/* Every page a reader can finish on offers the same invitation
            while the board is in beta. */}
        <Section tight>
          <FeedbackBand locale={locale} />
        </Section>

        <Section tight>
          <OnwardStep locale={locale} />
        </Section>
      </Container>
    </>
  )
}

/** Index of cause explainers, so they are crawlable from one place. */
export async function CausesIndexPage({ locale }: { locale: Locale }) {
  const copy = t(locale)
  const r = routes(locale)
  const listings = await getLiveListings()
  const counts = new Map<string, number>()
  for (const l of listings) {
    for (const c of [l.primaryCause, ...l.secondaryCauses].filter(Boolean) as string[]) {
      counts.set(c, (counts.get(c) ?? 0) + 1)
    }
  }

  return (
    <>
      <Hero
        title={locale === 'nl' ? 'Probleemgebieden' : 'Problem areas'}
        lead={
          locale === 'nl'
            ? 'Waarom we denken dat deze problemen belangrijk zijn, en wat voor Nederlands werk eraan raakt.'
            : 'Why we think these problems matter, and what kind of Dutch work bears on them.'
        }
      />
      <Container>
        <Section first>
          <div className={u.grid2}>
            {CAUSE_AREAS.map((cause) => (
              <Link key={cause} href={r.cause(cause)} className={u.card}>
                <h2 className={u.cardTitle}>{copy.causeAreas[cause]}</h2>
                <p className={u.cardMeta}>
                  {copy.resultCount(counts.get(cause) ?? 0)}
                </p>
                <p className={u.cardNote}>
                  {SUB_AREAS_BY_CAUSE[cause].map((sub) => copy.subAreas[sub]).join(' · ')}
                </p>
              </Link>
            ))}
          </div>
        </Section>

        {/*
          This is where the question actually gets asked. Someone scanning four
          problem areas for the one they care about, and not finding climate,
          deserves the answer on this page rather than having to hunt for it.
        */}
        <Section tight>
          <ClimateNote locale={locale} />
        </Section>

        {/* Every page a reader can finish on offers the same invitation
            while the board is in beta. */}
        <Section tight>
          <FeedbackBand locale={locale} />
        </Section>

        <Section tight>
          <OnwardStep locale={locale} />
        </Section>
      </Container>
    </>
  )
}

// ---------------------------------------------------------------------------
// Method page (§9.5) — built on the ITN framework from EA NL's own glossary
// ---------------------------------------------------------------------------

export async function MethodPage({ locale }: { locale: Locale }) {
  const copy = t(locale)
  const r = routes(locale)
  const [explainer, listings, earningToGive] = await Promise.all([
    getExplainer('method', locale),
    getLiveListings(),
    getEarningToGiveListings(),
  ])
  const bandCounts = Object.fromEntries(
    BANDS.map((b) => [b, listings.filter((l) => bandOf(l) === b).length]),
  ) as Record<Band, number>

  return (
    <>
      <Hero
        title={
          explainer?.title ??
          (locale === 'nl' ? 'Waarom deze banen?' : 'Why these jobs?')
        }
        lead={
          explainer?.summary ??
          (locale === 'nl'
            ? 'Hoe een vacature op dit bord terechtkomt, en waar we het mis kunnen hebben.'
            : 'How a job ends up on this board, and where we might be wrong.')
        }
      />
      <Container>
        {/*
          The answer to the question the reader came with, first: three
          checks, each one card. The third carries the `leverage` id, which the
          index's Dutch band still links to.
        */}
        <Section first>
          <h2 className={s.sectionHeading}>{copy.methodChecksHeading}</h2>
          <p className={s.sectionLead}>{copy.methodChecksLead}</p>
          <ol className={u.checkList}>
            {copy.methodChecks.map((c, i) => (
              <li key={c.title} className={u.check} id={i === 2 ? 'leverage' : undefined}>
                <span className={u.checkNum} aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className={u.checkTitle}>{c.title}</h3>
                <p className={u.checkBody}>{c.body}</p>
              </li>
            ))}
          </ol>
          {/* Rendered from the taxonomy so it cannot drift from what the
              classifier assigns. */}
          <p className={u.checkCausesLabel}>{copy.methodCausesLabel}</p>
          <ul className={u.subareaList}>
            {CAUSE_AREAS.map((cause) => (
              <li key={cause}>
                <Link href={r.cause(cause)}>{copy.causeAreas[cause]}</Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section>
          <h2 className={s.sectionHeading}>{copy.methodKindsHeading}</h2>
          <p className={s.sectionLead}>{copy.methodKindsLead}</p>
          <BandGrid locale={locale} counts={bandCounts} earningToGive={earningToGive.length} />
        </Section>

        {/*
          The board's one piece of honesty that costs it something. No longer
          first on the page — a reader asked how we choose, so that comes first —
          but kept in full here, and in compact form on every listing.
        */}
        <Section>
          <InternationalFirst locale={locale} hideMethodLink />
        </Section>

        <Section>
          <h2 className={s.sectionHeading}>{copy.methodWhyHeading}</h2>
          <div className={`${s.prose} ${u.introBody}`}>
            {copy.methodWhyBody.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
          <p className={u.readMoreLead}>{copy.methodReadMore}</p>
          <ul className={u.readMoreList}>
            {[
              { href: ONWARD_LINKS.pressingProblems80k, label: copy.methodLinkProblems },
              { href: ONWARD_LINKS.solutions80k, label: copy.methodLinkSolutions },
              { href: ONWARD_LINKS.leverage80k, label: copy.methodLinkLeverage },
            ].map((l) => (
              <li key={l.href}>
                <a href={l.href} rel="noopener">
                  {l.label}
                  <Icon name="external-link" />
                </a>
              </li>
            ))}
          </ul>
        </Section>

        {/* Only the uncertainties from the Sanity explainer. Its body is the
            pre-October essay (four questions, the old earning-to-give rule,
            "twenty-five rather than two hundred") and repeated every section
            above, so it is no longer rendered here. */}
        {explainer?.uncertainties ? (
          <Section>
            <Uncertainties
              locale={locale}
              text={explainer.uncertainties}
              heading={locale === 'nl' ? 'Waar we het mis kunnen hebben' : 'Where we might be wrong'}
            />
          </Section>
        ) : null}

        {/* What a reader will notice is missing, side by side: climate, which
            is left out on purpose, and the gaps that are not on purpose. */}
        <Section>
          <div className={u.noteGrid}>
            <ClimateNote locale={locale} />
            <BetaBand locale={locale} />
          </div>
        </Section>

        <Section tight>
          <OnwardStep locale={locale} />
        </Section>
      </Container>
    </>
  )
}

// ---------------------------------------------------------------------------
// Employer pages (§9.4)
// ---------------------------------------------------------------------------

export async function EmployerPage({ locale, slug }: { locale: Locale; slug: string }) {
  const employer = await getEmployer(slug)
  if (!employer) notFound()

  const copy = t(locale)
  const r = routes(locale)
  const listings = await getEmployerListings(employer.id)
  const note = locale === 'en' ? (employer.leverageNoteEn ?? employer.leverageNoteNl) : employer.leverageNoteNl

  return (
    <>
      <Hero title={employer.name} lead={employer.city ?? undefined} />
      <Container>
        <Section first>
          <div className={s.prose}>
            {note ? (
              <p style={{ fontSize: 'var(--text-lg)', lineHeight: 'var(--lh-relaxed)' }}>{note}</p>
            ) : null}

            {/* Listing an earning-to-give employer is not an endorsement, and the
                page says so in those words (§5.3). */}
            {employer.notEndorsement ? (
              <div style={{ marginTop: 'var(--space-6)' }}>
                <div className={u.notEndorsement}>{copy.e2gNotEndorsement}</div>
              </div>
            ) : null}

            <p className={u.linkRow}>
              {employer.website ? (
                <a href={employer.website} rel="noopener">
                  {locale === 'nl' ? 'Website' : 'Website'} <Icon name="external-link" />
                </a>
              ) : null}
              {employer.careersUrl ? (
                <a href={employer.careersUrl} rel="noopener">
                  {locale === 'nl' ? 'Alle vacatures bij deze organisatie' : 'All their vacancies'}{' '}
                  <Icon name="external-link" />
                </a>
              ) : null}
            </p>
          </div>
        </Section>

        <Section>
          <Eyebrow>
            <Icon name="building" />
            {copy.employerRolesHeading}
          </Eyebrow>
          {listings.length ? (
            <ul className={u.cardList}>
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} locale={locale} />
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--fg-muted)' }}>{copy.employerNoRoles}</p>
          )}
          <p className={u.linkRow}>
            <Link href={r.index}>{copy.causeAllRoles}</Link>
          </p>
        </Section>

        {/* Every page a reader can finish on offers the same invitation
            while the board is in beta. */}
        <Section tight>
          <FeedbackBand locale={locale} />
        </Section>

        <Section tight>
          <OnwardStep locale={locale} />
        </Section>
      </Container>
    </>
  )
}

export async function EmployersIndexPage({ locale }: { locale: Locale }) {
  const copy = t(locale)
  const r = routes(locale)
  const employers = await getEmployersWithRoles()

  return (
    <>
      <Hero
        title={locale === 'nl' ? 'Organisaties' : 'Organisations'}
        lead={
          locale === 'nl'
            ? 'Waar deze vacatures staan, en waarom we denken dat deze organisaties ertoe doen.'
            : 'Where these jobs are, and why we think these organisations matter.'
        }
      />
      <Container>
        <Section first>
          {employers.length ? (
            <div className={u.grid2}>
              {employers.map((e) => (
                <Link key={e.id} href={r.employer(e.slug)} className={u.card}>
                  <h2 className={u.cardTitle}>{e.name}</h2>
                  <p className={u.cardMeta}>
                    {[e.city, copy.resultCount(e.roleCount)].filter(Boolean).join(' · ')}
                  </p>
                  {e.leverageNoteNl ? (
                    <p className={u.cardNote}>
                      {(locale === 'en' ? (e.leverageNoteEn ?? e.leverageNoteNl) : e.leverageNoteNl)?.slice(0, 200)}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--fg-muted)' }}>
              {locale === 'nl'
                ? 'Nog geen organisaties met open vacatures.'
                : 'No organisations with open roles yet.'}
            </p>
          )}
        </Section>

        {/* Every page a reader can finish on offers the same invitation
            while the board is in beta. */}
        <Section tight>
          <FeedbackBand locale={locale} />
        </Section>
      </Container>
    </>
  )
}

// ---------------------------------------------------------------------------
// Earning to give (§5.3, §9.6)
// ---------------------------------------------------------------------------

export async function EarningToGivePage({ locale }: { locale: Locale }) {
  const copy = t(locale)
  const r = routes(locale)
  const [explainer, listings] = await Promise.all([
    getExplainer('earning-to-give', locale),
    getEarningToGiveListings(),
  ])

  return (
    <>
      <Hero
        title={explainer?.title ?? copy.e2gTitle}
        lead={
          explainer?.summary ??
          (locale === 'nl'
            ? 'Een baan die zelf niet het punt is, maar die genoeg betaalt dat je er meer goed mee kunt doen dan je zelf zou kunnen produceren.'
            : 'A job that is not the point in itself, but pays enough that giving away a share funds more good than you could produce directly.')
        }
      />
      <Container>
        <Section first>
          {/* The not-an-endorsement statement comes before anything else on the
              page, in those words (§5.3). */}
          <div className={u.notEndorsement}>{copy.e2gNotEndorsement}</div>

          {explainer ? (
            <>
              {/* Below the not-an-endorsement statement, above the argument.
                  This page summarises 80,000 Hours' article on earning to give,
                  and a reader deciding whether to reshape a career around the
                  idea should be able to reach the long version first. */}
              <SourceAttribution sources={explainer.sources ?? []} locale={locale} />
              <RichText value={explainer.body} />
            </>
          ) : null}

          {/* The explainer must also present the honest case against. Earning to
              give is contested within EA, salary is a weak proxy for how much
              someone actually gives, and the plan quietly fails for many people
              who adopt it. A newcomer who encounters a one-sided pitch and later
              discovers the debate will trust nothing else on the site (§5.3). */}
          <Uncertainties
            locale={locale}
            text={explainer?.uncertainties}
            heading={copy.e2gCaseAgainstHeading}
          />
        </Section>

        <Section>
          <Eyebrow>
            <Icon name="coin" />
            {copy.e2gCompensation}
          </Eyebrow>
          {listings.length ? (
            <ul className={u.cardList}>
              {listings.map((listing) => (
                <EarningToGiveCard key={listing.id} listing={listing} locale={locale} />
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--fg-muted)' }}>
              {locale === 'nl'
                ? 'Op dit moment geen open vacatures in deze sectie.'
                : 'No open roles in this section right now.'}
            </p>
          )}
        </Section>

        {/*
          The one part of the board with a natural, non-pushy conversion into the
          rest of the Dutch EA ecosystem: someone taking a trading job is exactly
          who these organisations exist to serve, and the handoff is genuinely
          useful to them rather than extractive (§5.3).
        */}
        <Section>
          <h2 className={s.sectionHeading}>{copy.e2gOnwardHeading}</h2>
          <div className={u.grid2}>
            <a href={ONWARD_LINKS.doneerEffectief} className={u.card} rel="noopener">
              <h3 className={u.cardTitle}>Doneer Effectief</h3>
              <p style={{ color: 'var(--fg-muted)' }}>
                {locale === 'nl'
                  ? 'Nederlands doorgeefluik voor effectieve goede doelen, met belastingvoordeel. €24,3 miljoen gefaciliteerd met vijf betaalde medewerkers — het concrete antwoord op "werkt dit eigenlijk?".'
                  : 'A Dutch channel for tax-efficient giving to effective charities. €24.3M facilitated with five paid staff — the concrete answer to "does this actually work?".'}
              </p>
            </a>
            <a href={ONWARD_LINKS.geefrevolutie} className={u.card} rel="noopener">
              <h3 className={u.cardTitle}>De Geefrevolutie</h3>
              <p style={{ color: 'var(--fg-muted)' }}>
                {locale === 'nl'
                  ? 'De Nederlandse gemeenschap van mensen die een vast deel van hun inkomen weggeven — voorheen de Tien Procent Club. De logische volgende stap als je zo’n baan neemt.'
                  : 'The Dutch community of people giving away a fixed share of their income, formerly the Tien Procent Club. The natural next step if you take one of these jobs.'}
              </p>
            </a>
          </div>
          <p className={u.linkRow}>
            <Link href={r.index}>{copy.causeAllRoles}</Link>
            <Link href={r.method}>{copy.indexIntroMethodLink}</Link>
          </p>
        </Section>

        {/* Every page a reader can finish on offers the same invitation
            while the board is in beta. */}
        <Section tight>
          <FeedbackBand locale={locale} />
        </Section>
      </Container>
    </>
  )
}

/**
 * The feedback page.
 *
 * Deliberately explains the problem before showing the form. "Tell us about a
 * job" is a request; "of thirty-one Dutch organisations we checked, one
 * publishes a feed we can read" is a reason, and the reader who can help is
 * exactly the reader who will recognise that problem as real.
 *
 * It keeps the `SuggestPage` name and the /tip and /suggest routes it was born
 * with, but it now takes six kinds of feedback rather than two — see
 * `SuggestForm`. The second paragraph carries the widening: the board is in
 * beta, and being told where it is wrong is worth as much as being told what it
 * is missing.
 */
export function SuggestPage({ locale }: { locale: Locale }) {
  const copy = t(locale)
  const r = routes(locale)

  return (
    <>
      <Hero title={copy.feedbackTitle} lead={copy.feedbackLead} />
      <Container>
        <Section first>
          {/* The gap class goes on the wrapper, not on each paragraph. Applied
              per-paragraph it makes each one its own single-item flex container,
              which sets the colour and measure but leaves no space between them
              — theme.css zeroes `p` margins — so the three ran together as one
              block. Only visible once this page grew past one paragraph. */}
          <div className={`${s.prose} ${u.introBody}`}>
            {copy.feedbackBody.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </Section>

        <Section>
          <SuggestForm locale={locale} />
        </Section>

        <Section tight>
          <p className={u.linkRow}>
            <Link href={r.index}>{copy.causeAllRoles}</Link>
            <Link href={r.method}>{copy.indexIntroMethodLink}</Link>
          </p>
        </Section>
      </Container>
    </>
  )
}
