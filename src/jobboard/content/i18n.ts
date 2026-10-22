/**
 * Interface strings — spec §6.4.
 *
 * "Interface strings (filter labels, buttons, empty states) belong in a plain
 * translation file in the repo, not in Sanity."
 *
 * Dutch is the source language for every piece of interface furniture (§9.5);
 * English is the translation. Copy is sentence case, second person, plain and
 * warm; buttons are short verb phrases.
 */

import {
  CAUSE_AREAS,
  LANGUAGE_REQUIREMENTS,
  LEVERAGE_TYPES,
  LOCATION_MODES,
  SENIORITIES,
  SKILLS,
  SUB_AREAS,
  WORK_AUTHORISATIONS,
  type CauseArea,
  type LanguageRequirement,
  type LeverageType,
  type LocationMode,
  type Seniority,
  type Skill,
  type SubArea,
  type WorkAuthorisation,
} from '../taxonomy'
import type { Band } from '../lib/bands'

export const LOCALES = ['nl', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'nl'

/** Route prefixes. Dutch is the canonical URL; English lives under /en (§9.1). */
export const ROUTES = {
  nl: {
    index: '/vacatures',
    detail: (slug: string) => `/vacatures/${slug}`,
    employers: '/vacatures/organisaties',
    employer: (slug: string) => `/vacatures/organisaties/${slug}`,
    // 'probleemgebieden', not 'oorzaken': the Dutch for a cause area is a
    // problem area, and 'oorzaak' means a root cause of something.
    causes: '/vacatures/probleemgebieden',
    cause: (slug: string) => `/vacatures/probleemgebieden/${slug}`,
    method: '/vacatures/waarom-deze-banen',
    earningToGive: '/vacatures/earning-to-give',
    suggest: '/vacatures/tip',
  },
  en: {
    index: '/en/jobs',
    detail: (slug: string) => `/en/jobs/${slug}`,
    employers: '/en/jobs/organisations',
    employer: (slug: string) => `/en/jobs/organisations/${slug}`,
    causes: '/en/jobs/causes',
    cause: (slug: string) => `/en/jobs/causes/${slug}`,
    method: '/en/jobs/why-these-jobs',
    earningToGive: '/en/jobs/earning-to-give',
    suggest: '/en/jobs/suggest',
  },
} as const

/**
 * The three international boards we send people to *first* (§4a).
 *
 * This ordering is deliberate and the board's central piece of honesty: someone
 * optimising hard for impact should look here before looking at us. Naming them
 * up front costs us traffic and buys the only thing that makes the rest of the
 * board credible.
 */
export const INTERNATIONAL_BOARDS = [
  { id: '80k', name: '80,000 Hours', url: 'https://jobs.80000hours.org' },
  { id: 'probably-good', name: 'Probably Good', url: 'https://jobs.probablygood.org' },
  {
    id: 'ea-opportunities',
    name: 'EA Opportunities',
    url: 'https://www.effectivealtruism.org/opportunities',
  },
] as const

export type InternationalBoardId = (typeof INTERNATIONAL_BOARDS)[number]['id']

/**
 * What a reader can tell us, in the order the form offers it.
 *
 * The first two are the original tip form and still the most valuable thing
 * anyone sends: the August 2026 sweep found one Dutch organisation in thirty-one
 * publishing a machine-readable job feed, so coverage genuinely depends on
 * people telling us. The other four exist because a form that only accepts
 * suggestions reads as "we are not asking about anything else" — and while the
 * board is in beta, the something-is-wrong and we-are-missing-a-whole-area
 * cases are worth more than a polite tip.
 *
 * The order is deliberate: most actionable first, catch-all last.
 */
export const FEEDBACK_KINDS = ['listing', 'employer', 'correction', 'gap', 'site', 'other'] as const
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]

/**
 * The two kinds that are a pointer at something specific, and therefore the
 * two where a link and an organisation name are the point rather than
 * optional context. Shared with the API route so the form and the endpoint
 * cannot drift apart on what is required.
 */
export const POINTER_KINDS: readonly FeedbackKind[] = ['listing', 'employer']

export function isFeedbackKind(value: unknown): value is FeedbackKind {
  return typeof value === 'string' && (FEEDBACK_KINDS as readonly string[]).includes(value)
}

/** External destinations for the onward step (§4). */
export const ONWARD_LINKS = {
  // The two steps the website itself offers, October 2026: the free self-paced
  // course (about 100 minutes, English only, no sign-up) and the selective
  // five-week EA Fellowship. /introductiecursus now redirects to the
  // fellowship, which is why the course has its own link.
  freeCourse: 'https://effectiefaltruisme.nl/en/courses/pressing-problems',
  fellowship: {
    nl: 'https://effectiefaltruisme.nl/ea-fellowship',
    en: 'https://effectiefaltruisme.nl/en/ea-fellowship',
  },
  // The site itself now routes its own "Nieuwsbrief" nav label to /contact
  // rather than a dedicated signup page — matched here rather than left 404ing.
  newsletter: 'https://effectiefaltruisme.nl/contact',
  glossary: 'https://effectiefaltruisme.nl/begrippenlijst',
  // The site nav renamed this from /loopbaan at some point; verified live.
  careerGuide: 'https://effectiefaltruisme.nl/carrieregids',
  doneerEffectief: 'https://doneereffectief.nl',
  // Rebranded from the Tien Procent Club in 2026. tienprocentclub.nl no longer
  // resolves at all, so this was a dead link in the footer and on the
  // earning-to-give page, not merely an out-of-date name.
  geefrevolutie: 'https://www.geefrevolutie.nl',
  contact: 'mailto:jobs@effectiefaltruisme.nl',
  // The cookie banner links the website's own policy: one consent, one policy.
  privacyPolicyNl: 'https://effectiefaltruisme.nl/legal/privacy-policy',
  privacyPolicyEn: 'https://effectiefaltruisme.nl/en/legal/privacy-policy',
  effectiveEnvironmentalism: 'https://www.effectiveenvironmentalism.org',

  // Ways people actually route money once they have taken a well-paid job.
  // Three different mechanisms rather than three versions of the same one: a
  // personal pledge, an equity pledge for founders, and company ownership.
  givingWhatWeCan: 'https://www.givingwhatwecan.org',
  foundersPledge: 'https://www.founderspledge.com',
  profitForGood: 'https://profit4good.org',

  /*
    80,000 Hours' own writing, linked where the reader is already asking the
    question it answers rather than gathered into a reading list nobody opens.
    Each one sits next to the claim it backs: the definition beside the
    headline, cause choice beside the cause grid, the guide and the planning
    process beside the "what next" block at the foot of the page.
  */
  socialImpactDefinition: 'https://80000hours.org/articles/what-is-social-impact-definition/',
  problemChoiceMatters: 'https://80000hours.org/articles/your-choice-of-problem-is-crucial/',
  careerGuide80k: 'https://80000hours.org/make-a-difference-with-your-career/',
  careerPlanning80k: 'https://80000hours.org/career-planning/summary/',
  // The long version of the one idea the second tier of this board rests on.
  // Linked from the tier heading and from the method page, because "leverage"
  // is the board's most load-bearing word and we explain it in two paragraphs
  // where they spend an article on it.
  leverage80k: 'https://80000hours.org/articles/leverage/',
  // The other two legs of the same argument, linked from the method page where
  // each one is being made.
  pressingProblems80k: 'https://80000hours.org/career-guide/most-pressing-problems/',
  solutions80k: 'https://80000hours.org/articles/solutions/',
} as const

type Strings = {
  boardName: string
  boardTagline: string
  skipToContent: string

  /*
    The beta statement.

    The board went to the Dutch community for feedback before it was finished,
    which means every reader is arriving at something incomplete. Saying so is
    not modesty — an unmarked beta gets judged as a finished product, and the
    specific failures worth hearing about (a listing that should not be here, a
    whole area we are not covering) are exactly the ones a reader stays quiet
    about when they assume the gaps are deliberate.

    `betaBadge` rides in the header on every page. `betaBody` is the honest
    version, on the index. `betaShort` is the one-line form for a listing page,
    where most readers actually land.
  */
  betaBadge: string
  betaHeading: string
  betaBody: string[]
  betaCta: string
  betaShort: string
  betaShortLink: string

  // The international-first statement (§4a) — index, method page and every
  // listing. `intlShort` is the compact form for a listing page, where a full
  // section would be nagging but silence would be misleading.
  intlHeading: string
  intlBody: string[]
  intlBoardBlurbs: Record<InternationalBoardId, string>
  intlFallback: string
  intlShort: string
  /**
   * The index's one-line form. Deliberately does NOT name the three boards —
   * `intlShort` does, because on a listing page it stands alone, whereas here
   * the three names follow immediately as links and saying them twice reads
   * like a stutter.
   */
  intlCompact: string
  intlLink: string

  // Why climate is not on the board (§5.1)
  climateHeading: string
  climateBody: string[]
  climateReferralLink: string

  // Index — hero and the browse grid (rebuilt August 2026)
  heroTitle: string
  heroLead: string

  // Earning to give, promoted to its own band on the index (August 2026)
  e2gBandHeading: string
  e2gBandBody: string
  e2gBandCta: string
  e2gBandRouted: string
  e2gBandGwwc: string
  e2gBandFoundersPledge: string
  e2gBandProfitForGood: string

  /*
    The method page, rewritten October 2026.

    It used to be a 2,500-word essay in five movements (why the problem matters,
    ITN, our five areas, solutions, eight leverage mechanisms), and it still
    described the two-tier index the October bands replaced. Readers arrive here
    from "How we choose" with one question — how does a job get on this board? —
    so the page now answers that in three checks and the four kinds of role, and
    hands the full argument to 80,000 Hours, whose argument it is. Their material
    may NOT be reproduced (see ./sources), so this stays our sentences.
  */
  methodChecksHeading: string
  methodChecksLead: string
  methodChecks: { title: string; body: string }[]
  methodCausesLabel: string
  methodKindsHeading: string
  methodKindsLead: string
  methodWhyHeading: string
  methodWhyBody: string[]
  methodReadMore: string
  methodLinkProblems: string
  methodLinkSolutions: string
  methodLinkLeverage: string

  // Contextual further reading
  readProblemChoice: string
  readCareerGuide: string
  readCareerPlanning: string
  browseCauseHeading: string
  browseCauseBody: string
  browseSkillHeading: string
  browseSkillBody: string
  browseSkillAside: string
  browseLocationHeading: string
  browseLocationBody: string
  browseRoleCount: (n: number) => string
  browseEmptyTile: string
  browseShowAll: (n: number) => string
  backToBrowse: string
  filteredByCause: (label: string) => string
  filteredBySubArea: (label: string) => string
  filteredBySkill: (label: string) => string
  filteredByLocation: (label: string) => string

  /*
    Feedback (August 2026; widened from suggestions-only in September 2026).

    It began as a tip form: name a vacancy or an organisation we have missed.
    That is still the highest-value thing a reader can send, and it is still
    first in the list — but it was the *only* thing the form would take, which
    quietly told anyone with a different kind of feedback that there was
    nowhere to put it. A reader who thinks a listing does not belong, or that
    the board ignores their whole field, or that they could not work out what
    the two tiers meant, was left with an email address in the footer.

    So the kinds below are the six things people actually want to say, and the
    form shapes itself around whichever one they pick.
  */
  feedbackTitle: string
  feedbackLead: string
  feedbackBody: string[]
  suggestKindLabel: string
  /** Label and one-line hint per kind, in the order they are offered. */
  feedbackKinds: Record<FeedbackKind, { label: string; hint: string }>
  suggestUrlListing: string
  suggestUrlEmployer: string
  feedbackUrlOptional: string
  suggestOrgLabel: string
  feedbackOrgOptional: string
  suggestWhyLabel: string
  suggestWhyHint: string
  feedbackMessageLabel: string
  feedbackMessageHint: string
  suggestEmailLabel: string
  suggestEmailHint: string
  suggestSubmit: string
  suggestSending: string
  suggestError: string
  suggestThanksHeading: string
  suggestThanksBody: string
  suggestNavLabel: string
  /** The standing invitation, at the foot of the index and every listing. */
  feedbackBandHeading: string
  feedbackBandBody: string
  feedbackBandCta: string
  feedbackBandEmail: string

  // Index
  indexTitle: string
  indexIntroHeading: string
  indexIntroBody: string[]
  indexIntroDismiss: string
  indexIntroMethodLink: string
  resultCount: (n: number) => string
  sortLabel: string
  sortRecent: string
  sortLeverage: string
  /** The two labelled tiers on the index — see IndexPage. */
  tierRecommendedHeading: string
  tierRecommendedBody: string
  tierRecommendedCount: (n: number) => string
  tierDutchHeading: string
  tierDutchBody: string
  /**
   * Links to the method page's leverage section from the tier heading.
   *
   * The second tier is the one that needs explaining: a reader who understands
   * why GiveWell is on a job board does not automatically understand why a
   * bank's agricultural lending team is, and "we judge role by role" does not
   * tell them. The heading now says what we are judging *for*, and this link
   * goes to the longer version.
   */
  tierDutchLeverageLink: string
  tierDutchCount: (n: number) => string
  /**
   * The third band, October 2026: internships, traineeships and programmes.
   * See ../lib/bands for what goes in it and why it is decided first.
   */
  tierRoutesHeading: string
  tierRoutesBody: string
  tierRoutesCount: (n: number) => string
  /** Short band names, for the filter and the front-page tiles. */
  bandLabels: Record<Band, string>
  bandBlurbs: Record<Band, string>
  /** The earning-to-give tile beside the bands; it links to its own page, not a filter. */
  e2gTileBlurb: string
  browseBandHeading: string
  browseBandBody: string
  filterBand: string
  /** A programme's badge on its card, and its length beside it. */
  programmeBadge: string
  programmeWeeks: (n: number) => string
  /** The pay row on a programme's detail page: a stipend is not a salary. */
  detailStipend: string
  tierExpand: (n: number) => string
  tierCollapse: string
  /**
   * Label on the contents strip above the two tiers.
   *
   * Replaces what truncation used to do — telling a reader the list has two
   * distinct halves — without hiding the first half to say it.
   */
  tierJumpLabel: string
  filtersHeading: string
  clearFilters: string
  emptyHeading: string
  emptyBody: string
  emptySuggestion: string
  emptyClear: string

  // Filters
  filterCause: string
  filterLeverage: string
  filterLocation: string
  filterSkill: string
  filterSubArea: string
  filterLanguage: string
  filterSeniority: string
  filterAny: string

  // Card / detail
  cardWhyPrefix: string
  detailFrame: string
  detailFrameLink: string
  /** Under the why-block on a listing: the beta caveat, attached to the judgement it is about. */
  detailWhyCaveat: string
  detailFactsHeading: string
  detailWhyHeading: string
  detailAboutHeading: string
  detailEligibilityHeading: string
  detailApply: string
  detailApplyNote: string
  detailEmployerLink: (name: string) => string
  detailCauseLink: string
  detailPostedAt: string
  detailDeadline: string
  detailNoDeadline: string
  detailSalary: string
  detailSalaryUnknown: string
  /** Appended to the figure at render time — see promote.ts salaryText. */
  salaryPerMonth: string
  salaryPerYear: string
  detailThirtyPercent: string
  detailThirtyPercentNote: string

  // Eligibility labels
  labelLanguage: string
  labelWorkAuth: string
  labelScreening: string
  labelLocation: string
  labelSeniority: string
  screeningYes: string
  screeningNo: string

  // Employer / cause pages
  employerRolesHeading: string
  employerNoRoles: string
  causeRolesHeading: string
  causeNoRoles: string
  causeAllRoles: string
  causeUncertainHeading: string

  // Earning to give
  e2gTitle: string
  e2gNotEndorsement: string
  e2gCaseAgainstHeading: string
  e2gOnwardHeading: string
  e2gCompensation: string

  // Onward step
  onwardHeading: string
  onwardBody: string
  onwardCourse: string
  onwardFellowship: string

  // Footer / misc
  languageSwitch: string
  expiredHeading: string
  expiredBody: string
  updatedAt: string
  disagreeHeading: string
  disagreeBody: string
  /**
   * The cookie banner and preferences dialog. Copied verbatim from the
   * website's `messages/*.json` (`cookieBanner`), because it is the same
   * consent on the same origin and a visitor should read the same words
   * wherever on the site they are asked. The footer's "Cookie settings"
   * label lives with the rest of the footer, in site-chrome.ts.
   */
  cookie: {
    title: string
    description: string
    customise: string
    privacyLink: string
    acceptAll: string
    rejectAll: string
    prefsTitle: string
    prefsDescription: string
    alwaysOn: string
    save: string
    close: string
    necessaryTitle: string
    necessaryDescription: string
    analyticsTitle: string
    analyticsDescription: string
    marketingTitle: string
    marketingDescription: string
  }
  /** One line under the brand lockup in the footer, as on the website. */

  causeAreas: Record<CauseArea, string>
  /** One line per cause area, for the browse tiles. */
  causeBlurbs: Record<CauseArea, string>
  subAreas: Record<SubArea, string>
  skills: Record<Skill, string>
  leverage: Record<LeverageType, string>
  locationModes: Record<LocationMode, string>
  languageRequirements: Record<LanguageRequirement, string>
  workAuthorisations: Record<WorkAuthorisation, string>
  seniorities: Record<Seniority, string>
}

const nl: Strings = {
  boardName: 'Vacatures',
  boardTagline:
    'Hoe je vanuit Nederland werkt aan de grootste en meest verwaarloosde problemen ter wereld',
  skipToContent: 'Naar de inhoud',

  betaBadge: 'Bèta',
  betaHeading: 'Dit bord is nog in bèta',
  betaBody: [
    'We laten het nu aan de Nederlandse gemeenschap zien terwijl het nog niet af is, omdat we liever nu horen wat er mis mee is dan over een half jaar.',
    'Wat je merkt: de lijst is nog niet compleet — we volgen tientallen Nederlandse organisaties, maar zeker niet alle. De reden die we bij een vacature schrijven is ons oordeel en kan er gewoon naast zitten. De uitleg bij de probleemgebieden is er nog niet in het Engels. En sommige vacatures zijn dicht voordat wij het doorhebben.',
    'Niets hiervan is een reden om te wachten met zeggen wat je ervan vindt. Het tegendeel.',
  ],
  betaCta: 'Vertel ons wat er beter kan',
  betaShort:
    'Dit bord is nog in bèta. De reden die hieronder staat is ons oordeel — laat het ons weten als je vindt dat het niet klopt.',
  betaShortLink: 'Geef feedback',

  intlHeading: 'Kijk eerst buiten Nederland',
  intlBody: [
    'Als je je loopbaan echt inricht op zoveel goed mogelijk doen, liggen de sterkste kansen meestal niet in Nederland. De organisaties die het hardst aan deze problemen trekken zitten voor een groot deel in Londen, de Bay Area, Washington en Nairobi. Deze drie lijsten zijn daar beter in dan wij, en je zou ze eerst moeten bekijken.',
  ],
  intlBoardBlurbs: {
    '80k': 'De grootste vacaturelijst bij organisaties die aan deze problemen werken, met uitgebreide loopbaanadviezen erbij.',
    'probably-good':
      'Vacatures en loopbaanadvies, met meer aandacht voor mondiale gezondheid en dierenwelzijn.',
    'ea-opportunities':
      'Ook stages, beurzen, onderzoeksprogramma’s en kortere projecten — nuttig als je nog niet aan een vaste baan toe bent.',
  },
  intlFallback:
    'Verhuizen kan niet voor iedereen. Een partner met een baan hier, kinderen op school, een zorgtaak, een verblijfsvergunning — of je wilt simpelweg niet weg. Dat is een redelijke afweging en geen gebrek aan toewijding. Voor die situatie is dit bord gemaakt: de beste mogelijkheden die we in Nederland kunnen vinden. We zeggen het liever meteen dan dat je er later zelf achter komt.',
  intlShort:
    'Zit je niet vast aan Nederland? Kijk dan eerst bij 80,000 Hours, Probably Good en EA Opportunities — daar staan de sterkste kansen.',
  intlCompact:
    'Zit je niet vast aan Nederland? De sterkste kansen liggen meestal ergens anders. Kijk daar eerst:',
  intlLink: 'Waarom we dit zeggen',

  climateHeading: 'Waarom staat klimaat er niet bij?',
  climateBody: [
    'Niet omdat we klimaatverandering onbelangrijk vinden. Het staat er niet bij omdat het in Nederland niet verwaarloosd is: er gaat al veel geld, talent en politieke aandacht naartoe. Dat is goed nieuws. De problemen op dit bord hebben die aandacht niet, en dat is precies waarom we ze eruit lichten.',
    'Welk klimaatwerk dan wél ondergewaardeerd is, blijft een goede vraag — en een aparte. Effective Environmentalism stelt die vraag serieus en heeft er onderzoek en een gemeenschap omheen. Dat is een betere plek om te beginnen dan een handvol werkgevers hier zou zijn geweest.',
  ],
  climateReferralLink: 'Ga naar Effective Environmentalism',

  heroTitle: 'De banen in Nederland waarmee je het meeste goed doet',
  heroLead:
    'Een korte, met de hand samengestelde lijst, met bij elke vacature onze reden erbij.',

  e2gBandHeading: 'Of verdien goed, en geef weg wat je overhoudt',
  e2gBandBody:
    'Past het werk zelf niet bij je, of ben je er niet de sterkste kandidaat voor? Dan kun je nog steeds veel betekenen door een goed betaalde baan te nemen en een vast deel van je inkomen weg te geven. In Amsterdam zit een van de grootste handelscentra van Europa, dus die afweging is hier ongewoon concreet.',
  e2gBandCta: 'Lees waarom, en het argument ertegen',
  e2gBandRouted: 'Zo doen mensen dat:',
  e2gBandGwwc: 'Giving What We Can — de belofte om minstens 10% weg te geven',
  e2gBandFoundersPledge: 'Founders Pledge — voor oprichters die een deel van hun aandelen beloven',
  e2gBandProfitForGood: 'Profit for Good — bedrijven waarvan de winst naar goede doelen gaat',

  methodChecksHeading: 'Drie toetsen',
  methodChecksLead:
    'Een functie komt alleen op het bord als ze alle drie doorstaat. Onder elke vacature schrijven we hoe, zodat je zelf kunt oordelen.',
  methodChecks: [
    {
      title: 'Is het probleem urgent?',
      body: 'Het werk moet raken aan een van vijf problemen die wij ongewoon groot, oplosbaar en verwaarloosd vinden. De meeste goede doelen staan er niet bij. Niet omdat ze er niet toe doen, maar omdat één persoon meer toevoegt waar nog bijna niemand werkt.',
    },
    {
      title: 'Houdt de aanpak stand?',
      body: 'Binnen één probleem bereikt de ene aanpak veel meer dan de andere. Heeft een onafhankelijke evaluator of een EA-financier de organisatie al doorgelicht, dan volgen we dat. Anders is het oordeel van ons.',
    },
    {
      title: 'Verandert deze functie iets?',
      body: 'Sommige functies beschikken over meer dan hun eigen uren: ze sturen geld, schrijven regels voor een hele sector, of leveren onderzoek dat iedereen kan gebruiken. Andere zijn de weg naar de teams die dat doen. Algemene ondersteuning bij een goede organisatie is meestal niet genoeg.',
    },
  ],
  methodCausesLabel: 'De vijf problemen',
  methodKindsHeading: 'Vier soorten functies',
  methodKindsLead: 'Wat erdoor komt, valt in een van vier groepen. Elke groep staat hier om een andere reden.',
  methodWhyHeading: 'Waarom het probleem voorop staat',
  methodWhyBody: [
    'Problemen verschillen enorm: in hoeveel mensen of dieren ze raken, en in hoeveel geld en talent er al naartoe gaat. Eén paar handen extra voegt weinig toe aan een probleem waar duizenden aan werken, en veel aan een probleem waar bijna niemand naar kijkt. 80,000 Hours schat dat alleen al de keuze van probleem een verschil van meer dan honderd keer kan maken.',
    'Dat is geen oordeel over wat iemand belangrijk vindt. Het is een reden om goed na te denken over waar je je ene loopbaan inzet.',
  ],
  methodReadMore: 'Dit argument is van 80,000 Hours, niet van ons. Lees het daar volledig:',
  methodLinkProblems: 'De meest urgente problemen',
  methodLinkSolutions: 'Een aanpak kiezen',
  methodLinkLeverage: 'Hefboom',

  readProblemChoice: 'Waarom je keuze van probleem zoveel uitmaakt',
  readCareerGuide: 'De loopbaangids van 80,000 Hours',
  readCareerPlanning: 'Een loopbaanplan in het kort',
  browseCauseHeading: 'Kies op probleemgebied',
  browseCauseBody:
    'Vijf probleemgebieden die we volgen omdat ze groot, verwaarloosd en aan te pakken zijn. Kies een gebied, of ga meteen naar het onderwerp dat je zoekt.',
  browseSkillHeading: 'Kies op vaardigheid',
  browseSkillBody:
    'Als het je niet uitmaakt aan welk probleem je werkt, maar je wel weet waar je goed in bent.',
  browseSkillAside: 'Dezelfde indeling die Probably Good gebruikt.',
  browseLocationHeading: 'Kies op locatie',
  browseLocationBody: 'Waar je wilt werken: thuis, op locatie in Nederland of een mix van beide.',
  browseRoleCount: (n) => (n === 1 ? '1 vacature' : `${n} vacatures`),
  browseEmptyTile: 'Nu niets open',
  browseShowAll: (n) => `Bekijk alle ${n} vacatures`,
  backToBrowse: 'Alle probleemgebieden',
  filteredByCause: (label) => label,
  filteredBySubArea: (label) => label,
  filteredBySkill: (label) => `Vaardigheid: ${label.toLowerCase()}`,
  // The label as written: lowercasing would turn Nederland into nederland.
  filteredByLocation: (label) => label,

  feedbackTitle: 'Wat vind je van dit bord?',
  feedbackLead:
    'Het bord is nog in bèta en we bouwen het voor mensen zoals jij. Alles is welkom: een vacature die we missen, een oordeel waar je het niet mee eens bent, of gewoon iets dat niet werkt.',
  feedbackBody: [
    'Twee dingen helpen ons het meest. Het eerste is vacatures en organisaties die we niet kennen: van de eenendertig Nederlandse organisaties die we onlangs onderzochten, publiceerde er één een vacaturebestand dat we automatisch kunnen uitlezen. De rest zet vacatures op een gewone webpagina, vaak twee weken lang. Daar komen we alleen achter als iemand het ons vertelt.',
    'Het tweede is waar we het mis hebben. Een functie die er niet op hoort, een probleemgebied waar we blind voor zijn, een reden die niet klopt — dat horen we liever nu, terwijl het bord nog vormbaar is.',
    'Alles komt bij een mens terecht, niet direct op het bord. We beoordelen elke vacature zelf en schrijven er zelf bij waarom die er staat — dat is het enige wat dit bord de moeite waard maakt.',
  ],
  suggestKindLabel: 'Waar gaat het over?',
  feedbackKinds: {
    listing: {
      label: 'Een specifieke vacature',
      hint: 'Een functie die volgens jou op het bord hoort.',
    },
    employer: {
      label: 'Een organisatie om in de gaten te houden',
      hint: 'Een werkgever bij wie we vaker moeten kijken, ook als er nu niets openstaat.',
    },
    correction: {
      label: 'Er klopt iets niet',
      hint: 'Een vacature die er niet op hoort of al gesloten is, een reden die niet klopt, een verkeerd label, een rammelende vertaling.',
    },
    gap: {
      label: 'Er ontbreekt iets',
      hint: 'Een vakgebied, een soort werk of een groep mensen waar dit bord langsheen kijkt.',
    },
    site: {
      label: 'Over de site zelf',
      hint: 'Iets was onduidelijk, moeilijk te vinden of kapot.',
    },
    other: {
      label: 'Iets anders',
      hint: 'Een vraag, een bezwaar, of iets waar geen hokje voor is.',
    },
  },
  suggestUrlListing: 'Link naar de vacature',
  suggestUrlEmployer: 'Link naar de vacaturepagina van de organisatie',
  feedbackUrlOptional: 'Link (niet verplicht)',
  suggestOrgLabel: 'Welke organisatie?',
  feedbackOrgOptional: 'Welke organisatie? (niet verplicht)',
  suggestWhyLabel: 'Waarom hoort dit hier?',
  suggestWhyHint:
    'Niet verplicht, maar dit is het nuttigste veld. Wat zie jij aan deze functie dat wij van buitenaf missen?',
  feedbackMessageLabel: 'Wat wil je ons vertellen?',
  feedbackMessageHint:
    'Wees zo concreet als je kunt. Als het over een bepaalde pagina gaat, plak de link er dan bij.',
  suggestEmailLabel: 'Je e-mailadres',
  suggestEmailHint:
    'Niet verplicht. Alleen om een vraag te stellen als iets onduidelijk is. We gebruiken het nergens anders voor.',
  suggestSubmit: 'Verstuur',
  suggestSending: 'Bezig met versturen',
  suggestError: 'Er ging iets mis. Probeer het opnieuw, of mail ons.',
  suggestThanksHeading: 'Dank je wel',
  suggestThanksBody:
    'We hebben het binnen. Iemand kijkt ernaar. Je hoort alleen van ons als we een vraag hebben.',
  suggestNavLabel: 'Feedback',
  feedbackBandHeading: 'Wat vind je hiervan?',
  feedbackBandBody:
    'Het bord is nog in bèta, dus dit is precies het moment om te zeggen wat je ervan vindt. Een vacature die we missen, een oordeel dat je niet deelt, iets dat niet werkt — het helpt allemaal.',
  feedbackBandCta: 'Geef feedback',
  feedbackBandEmail: 'Of mail ons',

  indexTitle: 'Vacatures',
  indexIntroHeading: 'Wat staat hier?',
  indexIntroBody: [
    'Dit bord gaat over één vraag: hoe werk je vanuit Nederland aan de grootste en meest verwaarloosde problemen ter wereld? We houden vijf probleemgebieden bij en zoeken de Nederlandse functies die er echt iets aan veranderen.',
    'De meeste staan bij werkgevers die zelf niet zouden zeggen dat ze aan een groot wereldprobleem werken: een ministerie, een bank, een toezichthouder, een universiteit. Bij elke vacature schrijven we één of twee zinnen over waar de hefboom zit — waarom déze functie meer verandert dan het werk van één persoon.',
    'We houden de lijst kort. Vijfentwintig goede vacatures zijn meer waard dan tweehonderd middelmatige.',
  ],
  indexIntroDismiss: 'Verberg deze uitleg',
  indexIntroMethodLink: 'Zo kiezen we',
  resultCount: (n) => (n === 1 ? '1 vacature' : `${n} vacatures`),
  sortLabel: 'Sorteer op',
  sortRecent: 'Nieuwste eerst',
  sortLeverage: 'Grootste hefboom eerst',
  tierRecommendedHeading: 'De beste organisaties ter wereld in wat ze doen',
  tierRecommendedBody:
    'Hier gaat het om de oplossing zelf. Van deze organisaties zijn we er redelijk zeker van dat ze wereldwijd tot de besten behoren in hun vak — doorgelicht door GiveWell, Animal Charity Evaluators, Founders Pledge of The Life You Can Save, of uitgelicht door 80,000 Hours. Iemand anders heeft dus al beoordeeld dat wat deze organisatie doet werkt, en daarom staat hier elke functie die openstaat voor iemand in Nederland, ook ondersteunend of operationeel werk. Reken wel op stevige concurrentie, en op werk op afstand of verhuizen.',
  tierRecommendedCount: (n) => (n === 1 ? '1 vacature' : `${n} vacatures`),
  tierDutchHeading: 'Functies met een hefboom, hier in Nederland',
  tierDutchBody:
    'Hier gaat het om de hefboom. De meeste van deze werkgevers — ministeries, toezichthouders, universiteiten, banken — zouden zelf niet zeggen dat ze aan een van de grootste wereldproblemen werken, en niemand heeft ze als geheel doorgelicht. Wat we zoeken is iets anders: functies waarin je meer aan het probleem kunt richten dan je eigen uren. Dat kan geld zijn, of regels die voor een hele sector gelden, of het werk van tientallen anderen, of een idee dat daarna gratis te kopiëren is. Een kredietanalist bij een landbouwbank kan zo meer betekenen dan een medewerker bij een goed doel. Dat oordeel is van ons, per functie, en we schrijven er altijd bij waarom. De concurrentie is hier meestal een stuk minder hevig.',
  tierDutchLeverageLink: 'Wat we met hefboom bedoelen',
  tierDutchCount: (n) => (n === 1 ? '1 vacature' : `${n} vacatures`),
  tierRoutesHeading: 'Manieren om binnen te komen',
  tierRoutesBody:
    'Hier gaat het om waar het je brengt. Stages, traineeships en betaalde programma’s — fellowships, residencies, bootcamps — zijn zelden de plek waar je het meeste verandert, maar vaak de manier om terecht te komen in de teams waar dat wel gebeurt. Een stage bij de directie die de nationale AI-strategie schrijft, is hoe mensen die strategie later zelf schrijven. Sommige programma’s vinden in het buitenland plaats. Die nemen we op als ze betaald zijn en hooguit zes maanden duren, want dan hoef je er niet voor te verhuizen.',
  tierRoutesCount: (n) => (n === 1 ? '1 plek' : `${n} plekken`),
  bandLabels: {
    vetted: 'Bij doorgelichte organisaties',
    routes: 'Manieren om binnen te komen',
    dutch: 'Met een hefboom in Nederland',
  },
  bandBlurbs: {
    vetted:
      'Elke functie bij organisaties die een onafhankelijke evaluator of een EA-financier al heeft doorgelicht. Reken op stevige concurrentie, vaak op afstand.',
    routes:
      'Stages, traineeships en betaalde programma’s: de opstap naar de teams waar het werk aan deze problemen gebeurt.',
    dutch:
      'Functies bij ministeries, toezichthouders, banken en universiteiten waarin je meer aan een probleem kunt richten dan je eigen uren.',
  },
  e2gTileBlurb:
    'Goed betaalde functies bij Amsterdamse handelshuizen en techbedrijven, voor wie een vast deel van het inkomen wil weggeven.',
  browseBandHeading: 'Kies op soort vacature',
  browseBandBody: 'Vier soorten, die hier elk om een andere reden staan.',
  filterBand: 'Soort',
  programmeBadge: 'Programma',
  programmeWeeks: (n) => (n === 1 ? '1 week' : `${n} weken`),
  detailStipend: 'Stipendium',
  tierExpand: (n) => `Toon alle ${n} vacatures`,
  tierCollapse: 'Toon minder',
  tierJumpLabel: 'In deze lijst:',
  filtersHeading: 'Filter',
  clearFilters: 'Wis filters',
  emptyHeading: 'Geen vacatures met deze filters',
  emptyBody:
    'Dat gebeurt makkelijk op een bord van deze grootte. Probeer één filter losser te zetten.',
  emptySuggestion: 'Bekijk in plaats daarvan:',
  emptyClear: 'Wis alle filters',

  filterCause: 'Probleemgebied',
  filterLeverage: 'Soort hefboom',
  filterLocation: 'Werkplek',
  filterSkill: 'Vaardigheid',
  filterSubArea: 'Onderwerp',
  filterLanguage: 'Taaleis',
  filterSeniority: 'Niveau',
  filterAny: 'Alle',

  cardWhyPrefix: 'Waarom dit op het bord staat',
  detailFrame:
    'Deze functie staat op ons bord omdat we denken dat het een ongewoon effectieve manier is om een loopbaan te besteden.',
  detailFrameLink: 'Zo redeneren we',
  detailWhyCaveat: 'Dit bord is in bèta en dit is ons oordeel. Denk je dat we het mis hebben, laat het weten.',
  detailFactsHeading: 'In het kort',
  detailWhyHeading: 'Waarom staat dit op het bord',
  detailAboutHeading: 'Over de functie',
  detailEligibilityHeading: 'Voorwaarden',
  detailApply: 'Bekijk de vacature',
  detailApplyNote: 'Je gaat naar de website van de werkgever. Solliciteren doe je daar.',
  detailEmployerLink: (name) => `Meer over ${name}`,
  detailCauseLink: 'Waarom dit probleem',
  detailPostedAt: 'Geplaatst',
  detailDeadline: 'Sluit op',
  detailNoDeadline: 'Geen sluitingsdatum bekend',
  detailSalary: 'Salaris',
  detailSalaryUnknown: 'Niet vermeld',
  salaryPerMonth: 'per maand',
  salaryPerYear: 'per jaar',
  detailThirtyPercent: 'Vacature vermeldt de 30%-regeling',
  detailThirtyPercentNote:
    'De regeling gaat vanaf 2027 naar 27% en de voorwaarden veranderen regelmatig. Vraag een belastingadviseur wat het voor jou betekent — wij rekenen hier niets voor je uit.',

  labelLanguage: 'Taal',
  labelWorkAuth: 'Werkvergunning',
  labelScreening: 'Screening',
  labelLocation: 'Werkplek',
  labelSeniority: 'Niveau',
  screeningYes: 'VOG of veiligheidsonderzoek vereist',
  screeningNo: 'Niet vermeld',

  employerRolesHeading: 'Open functies',
  employerNoRoles: 'Op dit moment staan er geen vacatures van deze organisatie op het bord.',
  causeRolesHeading: 'Vacatures in dit gebied',
  causeNoRoles: 'Op dit moment geen open vacatures in dit gebied.',
  causeAllRoles: 'Alle vacatures',
  causeUncertainHeading: 'Wat we niet zeker weten',

  e2gTitle: 'Earning to give',
  e2gNotEndorsement:
    'Een werkgever op deze pagina zetten is geen aanbeveling van die werkgever. Sommige van deze bedrijven doen werk dat een deel van onze eigen gemeenschap netto schadelijk vindt. Dat is een echt meningsverschil en we zeggen het liever hardop dan dat we het wegpoetsen.',
  e2gCaseAgainstHeading: 'Wat hier tegen pleit',
  e2gOnwardHeading: 'Als je deze kant op gaat',
  e2gCompensation: 'Beloning',

  onwardHeading: 'Wil je eerst meer weten?',
  onwardBody:
    'Begin met onze gratis cursus van zo’n 100 minuten: zes korte delen, in je eigen tempo en zonder aanmelding (Engelstalig). Wil je daarna verder, meld je dan aan voor de EA Fellowship: vijf weken lezen en praten in een kleine groep. Ook gratis, maar selectief.',
  onwardCourse: 'Start de gratis cursus',
  onwardFellowship: 'Meld je aan voor de fellowship',

  languageSwitch: 'English',
  expiredHeading: 'Deze vacature is gesloten',
  expiredBody: 'De vacature staat niet meer open. Hieronder staat waar je verder kunt kijken.',
  updatedAt: 'Bijgewerkt',
  disagreeHeading: 'Oneens met iets op dit bord?',
  disagreeBody:
    'Dit bord wordt samengesteld door mensen die het mis kunnen hebben. Vind je dat een vacature er niet op hoort, mis je er een, of klopt er iets anders niet:',
  cookie: {
    title: 'Wij gebruiken cookies',
    description:
      "We gebruiken een paar cookies om deze site te laten werken. Met jouw toestemming gebruiken we ook analytische cookies om te zien welke pagina's mensen het meest helpen, en marketingcookies om onze campagnes te meten. Je kunt je keuze altijd aanpassen. (Met een ja help je ons anderen te helpen om anderen te helpen. Kosteneffectief, uiteraard.)",
    customise: 'Cookies kiezen',
    privacyLink: 'Lees ons privacybeleid',
    acceptAll: 'Alles accepteren',
    rejectAll: 'Alles weigeren',
    prefsTitle: 'Cookie-instellingen',
    prefsDescription:
      'Kies welke cookies je toestaat. Noodzakelijke cookies staan altijd aan, want zonder werkt de site niet.',
    alwaysOn: 'Altijd aan',
    save: 'Keuze opslaan',
    close: 'Sluiten',
    necessaryTitle: 'Noodzakelijk',
    necessaryDescription:
      'Houden de site veilig en onthouden je cookiekeuze. Hiermee volgen we je niet.',
    analyticsTitle: 'Analytisch',
    analyticsDescription:
      "Laten Google Analytics en Microsoft Clarity ons zien hoe mensen de site gebruiken, zoals welke pagina's ze bezoeken en hoe ze over een pagina bewegen, zodat we hem kunnen verbeteren.",
    marketingTitle: 'Marketing',
    marketingDescription:
      'Laten Google en Meta meten of onze advertenties, bijvoorbeeld voor de EA Fellowship, de juiste mensen bereiken.',
  },

  causeAreas: {
    'global-health-wellbeing': 'Mondiale gezondheid en welzijn',
    'farmed-animal-welfare': 'Dierenwelzijn in de veehouderij',
    'global-catastrophic-risks': 'Mondiale catastrofale risico’s',
    'better-futures': 'Betere toekomsten',
    'movement-building': 'De beweging opbouwen',
  },
  causeBlurbs: {
    'global-health-wellbeing':
      'Ziekte en armoede bij de armste mensen die nu leven — en het geld en beleid dat daarover gaat.',
    'farmed-animal-welfare':
      'Het lijden van dieren in de voedselproductie, en de eiwittransitie die dat kan beëindigen.',
    'global-catastrophic-risks':
      'Gebeurtenissen die een groot deel van de mensheid kunnen doden of haar vooruitzichten voorgoed kunnen beëindigen.',
    'better-futures':
      'Of de verre toekomst góéd gaat als de mensheid het overleeft: wie de macht heeft, en wiens waarden blijven gelden.',
    'movement-building':
      'Meer mensen die deze problemen serieus nemen, en meer geld dat effectief terechtkomt.',
  },
  subAreas: {
    'global-health': 'Mondiale gezondheid en infectieziekten',
    'development-finance': 'Ontwikkelingsfinanciering en hulpbeleid',
    'health-systems': 'Zorgstelsels in arme landen',
    'lead-and-air-quality': 'Lood en luchtkwaliteit',
    'mental-health': 'Psychische gezondheid op schaal',
    'animal-advocacy': 'Campagnes en belangenbehartiging',
    'animal-law': 'Dierenrecht en handhaving',
    'alternative-protein': 'Kweekvlees en plantaardige eiwitten',
    'protein-transition-policy': 'Beleid rond de eiwittransitie',
    'ai-safety': 'AI-veiligheid',
    biosecurity: 'Pandemieën en biosecurity',
    'nuclear-security': 'Nucleaire veiligheid',
    'ai-governance': 'AI-governance en macht',
    'democratic-institutions': 'Democratische instituties',
    'moral-circle': 'De morele cirkel',
    'space-governance': 'Ruimtebeleid',
    'effective-careers': 'Effectieve loopbanen',
    'community-building': 'Community building',
    'effective-giving': 'Effectief geven',
  },
  skills: {
    communications: 'Communicatie en outreach',
    data: 'Data',
    engineering: 'Techniek',
    finance: 'Financieel',
    'information-security': 'Informatiebeveiliging',
    legal: 'Juridisch',
    management: 'Management',
    operations: 'Operations',
    policy: 'Beleid',
    research: 'Onderzoek',
    'software-engineering': 'Software engineering',
  },
  leverage: {
    'capital-allocation': 'Geldstromen sturen',
    'policy-regulation': 'Beleid en toezicht',
    'research-evidence': 'Onderzoek en technologie',
    'field-building': 'Het veld opbouwen',
    'spreading-ideas': 'Ideeën verspreiden',
    'organisation-building': 'Organisaties bouwen',
    'supporting-a-multiplier': 'Iemand met bereik versterken',
    'direct-work': 'Direct werk',
    'career-capital': 'Loopbaankapitaal',
    'earning-to-give': 'Earning to give',
    'trusted-recommendation': 'Aanbevolen door een evaluator',
  },
  locationModes: {
    remote: 'Op afstand',
    'on-site-nl': 'Op locatie in Nederland',
    'nl-flexible': 'Nederlandse werkgever, flexibel',
  },
  languageRequirements: {
    'dutch-required': 'Nederlands vereist',
    'dutch-preferred': 'Nederlands gewenst',
    'english-sufficient': 'Engels is genoeg',
    unclear: 'Onduidelijk',
  },
  workAuthorisations: {
    'eu-citizens-or-existing-permit': 'EU-burgers of bestaande vergunning',
    'sponsorship-available': 'Sponsoring mogelijk',
    'dutch-nationality-required': 'Nederlandse nationaliteit vereist',
    unclear: 'Onduidelijk',
  },
  seniorities: {
    internship: 'Stage',
    entry: 'Startersfunctie',
    mid: 'Ervaren',
    senior: 'Senior',
    executive: 'Directie',
  },
}

const en: Strings = {
  boardName: 'Jobs',
  boardTagline:
    'How to work on the world’s largest and most neglected problems from the Netherlands',
  skipToContent: 'Skip to content',

  betaBadge: 'Beta',
  betaHeading: 'This board is still in beta',
  betaBody: [
    'We are showing it to the Dutch community while it is unfinished, because we would rather hear what is wrong with it now than in six months.',
    'What you will notice: the list is not complete — we follow dozens of Dutch organisations, but nowhere near all of them. The reason we write under each vacancy is our judgement, and it can simply be wrong. The problem-area explainers are not in English yet. And some vacancies close before we catch it.',
    'None of that is a reason to wait before telling us what you think. The opposite.',
  ],
  betaCta: 'Tell us what would make it better',
  betaShort:
    'This board is still in beta. The reason below is our judgement — tell us if you think we have it wrong.',
  betaShortLink: 'Give feedback',

  intlHeading: 'Look outside the Netherlands first',
  intlBody: [
    'If you are genuinely optimising your career for impact, the strongest opportunities are usually not in the Netherlands. Much of the work on these problems is concentrated in London, the Bay Area, Washington and Nairobi. These three boards cover it better than we do, and you should look at them first.',
  ],
  intlBoardBlurbs: {
    '80k': 'The largest list of roles at organisations working on these problems, with detailed career research alongside it.',
    'probably-good':
      'Roles and career advice, with more weight on global health and animal welfare.',
    'ea-opportunities':
      'Also internships, fellowships, research programmes and shorter projects — useful if a permanent job is not the right next step.',
  },
  intlFallback:
    'Not everyone can move. A partner with a job here, children in school, caring responsibilities, a residence permit — or you simply do not want to leave. That is a reasonable trade-off, not a lack of commitment. This board is built for that situation: the best options we can find in the Netherlands. We would rather say so up front than let you work it out later.',
  intlShort:
    'Free to leave the Netherlands? Look at 80,000 Hours, Probably Good and EA Opportunities first — the strongest opportunities are there.',
  intlCompact:
    'Free to leave the Netherlands? The strongest opportunities are usually elsewhere. Look there first:',
  intlLink: 'Why we say this',

  climateHeading: 'Why is climate not here?',
  climateBody: [
    'Not because we think climate change does not matter. It is not here because in the Netherlands it is not neglected: a great deal of money, talent and political attention already goes to it. That is good news. The problems on this board do not have that attention, which is exactly why we single them out.',
    'Which climate work is genuinely underrated remains a good question — and a separate one. Effective Environmentalism takes it seriously and has research and a community around it. That is a better place to start than a handful of employers here would have been.',
  ],
  climateReferralLink: 'Go to Effective Environmentalism',

  heroTitle: 'The most socially impactful jobs in the Netherlands',
  heroLead:
    'A short, hand-picked list, with our reason written down for every vacancy on it.',

  e2gBandHeading: 'Or earn well, and give away what you do not need',
  e2gBandBody:
    'If the work itself does not suit you, or you are not the strongest candidate for it, you can still do a great deal by taking a well-paid job and giving away a fixed share of your income. Amsterdam holds one of Europe’s largest trading hubs, so that trade-off is unusually concrete here.',
  e2gBandCta: 'Read why, and the case against',
  e2gBandRouted: 'How people actually do it:',
  e2gBandGwwc: 'Giving What We Can — the pledge to give at least 10%',
  e2gBandFoundersPledge: 'Founders Pledge — for founders committing a share of their equity',
  e2gBandProfitForGood: 'Profit for Good — companies whose profits go to charity',

  methodChecksHeading: 'Three checks',
  methodChecksLead:
    'A role gets onto the board only if it passes all three. Under every listing we write how it passed, so you can judge for yourself.',
  methodChecks: [
    {
      title: 'Is the problem pressing?',
      body: 'The work has to bear on one of five problems we think are unusually large, solvable and neglected. Most good causes are not on the list. Not because they do not matter, but because one more person adds more where almost nobody is working yet.',
    },
    {
      title: 'Does the approach hold up?',
      body: 'Within one problem, some approaches achieve far more than others. Where an independent evaluator or an EA funder has already vetted the organisation, we rely on that. Otherwise the judgement is ours.',
    },
    {
      title: 'Does this role move it?',
      body: 'Some roles command more than their own hours: they direct money, write rules a whole sector follows, or produce research anyone can use. Others are the way into the teams that do. Generic support at a good organisation is usually not enough.',
    },
  ],
  methodCausesLabel: 'The five problems',
  methodKindsHeading: 'Four kinds of role',
  methodKindsLead: 'What passes lands in one of four groups, each here for a different reason.',
  methodWhyHeading: 'Why the problem comes first',
  methodWhyBody: [
    'Problems differ enormously: in how many people or animals they affect, and in how much money and talent already goes to them. One more pair of hands adds little to a problem thousands work on, and a lot to one almost nobody is looking at. 80,000 Hours estimates that the choice of problem alone can make more than a hundredfold difference.',
    'That is not a verdict on what anyone cares about. It is a reason to think hard about where you put your one career.',
  ],
  methodReadMore: 'This argument is 80,000 Hours’, not ours. Read it in full:',
  methodLinkProblems: 'The most pressing problems',
  methodLinkSolutions: 'Choosing an approach',
  methodLinkLeverage: 'Leverage',

  readProblemChoice: 'Why your choice of problem matters so much',
  readCareerGuide: 'The 80,000 Hours career guide',
  readCareerPlanning: 'Career planning, in short',
  browseCauseHeading: 'Browse by problem area',
  browseCauseBody:
    'Five problem areas we track because they are large, neglected and tractable. Pick an area, or go straight to the topic you came for.',
  browseSkillHeading: 'Browse by skill',
  browseSkillBody:
    'For when the problem matters less to you than what you are good at.',
  browseSkillAside: 'The same categories Probably Good uses.',
  browseLocationHeading: 'Browse by location',
  browseLocationBody: 'Where you want to work: from home, on site in the Netherlands, or a mix of both.',
  browseRoleCount: (n) => (n === 1 ? '1 job' : `${n} jobs`),
  browseEmptyTile: 'Nothing open now',
  browseShowAll: (n) => `See all ${n} jobs`,
  backToBrowse: 'All problem areas',
  filteredByCause: (label) => label,
  filteredBySubArea: (label) => label,
  filteredBySkill: (label) => `Skill: ${label.toLowerCase()}`,
  filteredByLocation: (label) => label,

  feedbackTitle: 'What do you make of this board?',
  feedbackLead:
    'The board is in beta and we are building it for people like you. Anything is welcome: a vacancy we have missed, a judgement you disagree with, or simply something that does not work.',
  feedbackBody: [
    'Two things help us most. The first is vacancies and organisations we do not know about: of thirty-one Dutch organisations we recently checked, one published a job feed we can read automatically. The rest post vacancies as ordinary web pages, often for two weeks. We only find those if someone tells us.',
    'The second is where we have got it wrong. A role that does not belong, a problem area we are blind to, a reason that does not hold up — we would rather hear it now, while the board can still change shape.',
    'Everything goes to a person, not straight onto the board. We assess every vacancy ourselves and write our own reason for listing it — that is the only thing making this board worth reading.',
  ],
  suggestKindLabel: 'What is this about?',
  feedbackKinds: {
    listing: {
      label: 'A specific vacancy',
      hint: 'A role you think belongs on the board.',
    },
    employer: {
      label: 'An organisation to watch',
      hint: 'An employer we should check more often, even if nothing is open right now.',
    },
    correction: {
      label: 'Something here is wrong',
      hint: 'A role that does not belong or has already closed, a reason that does not hold up, a wrong label, a clumsy translation.',
    },
    gap: {
      label: 'Something is missing',
      hint: 'A field, a kind of work, or a group of people this board looks straight past.',
    },
    site: {
      label: 'About the site itself',
      hint: 'Something was unclear, hard to find, or broken.',
    },
    other: {
      label: 'Something else',
      hint: 'A question, an objection, or anything there is no box for.',
    },
  },
  suggestUrlListing: 'Link to the vacancy',
  suggestUrlEmployer: 'Link to the organisation’s careers page',
  feedbackUrlOptional: 'Link (optional)',
  suggestOrgLabel: 'Which organisation?',
  feedbackOrgOptional: 'Which organisation? (optional)',
  suggestWhyLabel: 'Why does it belong here?',
  suggestWhyHint:
    'Optional, but the most useful field. What do you see in this role that we would miss from outside?',
  feedbackMessageLabel: 'What would you like to tell us?',
  feedbackMessageHint:
    'Be as specific as you can. If it is about a particular page, paste the link in with it.',
  suggestEmailLabel: 'Your email address',
  suggestEmailHint:
    'Optional. Only so we can ask if something is unclear. We will not use it for anything else.',
  suggestSubmit: 'Send',
  suggestSending: 'Sending',
  suggestError: 'Something went wrong. Try again, or email us.',
  suggestThanksHeading: 'Thank you',
  suggestThanksBody:
    'We have it. Someone will look. You will only hear from us if we have a question.',
  suggestNavLabel: 'Feedback',
  feedbackBandHeading: 'What do you make of this?',
  feedbackBandBody:
    'The board is still in beta, so this is exactly the moment to say what you think. A vacancy we have missed, a judgement you do not share, something that does not work — all of it helps.',
  feedbackBandCta: 'Give feedback',
  feedbackBandEmail: 'Or email us',

  indexTitle: 'Jobs',
  indexIntroHeading: 'What is this?',
  indexIntroBody: [
    'This board is about one question: how do you work on the world’s largest and most neglected problems from the Netherlands? We track five problem areas and look for the Dutch roles that genuinely move them.',
    'Most are at employers who would not say they work on a big global problem: a ministry, a bank, a regulator, a university. For each one we write a sentence or two about where the leverage sits — why this particular role changes more than one person’s work.',
    'We keep the list short. Twenty-five good listings are worth more than two hundred mediocre ones.',
  ],
  indexIntroDismiss: 'Hide this',
  indexIntroMethodLink: 'How we choose',
  resultCount: (n) => (n === 1 ? '1 job' : `${n} jobs`),
  sortLabel: 'Sort by',
  sortRecent: 'Newest first',
  sortLeverage: 'Highest leverage first',
  tierRecommendedHeading: 'Among the best in the world at what they do',
  tierRecommendedBody:
    'This tier is about the solution itself. We are fairly confident these organisations are among the best in the world in their field — vetted by GiveWell, Animal Charity Evaluators, Founders Pledge or The Life You Can Save, or featured by 80,000 Hours. Somebody else has already judged that what they do works, so we list every role there that is open to someone in the Netherlands, including support and operations work. Expect fierce competition, and expect remote work or a move.',
  tierRecommendedCount: (n) => (n === 1 ? '1 role' : `${n} roles`),
  tierDutchHeading: 'Roles with leverage, here in the Netherlands',
  tierDutchBody:
    'This tier is about leverage. Most of these employers — ministries, regulators, universities, banks — would not say they work on one of the world’s largest problems, and nobody has vetted them as a whole. What we look for is different: roles that let you point more at the problem than your own hours. That might be money, or rules that bind a whole sector, or the work of dozens of other people, or an idea that is free to copy afterwards. A credit analyst at an agricultural lender can matter more than a programme officer at a charity. That judgement is ours, made role by role, and we always write down the reason. Competition here is usually a good deal lighter.',
  tierDutchLeverageLink: 'What we mean by leverage',
  tierDutchCount: (n) => (n === 1 ? '1 role' : `${n} roles`),
  tierRoutesHeading: 'Ways in',
  tierRoutesBody:
    'This band is about where it leads. Internships, traineeships and paid programmes — fellowships, residencies, bootcamps — are rarely where you change the most, but they are often how people get into the teams where that happens. An internship with the directorate writing the national AI strategy is how people end up writing it later. Some programmes are held abroad. We list those when they are paid and last six months or less, because then you do not have to move for them.',
  tierRoutesCount: (n) => (n === 1 ? '1 opening' : `${n} openings`),
  bandLabels: {
    vetted: 'At vetted organisations',
    routes: 'Ways in',
    dutch: 'With leverage in the Netherlands',
  },
  bandBlurbs: {
    vetted:
      'Every role at organisations an independent evaluator or an EA funder has already vetted. Expect fierce competition, often remote.',
    routes:
      'Internships, traineeships and paid programmes: the step into the teams doing the work on these problems.',
    dutch:
      'Roles at ministries, regulators, banks and universities that let you point more at a problem than your own hours.',
  },
  e2gTileBlurb:
    'Well-paid roles at Amsterdam trading firms and tech companies, for people who want to give a fixed share of their income away.',
  browseBandHeading: 'Browse by kind of role',
  browseBandBody: 'Four kinds, each here for a different reason.',
  filterBand: 'Kind',
  programmeBadge: 'Programme',
  programmeWeeks: (n) => (n === 1 ? '1 week' : `${n} weeks`),
  detailStipend: 'Stipend',
  tierExpand: (n) => `Show all ${n} roles`,
  tierCollapse: 'Show fewer',
  tierJumpLabel: 'In this list:',
  filtersHeading: 'Filter',
  clearFilters: 'Clear filters',
  emptyHeading: 'No jobs match these filters',
  emptyBody: 'That happens easily on a board this size. Try loosening one filter.',
  emptySuggestion: 'Look at these instead:',
  emptyClear: 'Clear all filters',

  filterCause: 'Problem area',
  filterLeverage: 'Kind of leverage',
  filterLocation: 'Where you work',
  filterSkill: 'Skill',
  filterSubArea: 'Topic',
  filterLanguage: 'Language',
  filterSeniority: 'Level',
  filterAny: 'All',

  cardWhyPrefix: 'Why this is on the board',
  detailFrame:
    'This role is on our board because we think it is an unusually effective way to spend a career.',
  detailFrameLink: 'How we reason about it',
  detailWhyCaveat: 'This board is in beta and this is our judgement. If you think we have it wrong, tell us.',
  detailFactsHeading: 'At a glance',
  detailWhyHeading: 'Why this is on the board',
  detailAboutHeading: 'About the role',
  detailEligibilityHeading: 'Requirements',
  detailApply: 'View the job',
  detailApplyNote: 'This takes you to the employer’s own site, where you apply.',
  detailEmployerLink: (name) => `More about ${name}`,
  detailCauseLink: 'Why this problem',
  detailPostedAt: 'Posted',
  detailDeadline: 'Closes',
  detailNoDeadline: 'No closing date given',
  detailSalary: 'Salary',
  detailSalaryUnknown: 'Not stated',
  salaryPerMonth: 'per month',
  salaryPerYear: 'per year',
  detailThirtyPercent: 'This listing mentions the 30% ruling',
  detailThirtyPercentNote:
    'It drops to 27% from 2027 and the conditions change regularly. Ask a tax adviser what it means for you — we do not calculate anything here.',

  labelLanguage: 'Language',
  labelWorkAuth: 'Work authorisation',
  labelScreening: 'Screening',
  labelLocation: 'Where you work',
  labelSeniority: 'Level',
  screeningYes: 'Certificate of conduct or security screening required',
  screeningNo: 'Not mentioned',

  employerRolesHeading: 'Open roles',
  employerNoRoles: 'No roles from this organisation are on the board right now.',
  causeRolesHeading: 'Jobs in this area',
  causeNoRoles: 'No open jobs in this area right now.',
  causeAllRoles: 'All jobs',
  causeUncertainHeading: 'What we are not sure about',

  e2gTitle: 'Earning to give',
  e2gNotEndorsement:
    'Listing an employer on this page is not an endorsement of that employer. Some of these firms do work that parts of our own community consider net-negative. That is a real disagreement, and we would rather say so than smooth it over.',
  e2gCaseAgainstHeading: 'The case against',
  e2gOnwardHeading: 'If you go this way',
  e2gCompensation: 'Pay',

  onwardHeading: 'Want to understand this first?',
  onwardBody:
    'Start with our free course: about 100 minutes in six short units, at your own pace, with no sign-up. To go further, apply for the EA Fellowship: five weeks of reading and discussion in a small group. Also free, but selective.',
  onwardCourse: 'Start the free course',
  onwardFellowship: 'Apply for the fellowship',

  languageSwitch: 'Nederlands',
  expiredHeading: 'This job has closed',
  expiredBody: 'The role is no longer open. Below is where to look next.',
  updatedAt: 'Updated',
  disagreeHeading: 'Disagree with something here?',
  disagreeBody:
    'This board is curated by people who can be wrong. If you think a listing does not belong, if we are missing one, or if something else is off:',
  cookie: {
    title: 'We use cookies',
    description:
      'We use a few cookies to keep this site working. With your permission we also use analytics cookies to see which pages help people most, and marketing cookies to measure our campaigns. You can change your mind at any time. (Saying yes helps us help others help others. Cost-effectively, of course.)',
    customise: 'Choose cookies',
    privacyLink: 'Read our privacy policy',
    acceptAll: 'Accept all',
    rejectAll: 'Reject all',
    prefsTitle: 'Cookie settings',
    prefsDescription:
      "Choose which cookies you allow. Necessary cookies are always on because the site can't work without them.",
    alwaysOn: 'Always on',
    save: 'Save choices',
    close: 'Close',
    necessaryTitle: 'Necessary',
    necessaryDescription:
      "Keep the site secure and remember your cookie choice. These don't track you.",
    analyticsTitle: 'Analytics',
    analyticsDescription:
      'Let Google Analytics and Microsoft Clarity show us how people use the site, such as which pages they visit and how they move around a page, so we can improve it.',
    marketingTitle: 'Marketing',
    marketingDescription:
      'Let Google and Meta measure whether our ads, such as for the EA Fellowship, reach the right people.',
  },

  causeAreas: {
    'global-health-wellbeing': 'Global health and wellbeing',
    'farmed-animal-welfare': 'Farmed animal welfare',
    'global-catastrophic-risks': 'Global catastrophic risks',
    'better-futures': 'Better futures',
    'movement-building': 'Building the movement',
  },
  causeBlurbs: {
    'global-health-wellbeing':
      'Disease and poverty among the poorest people alive today — and the money and policy that move it.',
    'farmed-animal-welfare':
      'The suffering of animals in food production, and the protein transition that could end it.',
    'global-catastrophic-risks':
      'Events that could kill a very large share of humanity or permanently end its prospects.',
    'better-futures':
      'Whether the long-run future goes well if humanity survives: who holds power, and whose values last.',
    'movement-building':
      'More people taking these problems seriously, and more money reaching the things that work.',
  },
  subAreas: {
    'global-health': 'Global health and infectious disease',
    'development-finance': 'Development finance and aid policy',
    'health-systems': 'Health systems in poor countries',
    'lead-and-air-quality': 'Lead exposure and air quality',
    'mental-health': 'Mental health at scale',
    'animal-advocacy': 'Campaigns and advocacy',
    'animal-law': 'Animal law and enforcement',
    'alternative-protein': 'Cultivated meat and plant-based protein',
    'protein-transition-policy': 'Protein transition policy',
    'ai-safety': 'AI safety',
    biosecurity: 'Pandemics and biosecurity',
    'nuclear-security': 'Nuclear security',
    'ai-governance': 'AI governance and power',
    'democratic-institutions': 'Democratic institutions',
    'moral-circle': 'The moral circle',
    'space-governance': 'Space governance',
    'effective-careers': 'Effective careers',
    'community-building': 'Community building',
    'effective-giving': 'Effective giving',
  },
  skills: {
    communications: 'Communications and outreach',
    data: 'Data',
    engineering: 'Engineering',
    finance: 'Finance',
    'information-security': 'Information security',
    legal: 'Legal',
    management: 'Management',
    operations: 'Operations',
    policy: 'Policy',
    research: 'Research',
    'software-engineering': 'Software engineering',
  },
  leverage: {
    'capital-allocation': 'Directing money',
    'policy-regulation': 'Policy and regulation',
    'research-evidence': 'Research and technology',
    'field-building': 'Building the field',
    'spreading-ideas': 'Spreading ideas',
    'organisation-building': 'Building organisations',
    'supporting-a-multiplier': 'Amplifying someone with reach',
    'direct-work': 'Direct work',
    'career-capital': 'Career capital',
    'earning-to-give': 'Earning to give',
    'trusted-recommendation': 'Recommended by an evaluator',
  },
  locationModes: {
    remote: 'Remote',
    'on-site-nl': 'On site in the Netherlands',
    'nl-flexible': 'Dutch employer, flexible',
  },
  languageRequirements: {
    'dutch-required': 'Dutch required',
    'dutch-preferred': 'Dutch preferred',
    'english-sufficient': 'English is enough',
    unclear: 'Unclear',
  },
  workAuthorisations: {
    'eu-citizens-or-existing-permit': 'EU citizens or existing permit',
    'sponsorship-available': 'Sponsorship available',
    'dutch-nationality-required': 'Dutch nationality required',
    unclear: 'Unclear',
  },
  seniorities: {
    internship: 'Internship',
    entry: 'Entry level',
    mid: 'Mid level',
    senior: 'Senior',
    executive: 'Executive',
  },
}

const STRINGS: Record<Locale, Strings> = { nl, en }

export function t(locale: Locale): Strings {
  return STRINGS[locale]
}

export function routes(locale: Locale) {
  return ROUTES[locale]
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'nl' ? 'en' : 'nl'
}

/** Filter definitions, so the index page and the URL parser agree. */
export const FILTER_FIELDS = {
  cause: CAUSE_AREAS,
  leverage: LEVERAGE_TYPES,
  location: LOCATION_MODES,
  language: LANGUAGE_REQUIREMENTS,
  seniority: SENIORITIES,
} as const

export type FilterField = keyof typeof FILTER_FIELDS

export const WORK_AUTH_VALUES = WORK_AUTHORISATIONS
