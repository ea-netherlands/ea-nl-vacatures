/**
 * Page chrome: header, footer, container and hero.
 *
 * Everything is wrapped in `.jb-root`, which is where theme.css declares its
 * tokens — so the board carries its own styling with no assumptions about the
 * host app, and at merge time nothing leaks either way (§6.2a).
 */

import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  INTERNATIONAL_BOARDS,
  ONWARD_LINKS,
  routes,
  t,
  otherLocale,
  type Locale,
} from '../content/i18n'
import { Icon, type IconName } from './Icon'
import s from './layout.module.css'
import u from './ui.module.css'

export function Container({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={[s.container, className].filter(Boolean).join(' ')}>{children}</div>
}

export function Section({
  children,
  first,
  tight,
  id,
}: {
  children: ReactNode
  first?: boolean
  tight?: boolean
  id?: string
}) {
  return (
    <section
      id={id}
      className={first ? s.sectionFirst : tight ? s.sectionTight : s.section}
    >
      {children}
    </section>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className={s.eyebrow}>{children}</span>
}

/**
 * The hero.
 *
 * `compact` is what the index's filtered state uses: once a reader has picked a
 * cause or a skill, a full-height hero restating the board's pitch is something
 * to scroll past on the way to the list they asked for. Same furniture, less of
 * it, and the title becomes the name of what they chose.
 */
export function Hero({
  title,
  lead,
  compact,
  children,
}: {
  title: string
  lead?: string
  compact?: boolean
  children?: ReactNode
}) {
  return (
    <div className={s.hero}>
      <div className={s.heroPattern} aria-hidden="true" />
      <div className={s.heroHalo} aria-hidden="true" />
      <Container>
        <div className={compact ? s.heroInnerCompact : s.heroInner}>
          <h1 className={compact ? s.heroTitleCompact : s.heroTitle}>{title}</h1>
          {lead ? <p className={s.heroLead}>{lead}</p> : null}
          {children}
        </div>
      </Container>
    </div>
  )
}

/**
 * The language switcher stays visible because a Dutch listing page will carry a
 * Dutch frame, Dutch labels and sometimes an English editorial note. That is
 * entirely normal in the Netherlands and needs no explanation — so there is
 * deliberately no apologetic banner about it (§9.5).
 */
function Header({ locale, switchHref }: { locale: Locale; switchHref: string }) {
  const copy = t(locale)
  const r = routes(locale)
  return (
    <header className={s.header}>
      <Container>
        <div className={s.headerInner}>
          <Link href={r.index} className={s.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/ean-logo.svg" alt="Effectief Altruïsme Nederland" className={s.brandLogo} />
            <span className={s.brandDivider} aria-hidden="true" />
            <span className={s.brandName}>{copy.boardName}</span>
          </Link>
          <nav className={s.nav} aria-label={copy.boardName}>
            <Link href={r.index} className={s.navLink}>
              {locale === 'nl' ? 'Alle vacatures' : 'All jobs'}
            </Link>
            <Link href={r.method} className={s.navLink}>
              {locale === 'nl' ? 'Zo kiezen we' : 'How we choose'}
            </Link>
            <Link href={r.employers} className={s.navLink}>
              {locale === 'nl' ? 'Organisaties' : 'Organisations'}
            </Link>
            <Link href={r.earningToGive} className={s.navLinkDistinct}>
              {copy.e2gTitle}
            </Link>
            <Link href={r.suggest} className={s.navLink}>
              {copy.suggestNavLabel}
            </Link>
            <Link href={switchHref} className={s.navLink} lang={otherLocale(locale)}>
              {copy.languageSwitch}
            </Link>
          </nav>
        </div>
      </Container>
    </header>
  )
}

function Footer({ locale }: { locale: Locale }) {
  const copy = t(locale)
  const r = routes(locale)
  return (
    <footer className={s.footer}>
      <Container>
        <div className={s.footerGrid}>
          <div>
            <p className={s.footerHeading}>{locale === 'nl' ? 'Het bord' : 'The board'}</p>
            <ul className={s.footerList}>
              <li>
                <Link href={r.index}>{locale === 'nl' ? 'Alle vacatures' : 'All jobs'}</Link>
              </li>
              <li>
                <Link href={r.method}>{locale === 'nl' ? 'Zo kiezen we' : 'How we choose'}</Link>
              </li>
              <li>
                <Link href={r.causes}>
                  {locale === 'nl' ? 'Probleemgebieden' : 'Problem areas'}
                </Link>
              </li>
              <li>
                <Link href={r.employers}>
                  {locale === 'nl' ? 'Organisaties' : 'Organisations'}
                </Link>
              </li>
              <li>
                <Link href={r.earningToGive}>{copy.e2gTitle}</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className={s.footerHeading}>
              {locale === 'nl' ? 'Verder lezen' : 'Read further'}
            </p>
            <ul className={s.footerList}>
              <li>
                <a href={ONWARD_LINKS.introCourse}>
                  {locale === 'nl' ? 'Introductiecursus' : 'Intro course'}
                </a>
              </li>
              <li>
                <a href={ONWARD_LINKS.careerGuide}>
                  {locale === 'nl' ? 'Loopbaangids' : 'Career guide'}
                </a>
              </li>
              <li>
                <a href={ONWARD_LINKS.glossary}>
                  {locale === 'nl' ? 'Begrippenlijst' : 'Glossary'}
                </a>
              </li>
              <li>
                <a href={ONWARD_LINKS.newsletter}>
                  {locale === 'nl' ? 'Nieuwsbrief' : 'Newsletter'}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className={s.footerHeading}>
              {locale === 'nl' ? 'Effectief geven' : 'Effective giving'}
            </p>
            <ul className={s.footerList}>
              <li>
                <a href={ONWARD_LINKS.doneerEffectief}>Doneer Effectief</a>
              </li>
              <li>
                <a href={ONWARD_LINKS.geefrevolutie}>De Geefrevolutie</a>
              </li>
            </ul>
          </div>
        </div>

        {/* The board is curated by people who can be wrong, and says so (§9.5). */}
        <div className={s.footerNote}>
          <p className={u.onwardHeading}>{copy.disagreeHeading}</p>
          <p>
            {copy.disagreeBody}{' '}
            <a href={ONWARD_LINKS.contact}>jobs@effectiefaltruisme.nl</a>
          </p>
        </div>
      </Container>
    </footer>
  )
}

export function Shell({
  locale,
  switchHref,
  children,
}: {
  locale: Locale
  switchHref: string
  children: ReactNode
}) {
  const copy = t(locale)
  return (
    <div className={`jb-root ${s.shell}`} lang={locale}>
      <a href="#board-main" className={s.skip}>
        {copy.skipToContent}
      </a>
      <Header locale={locale} switchHref={switchHref} />
      <main id="board-main" className={s.main}>
        {children}
      </main>
      <Footer locale={locale} />
    </div>
  )
}

/**
 * One quiet onward step for a reader who has just got curious. Placed at the
 * end, offered once, in plain language — never as a modal or an interstitial.
 * A newcomer who feels marketed to at this moment is lost permanently (§9.3).
 */
export function OnwardStep({ locale }: { locale: Locale }) {
  const copy = t(locale)
  return (
    <div className={u.onward}>
      <h2 className={u.onwardHeading}>{copy.onwardHeading}</h2>
      <p className={u.onwardBody}>{copy.onwardBody}</p>
      <div className={u.onwardActions}>
        <a href={ONWARD_LINKS.introCourse} className={`${u.btn} ${u.btnSubtle}`}>
          {copy.onwardCourse}
          <Icon name="arrow-right" />
        </a>
        <a href={ONWARD_LINKS.newsletter} className={`${u.btn} ${u.btnGhost}`}>
          {copy.onwardNewsletter}
        </a>
      </div>
    </div>
  )
}

/**
 * The international-first band (§4a).
 *
 * The board's central piece of honesty, and the section most likely to be cut
 * by someone optimising for engagement: it opens by telling the reader that the
 * best opportunities are somewhere else. Keep it.
 *
 * The order matters. Look-elsewhere first, three named boards second, and only
 * then the reason this board exists — because a reader who *can* move should be
 * able to leave at the second paragraph, and a reader who cannot should not have
 * to read a pitch before reaching the part addressed to them.
 */
export function InternationalFirst({
  locale,
  compact,
}: {
  locale: Locale
  compact?: boolean
}) {
  const copy = t(locale)
  const r = routes(locale)

  /*
    The compact form, for the index.

    The full band runs to roughly eight hundred pixels, which on the rebuilt
    index meant a reader met a screen and a half of "look somewhere else first"
    before reaching a single cause tile. The statement has to stay above
    everything actionable — it is the board's one piece of real honesty and a
    version of it below the grid would be a footer — but "above" and "at full
    height" are different requirements. So the index gets the same three boards
    and the same claim in one line each, and the reasoning stays one click away
    on the method page.
  */
  if (compact) {
    return (
      <div className={u.intlBandCompact}>
        <p className={u.intlCompactText}>
          <Icon name="world" />
          <span>{copy.intlCompact}</span>
        </p>
        <p className={u.intlCompactLinks}>
          {INTERNATIONAL_BOARDS.map((board) => (
            <a key={board.id} href={board.url} rel="noopener">
              {board.name}
              <Icon name="external-link" />
            </a>
          ))}
          <Link href={r.method}>{copy.intlLink}</Link>
        </p>
      </div>
    )
  }

  return (
    <div className={u.intlBand}>
      <h2 className={u.intlHeading}>
        <Icon name="world" />
        {copy.intlHeading}
      </h2>
      <div className={u.introBody}>
        {copy.intlBody.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>

      <ul className={u.intlBoards}>
        {INTERNATIONAL_BOARDS.map((board) => (
          <li key={board.id}>
            <a href={board.url} className={u.intlBoard} rel="noopener">
              <span className={u.intlBoardName}>
                {board.name}
                <Icon name="external-link" />
              </span>
              <span className={u.intlBoardBlurb}>{copy.intlBoardBlurbs[board.id]}</span>
            </a>
          </li>
        ))}
      </ul>

      <p className={u.intlFallback}>{copy.intlFallback}</p>
      <p className={u.linkRow}>
        <Link href={r.method}>
          {copy.intlLink} <Icon name="arrow-right" />
        </Link>
      </p>
    </div>
  )
}

/**
 * The header for one of the index's two tiers.
 *
 * The board ranks recommended-by-an-evaluator roles above the ones it judges
 * itself, and that ranking used to live only in the sort order — which told
 * the reader nothing. Saying it out loud costs two headings and two
 * paragraphs, and it lets someone weigh the recommendation for themselves:
 * the first tier names the organisations who did the vetting, the second
 * admits the judgement is ours.
 */
export function TierHeading({
  icon,
  heading,
  body,
  count,
}: {
  icon: IconName
  heading: string
  body: string
  count: string
}) {
  return (
    <div className={u.tierHeader}>
      <h2 className={u.tierHeading}>
        <Icon name={icon} />
        {heading}
        <span className={u.tierCount}>{count}</span>
      </h2>
      <p className={u.tierBody}>{body}</p>
    </div>
  )
}

/**
 * The compact form, for listing pages. Most visitors never see the index — they
 * land on a listing from a Dutch-language search (§4) — so the statement has to
 * reach them there too. One line, because a full section on every listing would
 * read as nagging and get tuned out, which is worse than not saying it.
 */
export function InternationalNote({ locale }: { locale: Locale }) {
  const copy = t(locale)
  const r = routes(locale)
  return (
    <p className={u.intlShort}>
      <Icon name="world" />
      <span>
        {copy.intlShort} <Link href={r.method}>{copy.intlLink}</Link>
      </span>
    </p>
  )
}

/**
 * Why climate is not on the board (§5.1).
 *
 * This is the question a Dutch reader is most likely to arrive with, and the
 * answer is about neglectedness rather than importance — so it has to be said
 * plainly or it reads as a dismissal. The referral is not a courtesy: an
 * exclusion with nowhere to send people is just a gap.
 */
export function ClimateNote({ locale }: { locale: Locale }) {
  const copy = t(locale)
  return (
    <div className={u.climateNote}>
      <h2 className={u.uncertaintyHeading}>
        <Icon name="leaf" />
        {copy.climateHeading}
      </h2>
      <div className={u.uncertaintyBody}>
        {copy.climateBody.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>
      <p className={u.linkRow}>
        <a href={ONWARD_LINKS.effectiveEnvironmentalism} rel="noopener">
          {copy.climateReferralLink} <Icon name="external-link" />
        </a>
      </p>
    </div>
  )
}
