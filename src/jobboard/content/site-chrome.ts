/**
 * The website's header and footer on the board: types, and the board's own strings.
 *
 * The board is served at effectiefaltruisme.nl/vacatures, so a reader moves
 * between the two without noticing — until the chrome changes. Until November
 * 2026 this file held a hand-made copy of the site's menus and footer, which
 * fell behind whenever the site changed (it was missing "Onze impact" when it
 * was retired).
 *
 * Now the menus and footer links come from the site itself:
 *
 *  - Live: effectiefaltruisme.nl/api/site-chrome, read once an hour
 *    (./site-chrome-live.ts). The site builds it from the same code as its own
 *    header and footer (ean-website: src/lib/site-chrome.ts).
 *  - Fallback: ./site-chrome.snapshot.json, the same payload saved into this
 *    repo, used when the site can't be reached. Refresh it with
 *    `npm run sync-site-chrome`; it only needs to be roughly current.
 *
 * What stays here is what the site doesn't publish as menu data: the course
 * button, the language switch, screen-reader labels, the footer tagline and the
 * "Cookie-instellingen" button (which reopens the board's copy of the site's
 * consent banner, components/Analytics.tsx).
 */

import type { Locale } from "./i18n";
import type { IconName } from "../components/Icon";

export const SITE = "https://effectiefaltruisme.nl";

export type SiteLink = { label: string; href: string };

export type SiteNavLink = SiteLink & { description: string; icon: IconName };

export type SitePillar = {
  key: string;
  /** The label in the header bar. */
  label: string;
  /** Shown above the panel's links, and as the group label in the mobile menu. */
  heading: string;
  intro: string;
  groups: { title?: string; links: SiteNavLink[] }[];
  feature?: {
    image?: string;
    title: string;
    text: string;
    cta: string;
    href: string;
  };
};

export type SiteNav = {
  home: string;
  pillars: SitePillar[];
  /** The line at the foot of every panel, for readers who don't know which pillar they need. */
  unsure: { text: string; link: SiteLink };
  cta: SiteLink;
  /** The language button's label: the code of the *other* language, as on the site. */
  otherLanguage: { code: string; flag: string; title: string };
  openMenu: string;
  closeMenu: string;
  newTab: string;
};

export type SiteFooter = {
  tagline: string;
  columns: { heading: string; links: SiteLink[] }[];
  anbi: { heading: string; body: string; ids: string; link: string; href: string };
  postal: { heading: string; lines: string[] };
  registered: { heading: string; lines: string[] };
  legal: SiteLink[];
  /** The button after the legal links that reopens the cookie banner. */
  cookieSettings: string;
};

/** The parts of the header that aren't menu data. */
export const BOARD_NAV: Record<
  Locale,
  Pick<SiteNav, "home" | "cta" | "otherLanguage" | "openMenu" | "closeMenu" | "newTab">
> = {
  nl: {
    home: SITE,
    cta: {
      label: "Start de korte cursus",
      href: `${SITE}/en/courses/pressing-problems`,
    },
    otherLanguage: {
      code: "EN",
      flag: "/vacatures-static/img/flags/en.svg",
      title: "Switch to English",
    },
    openMenu: "Menu openen",
    closeMenu: "Menu sluiten",
    newTab: "(opent in een nieuw tabblad)",
  },
  en: {
    home: `${SITE}/en`,
    cta: {
      label: "Start the quick course",
      href: `${SITE}/en/courses/pressing-problems`,
    },
    otherLanguage: {
      code: "NL",
      flag: "/vacatures-static/img/flags/nl.svg",
      title: "Switch to Dutch",
    },
    openMenu: "Open menu",
    closeMenu: "Close menu",
    newTab: "(opens in a new tab)",
  },
};

/** The parts of the footer that aren't menu data. */
export const BOARD_FOOTER: Record<Locale, Pick<SiteFooter, "tagline" | "cookieSettings">> = {
  nl: {
    tagline: "Samen op zoek naar de beste manieren om anderen te helpen.",
    cookieSettings: "Cookie-instellingen",
  },
  en: {
    tagline: "Finding the best ways to help others, together",
    cookieSettings: "Cookie settings",
  },
};
