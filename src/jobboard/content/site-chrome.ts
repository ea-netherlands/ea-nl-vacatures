/**
 * The website's own header menus and footer, copied.
 *
 * The board is served at effectiefaltruisme.nl/vacatures, so a reader moves
 * between the two without noticing — until the chrome changes. So these are
 * the site's, menu for menu and link for link, in both languages. The site
 * keeps them as code (header-menu/data.ts and footer/data.ts in ean-website),
 * which the board cannot import, so this is a copy: when the site's header or
 * footer changes, change this file to match.
 *
 * Last synced 2 November 2026, after the site moved to five pillars (Leren,
 * Community, Carrière, Geven, Over ons), each opening a panel of grouped links
 * with icons and short descriptions.
 *
 * The footer's "Cookie-instellingen" button is here too, after the legal
 * links as on the site. It reopens the board's copy of the site's consent
 * banner (components/Analytics.tsx), which shares the site's stored choice.
 */

import type { Locale } from "./i18n";
import type { IconName } from "../components/Icon";

export const SITE = "https://effectiefaltruisme.nl";
export const POLICY_PLAN_PDF =
  "https://cdn.sanity.io/files/315e81a9/production/52ea4ad10e40b58d23da198c07fad7ea4b5a0a04.pdf";
const FINANCIALS_PDF =
  "https://cdn.sanity.io/files/315e81a9/production/756796ebbb98a31df12e984d5ea837eb9bf25734.pdf";
const WHATSAPP = "https://chat.whatsapp.com/HtPYuTVHp45CwXlPCek83i";
// EA Netherlands' partner page for the Giving What We Can pledge. Link every pledge mention here.
const PLEDGE = "https://www.givingwhatwecan.org/pledge/ea-netherlands";

export type SiteLink = { label: string; href: string };

export const SITE_FOOTER: Record<
  Locale,
  {
    tagline: string;
    columns: { heading: string; links: SiteLink[] }[];
    anbi: { heading: string; body: string; ids: string; link: string };
    postal: { heading: string; lines: string[] };
    registered: { heading: string; lines: string[] };
    legal: SiteLink[];
    /** The button after the legal links that reopens the cookie banner. */
    cookieSettings: string;
  }
> = {
  nl: {
    tagline: "Samen op zoek naar de beste manieren om anderen te helpen.",
    columns: [
      {
        heading: "Leren",
        links: [
          {
            label: "Wat is effectief altruïsme?",
            href: `${SITE}/wat-is-effectief-altruisme`,
          },
          { label: "Verhalen", href: `${SITE}/verhalen` },
          {
            label: "Gratis cursus (Engels)",
            href: `${SITE}/en/courses/pressing-problems`,
          },
          { label: "EA Fellowship", href: `${SITE}/ea-fellowship` },
          { label: "Artikelen", href: `${SITE}/artikelen` },
        ],
      },
      {
        heading: "Community",
        links: [
          { label: "Evenementen", href: `${SITE}/evenementen` },
          { label: "Lokale groepen", href: `${SITE}/word-lid-van-een-groep` },
          { label: "Coworkingruimte", href: `${SITE}/coworking` },
          { label: "WhatsApp-community", href: WHATSAPP },
        ],
      },
      {
        heading: "Carrière",
        links: [
          { label: "Carrièregids", href: `${SITE}/carrieregids` },
          { label: "Gesprek met ons team", href: `${SITE}/virtuele-koffie` },
          { label: "Vacatures", href: "/vacatures" },
          { label: "Vrijwilligerswerk", href: `${SITE}/vrijwilliger` },
        ],
      },
      {
        heading: "Geven",
        links: [
          {
            label: "Donatiegids",
            href: `${SITE}/donatie-gids-effectieve-goede-doelen`,
          },
          { label: "Doneer Effectief", href: "https://doneereffectief.nl" },
          { label: "De 10%-belofte", href: PLEDGE },
        ],
      },
      {
        heading: "Over ons",
        links: [
          {
            label: "Wie we zijn",
            href: `${SITE}/effectief-altruisme-nederland`,
          },
          { label: "Contact", href: `${SITE}/contact` },
          { label: "Steun ons", href: `${SITE}/steun-ons` },
        ],
      },
    ],
    anbi: {
      heading: "ANBI",
      body: "Effectief Altruïsme Nederland is een erkende ANBI (algemeen nut beogende instelling). Je giften aan ons zijn daardoor aftrekbaar van de belasting.",
      ids: "RSIN 857171367 · KvK 67780903",
      link: "Onze ANBI-gegevens staan in ons beleidsplan (pdf)",
    },
    postal: {
      heading: "Postadres",
      lines: ["Van Diemenstraat 92", "1013 CN Amsterdam"],
    },
    registered: {
      heading: "Vestigingsadres",
      lines: ["Dorpsstraat 40", "3481 EL Harmelen"],
    },
    legal: [
      { label: "Gedragscode", href: `${SITE}/gedragscode-ea-nederland` },
      { label: "Privacybeleid", href: `${SITE}/legal/privacy-policy` },
      { label: "Beleidsplan (pdf)", href: POLICY_PLAN_PDF },
      { label: "Financiële overzichten (pdf)", href: FINANCIALS_PDF },
      { label: "Credits", href: `${SITE}/legal/credits` },
    ],
    cookieSettings: "Cookie-instellingen",
  },
  en: {
    tagline: "Finding the best ways to help others, together",
    columns: [
      {
        heading: "Learn",
        links: [
          {
            label: "What is effective altruism?",
            href: `${SITE}/en/what-is-effective-altruism`,
          },
          { label: "Stories", href: `${SITE}/en/stories` },
          {
            label: "Free course",
            href: `${SITE}/en/courses/pressing-problems`,
          },
          { label: "EA Fellowship", href: `${SITE}/en/ea-fellowship` },
          { label: "Articles", href: `${SITE}/en/articles` },
        ],
      },
      {
        heading: "Community",
        links: [
          { label: "Events", href: `${SITE}/en/events-page` },
          { label: "Local groups", href: `${SITE}/en/join-a-group` },
          { label: "Co-working space", href: `${SITE}/en/office` },
          { label: "WhatsApp community", href: WHATSAPP },
        ],
      },
      {
        heading: "Careers",
        links: [
          { label: "Career guide", href: `${SITE}/en/career-guide` },
          { label: "Call with our team", href: `${SITE}/en/virtual-coffee` },
          { label: "Jobs board", href: "/en/jobs" },
          { label: "Volunteer", href: `${SITE}/en/volunteer` },
        ],
      },
      {
        heading: "Giving",
        links: [
          {
            label: "Donation guide",
            href: `${SITE}/en/donation-guide-effective-charities`,
          },
          { label: "Doneer Effectief", href: "https://doneereffectief.nl" },
          { label: "The 10% pledge", href: PLEDGE },
        ],
      },
      {
        heading: "About us",
        links: [
          { label: "Who we are", href: `${SITE}/en/about` },
          { label: "Contact", href: `${SITE}/en/contact-us` },
          { label: "Support us", href: `${SITE}/en/support-us` },
        ],
      },
    ],
    anbi: {
      heading: "ANBI",
      body: "Effectief Altruïsme Nederland is a registered ANBI (public benefit organisation), so donations to us are tax-deductible in the Netherlands.",
      ids: "RSIN 857171367 · KvK 67780903",
      link: "Our ANBI information is in our policy plan (PDF)",
    },
    postal: {
      heading: "Postal address",
      lines: ["Van Diemenstraat 92", "1013 CN Amsterdam"],
    },
    registered: {
      heading: "Registered address",
      lines: ["Dorpsstraat 40", "3481 EL Harmelen"],
    },
    legal: [
      { label: "Code of conduct", href: `${SITE}/en/legal/code-of-conduct` },
      { label: "Privacy policy", href: `${SITE}/en/legal/privacy-policy` },
      { label: "Policy plan (PDF)", href: POLICY_PLAN_PDF },
      { label: "Financial statements (PDF)", href: FINANCIALS_PDF },
      { label: "Credits", href: `${SITE}/en/legal/credits` },
    ],
    cookieSettings: "Cookie settings",
  },
};

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

export const SITE_NAV: Record<
  Locale,
  {
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
  }
> = {
  nl: {
    home: SITE,
    pillars: [
      {
        key: "learn",
        label: "Leren",
        heading: "Leren",
        intro:
          "Begrijp de ideeën achter effectief altruïsme, in je eigen tempo of samen met anderen.",
        groups: [
          {
            title: "Lezen",
            links: [
              {
                label: "Wat is effectief altruïsme?",
                description:
                  "Een korte introductie tot de belangrijkste ideeën.",
                href: `${SITE}/wat-is-effectief-altruisme`,
                icon: "bulb",
              },
              {
                label: "Verhalen",
                description:
                  "Céline, Jesse en Nicoll over hun weg naar werk met impact.",
                href: `${SITE}/verhalen`,
                icon: "quote",
              },
            ],
          },
          {
            title: "Cursussen",
            links: [
              {
                label: "Gratis online cursus",
                description:
                  "In je eigen tempo, in minder dan twee uur. In het Engels.",
                href: `${SITE}/en/courses/pressing-problems`,
                icon: "school",
              },
              {
                label: "EA Fellowship",
                description:
                  "Een selectief programma waarin je de ideeën in een kleine groep verdiept.",
                href: `${SITE}/ea-fellowship`,
                icon: "users",
              },
            ],
          },
        ],
        feature: {
          image: `${SITE}/images/intro-learn.webp`,
          title: "Start de gratis cursus",
          text: "Ontdek in minder dan twee uur hoe je meer goed kunt doen.",
          cta: "Begin nu",
          href: `${SITE}/en/courses/pressing-problems`,
        },
      },
      {
        key: "community",
        label: "Community",
        heading: "Community, coworking en evenementen",
        intro:
          "Ontmoet mensen die net als jij zoeken naar de beste manieren om te helpen.",
        groups: [
          {
            title: "Ontmoeten",
            links: [
              {
                label: "Evenementen",
                description:
                  "Lezingen, workshops en borrels door het hele land.",
                href: `${SITE}/evenementen`,
                icon: "calendar-event",
              },
              {
                label: "Lokale groepen",
                description:
                  "Groepen in negen steden, van Amsterdam tot Maastricht.",
                href: `${SITE}/word-lid-van-een-groep`,
                icon: "map-pin",
              },
              {
                label: "EA Global en EAGx",
                description:
                  "Internationale conferenties om mensen uit het veld te ontmoeten.",
                href: "https://www.effectivealtruism.org/ea-global",
                icon: "world",
              },
            ],
          },
          {
            title: "Blijf verbonden",
            links: [
              {
                label: "Coworkingruimte",
                description:
                  "Werk in ons kantoor in Amsterdam, naast anderen die impact willen maken.",
                href: `${SITE}/coworking`,
                icon: "building-community",
              },
              {
                label: "WhatsApp-community",
                description: "Blijf op de hoogte en stel je vragen.",
                href: WHATSAPP,
                icon: "brand-whatsapp",
              },
              {
                label: "Community health",
                description:
                  "Onze gedragscode, vertrouwenspersonen en een anoniem meldformulier.",
                href: `${SITE}/gedragscode-ea-nederland`,
                icon: "shield-check",
              },
            ],
          },
        ],
        feature: {
          image: `${SITE}/images/home/community/eagx-utrecht.jpg`,
          title: "Kom naar een evenement",
          text: "Bekijk wat er de komende weken bij jou in de buurt gebeurt.",
          cta: "Bekijk de agenda",
          href: `${SITE}/evenementen`,
        },
      },
      {
        key: "careers",
        label: "Carrière",
        heading: "Carrière",
        intro: "Gebruik je loopbaan om een groot verschil te maken.",
        groups: [
          {
            title: "Advies",
            links: [
              {
                label: "Carrièregids",
                description: "Onze gids voor een loopbaan met impact.",
                href: `${SITE}/carrieregids`,
                icon: "compass",
              },
              {
                label: "Gesprek met ons team",
                description: "Bespreek je volgende stap in een videogesprek.",
                href: `${SITE}/virtuele-koffie`,
                icon: "video",
              },
              {
                label: "Probably Good-advies",
                description:
                  "Gratis één-op-één loopbaanadvies, voor studenten en professionals.",
                href: "https://probablygood.org/advising/",
                icon: "messages",
              },
            ],
          },
          {
            title: "Programma's",
            links: [
              {
                label: "EA Career Bootcamp",
                description:
                  "Drie weken online begeleiding om over te stappen naar werk met impact.",
                href: "https://www.effectivealtruism.org/courses/bootcamp",
                icon: "rocket",
              },
              {
                label: "Impact Accelerator",
                description:
                  "Een programma van zes weken van High Impact Professionals.",
                href: "https://www.highimpactprofessionals.org/impact-accelerator",
                icon: "trending-up",
              },
            ],
          },
          {
            title: "Kansen",
            links: [
              {
                label: "Vacatures",
                description: "Banen, stages en programma's met impact.",
                href: "/vacatures",
                icon: "briefcase",
              },
              {
                label: "Vrijwilligerswerk",
                description: "Help mee bij EA Nederland.",
                href: `${SITE}/vrijwilliger`,
                icon: "heart-handshake",
              },
            ],
          },
        ],
      },
      {
        key: "giving",
        label: "Geven",
        heading: "Geven",
        intro: "Zorg dat je donaties zo veel mogelijk goed doen.",
        groups: [
          {
            title: "Waar geef je aan?",
            links: [
              {
                label: "Donatiegids",
                description:
                  "Goede doelen waar je geld het meeste verschil maakt.",
                href: `${SITE}/donatie-gids-effectieve-goede-doelen`,
                icon: "list-check",
              },
              {
                label: "Doneer Effectief",
                description:
                  "Het Nederlandse platform om aan effectieve goede doelen te geven.",
                href: "https://doneereffectief.nl",
                icon: "coin",
              },
            ],
          },
          {
            title: "Hoe geef je?",
            links: [
              {
                label: "De 10%-belofte",
                description:
                  "Beloof met Giving What We Can om 10% van je inkomen te geven.",
                href: PLEDGE,
                icon: "heart",
              },
            ],
          },
        ],
        feature: {
          title: "Nieuw bij effectief geven?",
          text: "Begin met onze donatiegids: een korte lijst goede doelen waar je geld het meeste doet.",
          cta: "Lees de donatiegids",
          href: `${SITE}/donatie-gids-effectieve-goede-doelen`,
        },
      },
      {
        key: "about",
        label: "Over ons",
        heading: "Over EA Nederland",
        intro: "Wie we zijn en hoe je ons bereikt.",
        groups: [
          {
            title: "Organisatie",
            links: [
              {
                label: "Wie we zijn",
                description: "Ons team en onze missie.",
                href: `${SITE}/effectief-altruisme-nederland`,
                icon: "users-group",
              },
              {
                label: "Steun ons",
                description: "Help ons meer mensen te bereiken.",
                href: `${SITE}/steun-ons`,
                icon: "heart",
              },
            ],
          },
          {
            title: "Contact",
            links: [
              {
                label: "Contact",
                description: "Stel je vraag of stuur ons een bericht.",
                href: `${SITE}/contact`,
                icon: "mail",
              },
              {
                label: "Community health",
                description:
                  "Onze gedragscode, vertrouwenspersonen en een anoniem meldformulier.",
                href: `${SITE}/gedragscode-ea-nederland`,
                icon: "shield-check",
              },
            ],
          },
        ],
      },
    ],
    unsure: {
      text: "Weet je niet waar je moet beginnen?",
      link: {
        label: "Plan een gesprek met ons team",
        href: `${SITE}/virtuele-koffie`,
      },
    },
    cta: {
      label: "Start de gratis cursus",
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
    pillars: [
      {
        key: "learn",
        label: "Learn",
        heading: "Learn",
        intro:
          "Understand the ideas behind effective altruism, at your own pace or with others.",
        groups: [
          {
            title: "Read",
            links: [
              {
                label: "What is effective altruism?",
                description: "A short introduction to the main ideas.",
                href: `${SITE}/en/what-is-effective-altruism`,
                icon: "bulb",
              },
              {
                label: "Stories",
                description:
                  "Céline, Jesse and Nicoll on their path to high-impact work.",
                href: `${SITE}/en/stories`,
                icon: "quote",
              },
            ],
          },
          {
            title: "Courses",
            links: [
              {
                label: "Free online course",
                description: "At your own pace, in under two hours.",
                href: `${SITE}/en/courses/pressing-problems`,
                icon: "school",
              },
              {
                label: "EA Fellowship",
                description:
                  "A selective programme where you dig into the ideas in a small group.",
                href: `${SITE}/en/ea-fellowship`,
                icon: "users",
              },
            ],
          },
        ],
        feature: {
          image: `${SITE}/images/intro-learn.webp`,
          title: "Start the free course",
          text: "Find out how you can do more good, in under two hours.",
          cta: "Begin now",
          href: `${SITE}/en/courses/pressing-problems`,
        },
      },
      {
        key: "community",
        label: "Community",
        heading: "Community, coworking and events",
        intro:
          "Meet people who, like you, are looking for the best ways to help.",
        groups: [
          {
            title: "Meet people",
            links: [
              {
                label: "Events",
                description: "Talks, workshops and socials across the country.",
                href: `${SITE}/en/events-page`,
                icon: "calendar-event",
              },
              {
                label: "Local groups",
                description:
                  "Groups in nine cities, from Amsterdam to Maastricht.",
                href: `${SITE}/en/join-a-group`,
                icon: "map-pin",
              },
              {
                label: "EA Global and EAGx",
                description:
                  "International conferences to meet people in the field.",
                href: "https://www.effectivealtruism.org/ea-global",
                icon: "world",
              },
            ],
          },
          {
            title: "Stay connected",
            links: [
              {
                label: "Co-working space",
                description:
                  "Work from our Amsterdam office, alongside others who want to make a difference.",
                href: `${SITE}/en/office`,
                icon: "building-community",
              },
              {
                label: "WhatsApp community",
                description: "Stay up to date and ask your questions.",
                href: WHATSAPP,
                icon: "brand-whatsapp",
              },
              {
                label: "Community health",
                description:
                  "Our code of conduct, trust persons and an anonymous reporting form.",
                href: `${SITE}/en/legal/code-of-conduct`,
                icon: "shield-check",
              },
            ],
          },
        ],
        feature: {
          image: `${SITE}/images/home/community/eagx-utrecht.jpg`,
          title: "Come to an event",
          text: "See what's happening near you in the coming weeks.",
          cta: "See the calendar",
          href: `${SITE}/en/events-page`,
        },
      },
      {
        key: "careers",
        label: "Careers",
        heading: "Careers",
        intro: "Use your career to make a big difference.",
        groups: [
          {
            title: "Advice",
            links: [
              {
                label: "Career guide",
                description: "Our guide to a high-impact career.",
                href: `${SITE}/en/career-guide`,
                icon: "compass",
              },
              {
                label: "Call with our team",
                description: "Talk through your next step on a video call.",
                href: `${SITE}/en/virtual-coffee`,
                icon: "video",
              },
              {
                label: "Probably Good advising",
                description:
                  "Free one-on-one career advice, for students and professionals.",
                href: "https://probablygood.org/advising/",
                icon: "messages",
              },
            ],
          },
          {
            title: "Programmes",
            links: [
              {
                label: "EA Career Bootcamp",
                description:
                  "Three weeks of online support to move into high-impact work.",
                href: "https://www.effectivealtruism.org/courses/bootcamp",
                icon: "rocket",
              },
              {
                label: "Impact Accelerator",
                description:
                  "A six-week programme from High Impact Professionals.",
                href: "https://www.highimpactprofessionals.org/impact-accelerator",
                icon: "trending-up",
              },
            ],
          },
          {
            title: "Opportunities",
            links: [
              {
                label: "Jobs board",
                description: "High-impact jobs, internships and programmes.",
                href: "/en/jobs",
                icon: "briefcase",
              },
              {
                label: "Volunteer",
                description: "Help out at EA Netherlands.",
                href: `${SITE}/en/volunteer`,
                icon: "heart-handshake",
              },
            ],
          },
        ],
      },
      {
        key: "giving",
        label: "Giving",
        heading: "Giving",
        intro: "Make sure your donations do as much good as possible.",
        groups: [
          {
            title: "Where to give",
            links: [
              {
                label: "Donation guide",
                description:
                  "Charities where your money makes the biggest difference.",
                href: `${SITE}/en/donation-guide-effective-charities`,
                icon: "list-check",
              },
              {
                label: "Doneer Effectief",
                description:
                  "The Dutch platform for giving to effective charities.",
                href: "https://doneereffectief.nl",
                icon: "coin",
              },
            ],
          },
          {
            title: "How to give",
            links: [
              {
                label: "The 10% pledge",
                description:
                  "Pledge with Giving What We Can to give 10% of your income.",
                href: PLEDGE,
                icon: "heart",
              },
            ],
          },
        ],
        feature: {
          title: "New to effective giving?",
          text: "Start with our donation guide: a short list of charities where your money goes furthest.",
          cta: "Read the donation guide",
          href: `${SITE}/en/donation-guide-effective-charities`,
        },
      },
      {
        key: "about",
        label: "About us",
        heading: "About EA Netherlands",
        intro: "Who we are and how to reach us.",
        groups: [
          {
            title: "Organisation",
            links: [
              {
                label: "Who we are",
                description: "Our team and our mission.",
                href: `${SITE}/en/about`,
                icon: "users-group",
              },
              {
                label: "Support us",
                description: "Help us reach more people.",
                href: `${SITE}/en/support-us`,
                icon: "heart",
              },
            ],
          },
          {
            title: "Contact",
            links: [
              {
                label: "Contact",
                description: "Ask a question or send us a message.",
                href: `${SITE}/en/contact-us`,
                icon: "mail",
              },
              {
                label: "Community health",
                description:
                  "Our code of conduct, trust persons and an anonymous reporting form.",
                href: `${SITE}/en/legal/code-of-conduct`,
                icon: "shield-check",
              },
            ],
          },
        ],
      },
    ],
    unsure: {
      text: "Not sure where to start?",
      link: {
        label: "Book a call with our team",
        href: `${SITE}/en/virtual-coffee`,
      },
    },
    cta: {
      label: "Start the free course",
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
