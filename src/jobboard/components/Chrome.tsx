/**
 * Page chrome: header, footer, container and hero.
 *
 * Everything is wrapped in `.jb-root`, which is where theme.css declares its
 * tokens — so the board carries its own styling with no assumptions about the
 * host app, and at merge time nothing leaks either way (§6.2a).
 */

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ONWARD_LINKS, routes, t, otherLocale, type Locale } from '../content/i18n'
import { Icon } from './Icon'
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

export function Hero({
  title,
  lead,
  children,
}: {
  title: string
  lead?: string
  children?: ReactNode
}) {
  return (
    <div className={s.hero}>
      <div className={s.heroPattern} aria-hidden="true" />
      <div className={s.heroHalo} aria-hidden="true" />
      <Container>
        <div className={s.heroInner}>
          <h1 className={s.heroTitle}>{title}</h1>
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
                <a href={ONWARD_LINKS.tienProcentClub}>Tien Procent Club</a>
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
