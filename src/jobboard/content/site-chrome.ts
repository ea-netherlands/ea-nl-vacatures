/**
 * The website's own header menus and footer, copied, October 2026.
 *
 * The board is served at effectiefaltruisme.nl/vacatures, so a reader moves
 * between the two without noticing — until the chrome changes. The board's
 * header and footer used to be its own, built in August against the site as
 * it was then; the site has since moved on (dropdown menus and a "Start de
 * gratis cursus" button in the header, a dark teal footer with an ANBI row),
 * and the two no longer looked like one website.
 *
 * So these are the site's, menu for menu and link for link, in both
 * languages, read off the live site on 16 October 2026. The site manages them
 * in its own Sanity project, which the board cannot read, so this is a copy:
 * when the site's header or footer changes, change this file to match.
 *
 * The footer's "Cookie-instellingen" button is here too, after the legal
 * links as on the site. It reopens the board's copy of the site's consent
 * banner (components/Analytics.tsx), which shares the site's stored choice.
 */

import type { Locale } from './i18n'

export const SITE = 'https://effectiefaltruisme.nl'
export const POLICY_PLAN_PDF =
  'https://cdn.sanity.io/files/315e81a9/production/52ea4ad10e40b58d23da198c07fad7ea4b5a0a04.pdf'
const FINANCIALS_PDF =
  'https://cdn.sanity.io/files/315e81a9/production/756796ebbb98a31df12e984d5ea837eb9bf25734.pdf'
const WHATSAPP = 'https://chat.whatsapp.com/HtPYuTVHp45CwXlPCek83i'

export type SiteLink = { label: string; href: string }

export const SITE_FOOTER: Record<
  Locale,
  {
    tagline: string
    columns: { heading: string; links: SiteLink[] }[]
    anbi: { heading: string; body: string; ids: string; link: string }
    postal: { heading: string; lines: string[] }
    registered: { heading: string; lines: string[] }
    legal: SiteLink[]
    /** The button after the legal links that reopens the cookie banner. */
    cookieSettings: string
  }
> = {
  nl: {
    tagline: 'Samen op zoek naar de beste manieren om anderen te helpen.',
    columns: [
      {
        heading: 'Leren',
        links: [
          { label: 'Wat is effectief altruïsme?', href: `${SITE}/wat-is-effectief-altruisme` },
          { label: 'Gratis cursus (Engels)', href: `${SITE}/en/courses/pressing-problems` },
          { label: 'EA Fellowship', href: `${SITE}/ea-fellowship` },
          { label: 'Artikelen', href: `${SITE}/artikelen` },
        ],
      },
      {
        heading: 'Mensen ontmoeten',
        links: [
          { label: 'Evenementen', href: `${SITE}/evenementen` },
          { label: 'Lokale groepen', href: `${SITE}/word-lid-van-een-groep` },
          { label: 'WhatsApp-community', href: WHATSAPP },
          { label: 'Coworkingruimte', href: `${SITE}/coworking` },
          { label: 'Bel met ons team', href: `${SITE}/virtuele-koffie` },
        ],
      },
      {
        heading: 'Kom in actie',
        links: [
          { label: 'Carrièregids', href: `${SITE}/carrieregids` },
          { label: 'Vacatures', href: '/vacatures' },
          { label: 'Donatiegids', href: `${SITE}/donatie-gids-effectieve-goede-doelen` },
          { label: 'Vrijwilligerswerk', href: `${SITE}/vrijwilliger` },
        ],
      },
      {
        heading: 'Over ons',
        links: [
          { label: 'Wie we zijn', href: `${SITE}/effectief-altruisme-nederland` },
          { label: 'Contact', href: `${SITE}/contact` },
          { label: 'Steun ons', href: `${SITE}/steun-ons` },
        ],
      },
    ],
    anbi: {
      heading: 'ANBI',
      body: 'Effectief Altruïsme Nederland is een erkende ANBI (algemeen nut beogende instelling). Je giften aan ons zijn daardoor aftrekbaar van de belasting.',
      ids: 'RSIN 857171367 · KvK 67780903',
      link: 'Onze ANBI-gegevens staan in ons beleidsplan (pdf)',
    },
    postal: { heading: 'Postadres', lines: ['Van Diemenstraat 92', '1013 CN Amsterdam'] },
    registered: { heading: 'Vestigingsadres', lines: ['Dorpsstraat 40', '3481 EL Harmelen'] },
    legal: [
      { label: 'Gedragscode', href: `${SITE}/gedragscode-ea-nederland` },
      { label: 'Privacybeleid', href: `${SITE}/legal/privacy-policy` },
      { label: 'Beleidsplan (pdf)', href: POLICY_PLAN_PDF },
      { label: 'Financiële overzichten (pdf)', href: FINANCIALS_PDF },
      { label: 'Credits', href: `${SITE}/legal/credits` },
    ],
    cookieSettings: 'Cookie-instellingen',
  },
  en: {
    tagline: 'Finding the best ways to help others, together',
    columns: [
      {
        heading: 'Learn',
        links: [
          { label: 'What is effective altruism?', href: `${SITE}/en/what-is-effective-altruism` },
          { label: 'Free course', href: `${SITE}/en/courses/pressing-problems` },
          { label: 'EA Fellowship', href: `${SITE}/en/ea-fellowship` },
          { label: 'Articles', href: `${SITE}/en/articles` },
        ],
      },
      {
        heading: 'Meet people',
        links: [
          { label: 'Events', href: `${SITE}/en/events-page` },
          { label: 'Local groups', href: `${SITE}/en/join-a-group` },
          { label: 'WhatsApp community', href: WHATSAPP },
          { label: 'Co-working space', href: `${SITE}/en/office` },
          { label: 'Call with our team', href: `${SITE}/en/virtual-coffee` },
        ],
      },
      {
        heading: 'Take action',
        links: [
          { label: 'Career guide', href: `${SITE}/en/career-guide` },
          { label: 'Jobs board', href: '/en/jobs' },
          { label: 'Donation guide', href: `${SITE}/en/donation-guide-effective-charities` },
          { label: 'Volunteer', href: `${SITE}/en/volunteer` },
        ],
      },
      {
        heading: 'About us',
        links: [
          { label: 'Who we are', href: `${SITE}/en/about` },
          { label: 'Contact', href: `${SITE}/en/contact-us` },
          { label: 'Support us', href: `${SITE}/en/support-us` },
        ],
      },
    ],
    anbi: {
      heading: 'ANBI',
      body: 'Effectief Altruïsme Nederland is a registered ANBI (public benefit organisation), so donations to us are tax-deductible in the Netherlands.',
      ids: 'RSIN 857171367 · KvK 67780903',
      link: 'Our ANBI information is in our policy plan (PDF)',
    },
    postal: { heading: 'Postal address', lines: ['Van Diemenstraat 92', '1013 CN Amsterdam'] },
    registered: { heading: 'Registered address', lines: ['Dorpsstraat 40', '3481 EL Harmelen'] },
    legal: [
      { label: 'Code of conduct', href: `${SITE}/en/legal/code-of-conduct` },
      { label: 'Privacy policy', href: `${SITE}/en/legal/privacy-policy` },
      { label: 'Policy plan (PDF)', href: POLICY_PLAN_PDF },
      { label: 'Financial statements (PDF)', href: FINANCIALS_PDF },
      { label: 'Credits', href: `${SITE}/en/legal/credits` },
    ],
    cookieSettings: 'Cookie settings',
  },
}


export const SITE_NAV: Record<
  Locale,
  {
    home: string
    menus: ({ label: string; href: string } | { label: string; items: SiteLink[] })[]
    cta: SiteLink
    /** The language button's label: the code of the *other* language, as on the site. */
    otherLanguage: { code: string; flag: string; title: string }
    openMenu: string
    closeMenu: string
  }
> = {
  nl: {
    home: SITE,
    menus: [
      {
        label: 'Leren',
        items: [
          { label: 'Wat is effectief altruïsme?', href: `${SITE}/wat-is-effectief-altruisme` },
          { label: 'EA Fellowship', href: `${SITE}/ea-fellowship` },
          { label: 'Gratis online cursus (Engels)', href: `${SITE}/en/courses/pressing-problems` },
          { label: 'Artikelen', href: `${SITE}/artikelen` },
          { label: 'Begrippenlijst', href: `${SITE}/begrippenlijst` },
          { label: 'Quiz', href: 'https://eanetherlands.scoreapp.com/' },
        ],
      },
      {
        label: 'Ontmoet mensen',
        items: [
          { label: 'Virtuele koffie', href: `${SITE}/virtuele-koffie` },
          { label: 'Sluit je aan bij een groep', href: `${SITE}/word-lid-van-een-groep` },
          { label: 'Co-working kantoor', href: `${SITE}/coworking` },
          { label: 'Onze online community', href: 'https://community.effectiefaltruisme.nl/c/start-here/' },
        ],
      },
      { label: 'Evenementen', href: `${SITE}/evenementen` },
      { label: 'Vacatures', href: '/vacatures' },
      {
        label: 'Doe mee',
        items: [
          { label: 'Carrièregids', href: `${SITE}/carrieregids` },
          { label: 'Donatiegids', href: `${SITE}/donatie-gids-effectieve-goede-doelen` },
          { label: 'Vrijwilligerswerk', href: `${SITE}/vrijwilliger` },
        ],
      },
      {
        label: 'Over ons',
        items: [
          { label: 'Over Effectief Altruïsme Nederland', href: `${SITE}/effectief-altruisme-nederland` },
          { label: 'Community health', href: `${SITE}/gedragscode-ea-nederland` },
          { label: 'Contact', href: `${SITE}/contact` },
        ],
      },
    ],
    cta: { label: 'Start de gratis cursus', href: `${SITE}/en/courses/pressing-problems` },
    otherLanguage: { code: 'EN', flag: '/vacatures-static/img/flags/en.svg', title: 'Switch to English' },
    openMenu: 'Menu openen',
    closeMenu: 'Menu sluiten',
  },
  en: {
    home: `${SITE}/en`,
    menus: [
      {
        label: 'Learn',
        items: [
          { label: 'What is effective altruism?', href: `${SITE}/en/what-is-effective-altruism` },
          { label: 'EA Fellowship', href: `${SITE}/en/ea-fellowship` },
          { label: 'Free online course', href: `${SITE}/en/courses/pressing-problems` },
          { label: 'Articles', href: `${SITE}/en/articles` },
          { label: 'Glossary', href: `${SITE}/en/glossary` },
          { label: 'Quiz', href: 'https://eanetherlands.scoreapp.com/' },
        ],
      },
      {
        label: 'Connect',
        items: [
          { label: 'Virtual coffee', href: `${SITE}/en/virtual-coffee` },
          { label: 'Join a group', href: `${SITE}/en/join-a-group` },
          { label: 'Co-working office', href: `${SITE}/en/office` },
          { label: 'Our online community', href: 'https://community.effectiefaltruisme.nl/c/start-here/' },
        ],
      },
      { label: 'Events', href: `${SITE}/en/events-page` },
      { label: 'Jobs', href: '/en/jobs' },
      {
        label: 'Take action',
        items: [
          { label: 'Career guide', href: `${SITE}/en/career-guide` },
          { label: 'Donation guide', href: `${SITE}/en/donation-guide-effective-charities` },
          { label: 'Volunteering', href: `${SITE}/en/volunteer` },
        ],
      },
      {
        label: 'About us',
        items: [
          { label: 'About Effective Altruism Netherlands', href: `${SITE}/en/about` },
          { label: 'Community health', href: `${SITE}/en/legal/code-of-conduct` },
          { label: 'Contact us', href: `${SITE}/en/contact-us` },
        ],
      },
    ],
    cta: { label: 'Start the free course', href: `${SITE}/en/courses/pressing-problems` },
    otherLanguage: { code: 'NL', flag: '/vacatures-static/img/flags/nl.svg', title: 'Switch to Dutch' },
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },
}
