/**
 * The website's header, on the board.
 *
 * The board is served at effectiefaltruisme.nl/vacatures. Until October 2026 a
 * reader who clicked "Vacatures" in the site's header landed on a page with a
 * different header altogether, and lost the way back to everything else the
 * site offers. This is the site's own top bar — same logo, same menus, same
 * "Start de gratis cursus" button — rendered by the board, with the board's
 * own navigation as a slim second row underneath (see `BoardNav` in Chrome).
 *
 * The menus come from the site itself (../content/site-chrome-live.ts, with
 * ../content/site-chrome.ts as the fallback), passed in by Chrome. Since
 * November 2026 they are the site's five pillars: a click opens a full-width
 * panel under the header with the pillar's grouped links, an optional feature
 * card and a "not sure where to start?" line. A second click, Escape or a
 * click elsewhere closes it. Below 64rem the pillars fold into one panel
 * behind a menu button, one disclosure per pillar.
 *
 * The language button is the one place this differs from the site: it goes to
 * the *board's* page in the other language (`switchHref`), not the site's
 * home page, because that is where a reader on a listing wants to go.
 */

"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "../content/i18n";
import type { SiteNavLink, SitePillar } from "../content/site-chrome";
import type { SiteNav } from "../content/site-chrome-live";
import { Icon } from "./Icon";
import s from "./layout.module.css";
import u from "./ui.module.css";

const isExternal = (href: string) =>
  /^https?:\/\//.test(href) && !href.includes("effectiefaltruisme.nl");

function PanelLink({
  link,
  newTab,
  onNavigate,
}: {
  link: SiteNavLink;
  newTab: string;
  onNavigate: () => void;
}) {
  const external = isExternal(link.href);
  return (
    <a
      href={link.href}
      className={s.panelLink}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={onNavigate}
    >
      <span className={s.panelIcon}>
        <Icon name={link.icon} size="1.25rem" />
      </span>
      <span className={s.panelLinkText}>
        <span className={s.panelLinkLabel}>
          {link.label}
          {external ? (
            <>
              <Icon
                name="arrow-up-right"
                size="0.875rem"
                className={s.panelExternal}
              />
              <span className={u.srOnly}>{newTab}</span>
            </>
          ) : null}
        </span>
        <span className={s.panelLinkDescription}>{link.description}</span>
      </span>
    </a>
  );
}

function Unsure({
  nav,
  onNavigate,
}: {
  nav: SiteNav;
  onNavigate: () => void;
}) {
  const { unsure } = nav;
  return (
    <p className={s.panelUnsure}>
      {unsure.text}{" "}
      <a href={unsure.link.href} onClick={onNavigate}>
        {unsure.link.label}
        <Icon name="arrow-right" size="1rem" />
      </a>
    </p>
  );
}

function Panel({
  id,
  pillar,
  nav,
  onNavigate,
}: {
  id: string;
  pillar: SitePillar;
  nav: SiteNav;
  onNavigate: () => void;
}) {
  const { newTab } = nav;
  const f = pillar.feature;
  return (
    <div id={id} className={s.panel}>
      <div className={s.panelInner}>
        <p className={s.panelHeading}>{pillar.heading}</p>
        <p className={s.panelIntro}>{pillar.intro}</p>
        <div className={s.panelBody}>
          <div className={s.panelGroups}>
            {pillar.groups.map((group) => (
              <div key={group.links[0].href} className={s.panelGroup}>
                {group.title ? (
                  <p className={s.panelGroupTitle}>{group.title}</p>
                ) : null}
                {group.links.map((link) => (
                  <PanelLink
                    key={link.href}
                    link={link}
                    newTab={newTab}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            ))}
          </div>
          {f ? (
            <a href={f.href} className={s.panelFeature} onClick={onNavigate}>
              {f.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.image} alt="" className={s.panelFeatureImage} />
              ) : null}
              <span className={s.panelFeatureTitle}>{f.title}</span>
              <span className={s.panelFeatureText}>{f.text}</span>
              <span className={s.panelFeatureCta}>
                {f.cta}
                <Icon name="arrow-right" size="1rem" />
              </span>
            </a>
          ) : null}
        </div>
        <div className={s.panelFoot}>
          <Unsure nav={nav} onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
}

export function SiteHeader({
  locale,
  nav,
  switchHref,
  children,
}: {
  locale: Locale;
  /** The site's menus, from ../content/site-chrome-live.ts (the site's own, or the bundled copy). */
  nav: SiteNav;
  switchHref: string;
  /** The board's own row, rendered under the site's bar inside the same sticky header. */
  children?: React.ReactNode;
}) {
  const baseId = useId();
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menusRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!open && !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (open) triggers.current[open]?.focus();
      setOpen(null);
      setMobileOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menusRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      )
        return;
      setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open, mobileOpen]);

  const close = () => {
    setOpen(null);
    setMobileOpen(false);
  };
  const openPillar = nav.pillars.find((p) => p.key === open);

  const language = (
    <Link
      href={switchHref}
      className={s.siteLang}
      lang={locale === "nl" ? "en" : "nl"}
      title={nav.otherLanguage.title}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={nav.otherLanguage.flag} alt="" width={20} height={15} />
      {nav.otherLanguage.code}
    </Link>
  );

  return (
    <header className={s.header}>
      <div className={s.siteBarWrap}>
        <div className={s.siteBar}>
          <a href={nav.home} className={s.siteLogo} aria-label="Home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/vacatures-static/img/ean-logo.svg"
              alt="Effectief Altruïsme Nederland"
            />
          </a>

          <nav
            ref={menusRef}
            className={s.siteMenus}
            aria-label={locale === "nl" ? "Hoofdmenu" : "Main menu"}
          >
            {nav.pillars.map((p) => (
              <button
                key={p.key}
                ref={(el) => {
                  triggers.current[p.key] = el;
                }}
                type="button"
                className={s.siteMenuButton}
                aria-expanded={open === p.key}
                aria-controls={
                  open === p.key ? `${baseId}-${p.key}` : undefined
                }
                onClick={() => setOpen(open === p.key ? null : p.key)}
              >
                {p.label}
                <Icon
                  name="chevron-down"
                  size="1rem"
                  className={s.siteMenuChevron}
                />
              </button>
            ))}
          </nav>

          <div className={s.siteActions}>
            {language}
            <a
              href={nav.cta.href}
              className={`${u.btn} ${u.btnSolid} ${u.btnSmall} ${s.siteCta}`}
            >
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
              <Icon name={mobileOpen ? "x" : "menu-2"} size="1.25rem" />
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div id="site-mobile-menu" className={s.siteMobile}>
            {nav.pillars.map((p) => (
              <details key={p.key} className={s.siteMobilePillar}>
                <summary>
                  {p.heading}
                  <Icon
                    name="chevron-down"
                    size="1rem"
                    className={s.siteMenuChevron}
                  />
                </summary>
                <div className={s.siteMobileGroups}>
                  {p.groups.map((group) => (
                    <div key={group.links[0].href}>
                      {group.title ? (
                        <p className={s.panelGroupTitle}>{group.title}</p>
                      ) : null}
                      <ul>
                        {group.links.map((link) => (
                          <li key={link.href}>
                            <a href={link.href} onClick={close}>
                              <span className={s.panelIconSmall}>
                                <Icon name={link.icon} size="1rem" />
                              </span>
                              {link.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            ))}
            <Unsure nav={nav} onNavigate={close} />
            <a
              href={nav.cta.href}
              className={`${u.btn} ${u.btnSolid} ${u.btnFull}`}
            >
              {nav.cta.label}
            </a>
          </div>
        ) : null}
      </div>
      {children}
      {openPillar ? (
        <div ref={panelRef}>
          <div
            className={s.panelScrim}
            aria-hidden
            onClick={() => setOpen(null)}
          />
          <Panel
            id={`${baseId}-${openPillar.key}`}
            pillar={openPillar}
            nav={nav}
            onNavigate={close}
          />
        </div>
      ) : null}
    </header>
  );
}
