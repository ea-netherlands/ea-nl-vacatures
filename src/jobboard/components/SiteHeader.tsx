/**
 * The website's header, on the board — October 2026.
 *
 * The board is served at effectiefaltruisme.nl/vacatures. Until now a reader
 * who clicked "Vacatures" in the site's header landed on a page with a
 * different header altogether, and lost the way back to everything else the
 * site offers. This is the site's own top bar — same logo, same menus, same
 * "Start de gratis cursus" button — rendered by the board, with the board's
 * own navigation as a slim second row underneath (see `BoardNav` in Chrome).
 *
 * The menus are data in ../content/site-chrome.ts, copied from the live site.
 * The behaviour is the site's: a click opens a menu, a second click, Escape
 * or a click elsewhere closes it; below 64rem the menus fold into one panel
 * behind a menu button.
 *
 * The language button is the one place this differs from the site: it goes to
 * the *board's* page in the other language (`switchHref`), not the site's
 * home page, because that is where a reader on a listing wants to go.
 */

'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { Locale } from '../content/i18n'
import { SITE_NAV } from '../content/site-chrome'
import { Icon } from './Icon'
import s from './layout.module.css'
import u from './ui.module.css'

export function SiteHeader({
  locale,
  switchHref,
  children,
}: {
  locale: Locale
  switchHref: string
  /** The board's own row, rendered under the site's bar inside the same sticky header. */
  children?: React.ReactNode
}) {
  const nav = SITE_NAV[locale]
  const [open, setOpen] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open && !mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(null)
        setMobileOpen(false)
      }
    }
    const onClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
    }
  }, [open, mobileOpen])

  const language = (
    <Link
      href={switchHref}
      className={s.siteLang}
      lang={locale === 'nl' ? 'en' : 'nl'}
      title={nav.otherLanguage.title}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={nav.otherLanguage.flag} alt="" width={20} height={15} />
      {nav.otherLanguage.code}
    </Link>
  )

  return (
    <header className={s.header}>
      <div className={s.siteBarWrap}>
        <div className={s.siteBar} ref={barRef}>
          <a href={nav.home} className={s.siteLogo} aria-label="Home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/vacatures-static/img/ean-logo.svg" alt="Effectief Altruïsme Nederland" />
          </a>

          <nav className={s.siteMenus} aria-label={locale === 'nl' ? 'Hoofdmenu' : 'Main menu'}>
            {nav.menus.map((m) =>
              'items' in m ? (
                <div key={m.label} className={s.siteMenu}>
                  <button
                    type="button"
                    className={s.siteMenuButton}
                    aria-haspopup="menu"
                    aria-expanded={open === m.label}
                    onClick={() => setOpen(open === m.label ? null : m.label)}
                  >
                    {m.label}
                    <Icon name="chevron-down" size="1rem" />
                  </button>
                  {open === m.label ? (
                    <ul className={s.siteMenuList} role="menu">
                      {m.items.map((item) => (
                        <li key={item.href} role="none">
                          <a href={item.href} role="menuitem" className={s.siteMenuItem}>
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <a key={m.label} href={m.href} className={`${s.siteMenuButton} ${s.siteMenuLink}`}>
                  {m.label}
                </a>
              ),
            )}
          </nav>

          <div className={s.siteActions}>
            {language}
            <a href={nav.cta.href} className={`${u.btn} ${u.btnSolid} ${u.btnSmall} ${s.siteCta}`}>
              {nav.cta.label}
            </a>
            <button
              type="button"
              className={s.siteMenuToggle}
              aria-expanded={mobileOpen}
              aria-controls="site-mobile-menu"
              aria-label={mobileOpen ? nav.closeMenu : nav.openMenu}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Icon name={mobileOpen ? 'x' : 'menu-2'} size="1.25rem" />
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div id="site-mobile-menu" className={s.siteMobile}>
            {nav.menus.map((m) =>
              'items' in m ? (
                <div key={m.label} className={s.siteMobileGroup}>
                  <p className={s.siteMobileHeading}>{m.label}</p>
                  <ul>
                    {m.items.map((item) => (
                      <li key={item.href}>
                        <a href={item.href}>{item.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <a key={m.label} href={m.href} className={s.siteMobileLink}>
                  {m.label}
                </a>
              ),
            )}
            <a href={nav.cta.href} className={`${u.btn} ${u.btnSolid} ${u.btnFull}`}>
              {nav.cta.label}
            </a>
          </div>
        ) : null}
      </div>
      {children}
    </header>
  )
}
