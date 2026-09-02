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
  introCourse: 'https://effectiefaltruisme.nl/introductiecursus',
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
  /**
   * The reasoning behind the board's claim, in plain language.
   *
   * Deliberately never names the framework it is built on. A reader who has
   * never heard of any of this should be able to follow every sentence, and a
   * reader who has should recognise it without being told — importance,
   * neglectedness and tractability in the first block, leverage in the second,
   * counterfactual impact in the third.
   */
  /**
   * The reasoning, in one line under the hero.
   *
   * Says "leverage" — "hefboom" in Dutch — rather than talking around it. The
   * house rule bans *unexplained* jargon, not vocabulary: hefboom is defined in
   * EA NL's own glossary, the method page is structured on it, and the index's
   * own tier heading already reads "Functies met een hefboom". Avoiding the
   * word here while using it two screens down was inconsistent, and the
   * paraphrase was longer and vaguer than the term it replaced.
   *
   * The long-form argument still lives on the method page; this links there.
   */
  heroWhy: string
  heroWhyLink: string
  heroWhatIsImpact: string

  // Earning to give, promoted to its own band on the index (August 2026)
  e2gBandHeading: string
  e2gBandBody: string
  e2gBandCta: string
  e2gBandRouted: string
  e2gBandGwwc: string
  e2gBandFoundersPledge: string
  e2gBandProfitForGood: string

  /*
    The method page's argument, in three movements before leverage
    (September 2026).

    The page used to open with operational detail — here are our four
    questions, here are our five areas — which answers "what do you do" without
    ever answering "why should choosing a problem be the thing you agonise
    over". A reader who does not already hold that premise has no reason to
    care about the rest of the page.

    So the arc is now: why the problem you pick dominates your impact → which
    problems we therefore picked → why the solution within a problem matters
    nearly as much → and only then how a particular job contributes. Each
    movement sets up the next, and the fourth is the leverage block below.

    In i18n rather than in the generated Sanity prose for two reasons. The
    English method page has no Sanity body at all, so anything written there is
    Dutch-only; and this argument is the spine the taxonomy is built on, so it
    should be versioned in the repo next to the taxonomy rather than
    regenerable prose.

    Built on 80,000 Hours' framework and cited. Their material may NOT be
    reproduced — see ./sources — so this is our argument in our sentences, with
    their figures attributed to them and their articles linked. The Dutch
    detail is the part they could not have written.
  */
  problemChoiceHeading: string
  problemChoiceLead: string
  problemChoiceBody: string[]
  problemChoiceSourceNote: string
  problemChoiceLink: string

  pressingHeading: string
  pressingLead: string
  pressingOutro: string

  solutionsHeading: string
  solutionsLead: string
  solutionsBody: string[]
  solutionsTests: { label: string; example: string }[]
  solutionsSourceNote: string
  solutionsLink: string

  /*
    The leverage section on the method page (September 2026).

    The board's second tier rests entirely on this word, and until now the site
    used it — in the hero, in the tier heading, on the fourth ITN card — without
    ever explaining it. A reader who does not hold the concept cannot tell why a
    bank is on an effective-altruism job board, and will reasonably conclude we
    are padding the list.

    The mechanisms mirror `LEVERAGE_TYPES` in ../taxonomy one-for-one, minus the
    three that are not mechanisms (direct work, career capital, and the
    provenance label). That correspondence is the point: the thing we explain to
    readers and the thing the classifier scores are now the same list, so the
    page cannot drift from the judgement it describes.

    Written from 80,000 Hours' framework and cited as such. Their material may
    NOT be reproduced — see ./sources — so every sentence here is ours, and the
    Dutch examples are the part they could not have written.
  */
  leverageHeading: string
  leverageLead: string
  leverageBody: string[]
  leverageMechanisms: { label: string; example: string }[]
  leverageCaveatHeading: string
  leverageCaveats: string[]
  leverageSourceNote: string
  leverageSourceLink: string

  // Contextual further reading
  readProblemChoice: string
  readCareerGuide: string
  readCareerPlanning: string
  heroStat: (n: number, newest: string) => string
  heroBrowseCta: string
  browseCauseHeading: string
  browseCauseBody: string
  browseSkillHeading: string
  browseSkillBody: string
  browseSkillAside: string
  browseRoleCount: (n: number) => string
  browseEmptyTile: string
  browseShowAll: (n: number) => string
  backToBrowse: string
  filteredByCause: (label: string) => string
  filteredBySubArea: (label: string) => string
  filteredBySkill: (label: string) => string

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
  tierExpand: (n: number) => string
  tierCollapse: string
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
  onwardNewsletter: string

  // Footer / misc
  languageSwitch: string
  expiredHeading: string
  expiredBody: string
  updatedAt: string
  disagreeHeading: string
  disagreeBody: string
  /** One line under the brand lockup in the footer, as on the website. */
  footerSlogan: string

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
  heroWhy:
    'Functies met een echte hefboom op problemen die groot zijn, weinig aandacht krijgen en op te lossen zijn. Werk waarin je meer verandert dan het werk van één persoon — en waarbij het uitmaakt dat jij het doet, en niet iemand die er toch al zat.',
  heroWhyLink: 'Zo redeneren we',
  heroWhatIsImpact: 'Wat telt als goed doen?',

  e2gBandHeading: 'Of verdien goed, en geef weg wat je overhoudt',
  e2gBandBody:
    'Past het werk zelf niet bij je, of ben je er niet de sterkste kandidaat voor? Dan kun je nog steeds veel betekenen door een goed betaalde baan te nemen en een vast deel van je inkomen weg te geven. In Amsterdam zit een van de grootste handelscentra van Europa, dus die afweging is hier ongewoon concreet.',
  e2gBandCta: 'Lees waarom, en het argument ertegen',
  e2gBandRouted: 'Zo doen mensen dat:',
  e2gBandGwwc: 'Giving What We Can — de belofte om minstens 10% weg te geven',
  e2gBandFoundersPledge: 'Founders Pledge — voor oprichters die een deel van hun aandelen beloven',
  e2gBandProfitForGood: 'Profit for Good — bedrijven waarvan de winst naar goede doelen gaat',

  problemChoiceHeading: 'Wat je kiest om aan te werken telt zwaarder dan bijna al het andere',
  problemChoiceLead:
    'Het gangbare advies is: doe waar je hart ligt. Wij denken dat de vraag daarvóór meer uitmaakt.',
  problemChoiceBody: [
    'Stel, je wilt dat je werk ergens toe doet. Klimaat, onderwijs, pandemieën, armoede — waar begin je? Meestal krijg je te horen dat je die dingen niet tegen elkaar kunt afwegen, en dat je dus het beste kunt kiezen wat je na aan het hart ligt. Dat is goed bedoeld advies, en het laat de belangrijkste vraag onbeantwoord.',
    'Want problemen verschillen enorm van elkaar. Niet een beetje: in hoeveel mensen of dieren ze raken, in hoe zwaar dat weegt, en in hoeveel geld en talent er al naartoe gaat. Aan een probleem waar duizenden mensen aan werken voegt één paar handen minder toe dan aan een probleem waar bijna niemand naar kijkt. 80,000 Hours komt op grond daarvan tot de schatting dat je met een andere keuze van probleem meer dan honderd keer zoveel kunt betekenen.',
    'Dat is geen oordeel over wat mensen belangrijk vinden. We zouden willen dat élk van deze problemen veel meer aandacht kreeg. Maar je hebt één loopbaan, en het beste wat je als individu kunt doen is kijken waar de grootste gaten vallen in wat er al gebeurt — en daar gaan staan.',
    'Het is ook minder ingrijpend dan het klinkt. Je hoeft er niet per se een carrièreswitch voor te maken: geven, politieke betrokkenheid en anderen meenemen tellen ook mee. En binnen je eigen werk is er vaak meer speelruimte dan je denkt. Wie bij de Rijksoverheid werkt kan doorgaans van dossier wisselen, en dat is hier eerder regel dan uitzondering; wie in de media werkt kiest voor een deel zelf waar het over gaat. Zo’n verschuiving verdient wel echte aandacht — beduidend meer dan ze meestal krijgt.',
  ],
  problemChoiceSourceNote:
    'Dit argument is niet van ons. 80,000 Hours heeft het uitgewerkt en onderbouwd met cijfers die wij hier niet overdoen.',
  problemChoiceLink: 'Lees hun uitleg over de meest urgente problemen',

  pressingHeading: 'Welke problemen wij dan het meest urgent vinden',
  pressingLead:
    'Vijf, en de keuze is aanvechtbaar. Dit is waar we op uitkomen als we de drie vragen hierboven serieus nemen.',
  pressingOutro:
    'Klimaat staat er niet bij, en dat heeft een aparte reden die verderop staat. Verder geldt: dit is ons oordeel en geen vaststaand feit. Vind je dat we er een missen, dan horen we dat graag — daar is dit bord nog jong genoeg voor.',

  solutionsHeading: 'Binnen een probleem verschilt de ene aanpak enorm van de andere',
  solutionsLead:
    'Het juiste probleem kiezen is de halve vraag. De andere helft is wat je eraan doet.',
  solutionsBody: [
    'Twee organisaties kunnen aan hetzelfde probleem werken en er totaal verschillend resultaat mee halen. Dat verschil is zelden klein. In de mondiale gezondheidszorg, het gebied waar hier het meest aan gemeten is, lopen de kosten om één gezond levensjaar te winnen ver uiteen tussen aanpakken die op papier allemaal even redelijk klinken.',
    'Daarom kijken we niet alleen naar het probleem waar een organisatie aan werkt, maar ook naar wát ze doet. Dat oordeel is moeilijker dan het klinkt, en het is precies de reden dat dit bord twee soorten vacatures uit elkaar houdt: bij de ene groep heeft een onafhankelijke beoordelaar het werk al doorgelicht, bij de andere is het ons eigen oordeel per functie.',
  ],
  solutionsTests: [
    {
      label: 'Werkt het aantoonbaar?',
      example: 'Is er onderzoek dat laat zien dat deze aanpak doet wat hij belooft, of is er vooral een goed verhaal?',
    },
    {
      label: 'Kan het groter?',
      example: 'Iets dat bij duizend mensen werkt en bij een miljoen vastloopt, is een ander soort oplossing.',
    },
    {
      label: 'Doet iemand anders het al?',
      example: 'Binnen één probleemgebied kan de ene aanpak overvol zitten terwijl er naast de andere bijna niemand staat.',
    },
    {
      label: 'Zit het op een knelpunt?',
      example: 'Het onderdeel waar de rest op wacht is meer waard dan het onderdeel waar er al vijf van zijn.',
    },
  ],
  solutionsSourceNote:
    'Ook dit is werk van 80,000 Hours. Zij gaan er dieper op in dan wij hier kunnen, met voorbeelden per probleemgebied.',
  solutionsLink: 'Lees hun stuk over het kiezen van een aanpak',

  leverageHeading: 'Wat we met een hefboom bedoelen',
  leverageLead:
    'Eén woord doet op dit bord het meeste werk, dus het is eerlijk om het uit te leggen.',
  leverageBody: [
    'Een hefboom is simpelweg: hoeveel kun je op het probleem richten, behalve je eigen uren? Bij de meeste banen is het antwoord "niets" — je doet je werk, dat werk is het resultaat, en dat is geen kritiek. Maar sommige functies beschikken over veel meer dan hun eigen tijd. Ze beslissen waar geld naartoe gaat. Ze schrijven regels waar een hele sector zich aan houdt. Ze bepalen wat tientallen anderen gaan doen. Of ze leveren een inzicht dat daarna gratis te kopiëren is.',
    'Daarom staan er werkgevers op dit bord die zelf nooit zouden zeggen dat ze aan een wereldprobleem werken. Een investment officer bij een ontwikkelingsbank verplaatst per beslissing meer geld naar arme landen dan de meeste mensen in een loopbaan verdienen. Een beleidsmedewerker bij een toezichthouder schrijft de norm waar duizenden bedrijven zich naar voegen. Geen van beiden werkt bij een goed doel; beiden hebben een grotere hefboom dan de meeste mensen die dat wel doen.',
    'Het omgekeerde geldt ook, en dat is het lastige deel: een functie bij een uitstekende organisatie kan een kleine hefboom hebben. Generieke IT of kantoorondersteuning bij een ministerie dat precies het juiste doet, verandert niet wat dat ministerie besluit. Nuttig zijn voor een team met een hefboom is niet hetzelfde als er zelf een hebben. Dat is precies het onderscheid dat we per vacature proberen te maken.',
  ],
  leverageMechanisms: [
    {
      label: 'Geldstromen sturen',
      example: 'Een investment officer bij FMO, een programma-officer bij een vermogensfonds, een kredietanalist bij een landbouwbank.',
    },
    {
      label: 'Regels en toezicht',
      example: 'Een beleidsmedewerker op een ministerie, een toezichthouder bij de ACM of de AFM, iemand die een norm opstelt.',
    },
    {
      label: 'Onderzoek en technologie',
      example: 'Een onderzoeker aan een universiteit of kennisinstituut. Een vondst kost bijna niets om te kopiëren en verdwijnt niet meer.',
    },
    {
      label: 'Het veld opbouwen',
      example: 'Mensen vinden en naar het werk toe leiden. Iemand met een betere match voor een functie vinden dan jij bent, is zelf een manier om die functie te doen.',
    },
    {
      label: 'Ideeën verspreiden',
      example: 'Journalistiek, documentaire, publieke communicatie, campagnes. Bereikt meer mensen per uur dan welk gesprek dan ook.',
    },
    {
      label: 'Organisaties bouwen',
      example: 'Oprichten, leiden, of de operatie laten werken — zodat honderd mensen samen meer voor elkaar krijgen dan apart.',
    },
    {
      label: 'Iemand met bereik versterken',
      example: 'Chief of staff of rechterhand van iemand wiens eigen werk veel verandert. De hefboom is geleend, maar wel echt.',
    },
    {
      label: 'Goed verdienen en weggeven',
      example: 'Een baan die je vaardigheden gebruikt en waarmee je het werk van anderen kunt financieren. Dit bord heeft er een eigen pagina voor.',
    },
  ],
  leverageCaveatHeading: 'Twee dingen die een hefboom níet is',
  leverageCaveats: [
    'Het is geen garantie dat het werkt. Een enorme hefboom gericht op een zwakke oplossing levert nog steeds weinig op. Daarom kijken we er niet alleen naar: de eerste vraag blijft of het probleem groot en verwaarloosd is, en of deze aanpak er iets aan verandert.',
    'Het zegt niets over of het bij jóu past. We beoordelen de functie zoals die voor een geschikte kandidaat zou zijn, niet voor jou specifiek. Of jij hier goed in zou zijn en het jaren zou willen doen, is een vraag die wij niet voor je kunnen beantwoorden — en die vaak zwaarder weegt dan alles wat wij hier opschrijven.',
  ],
  leverageSourceNote:
    'Dit idee is niet van ons. 80,000 Hours heeft het uitgewerkt en er veel meer over geschreven dan hier past, met voorbeelden uit loopbanen die wij niet hebben. Als één stuk op deze pagina de moeite waard is om zelf te lezen, is het dat.',
  leverageSourceLink: 'Lees het artikel van 80,000 Hours over hefbomen',

  readProblemChoice: 'Waarom je keuze van probleem zoveel uitmaakt',
  readCareerGuide: 'De loopbaangids van 80,000 Hours',
  readCareerPlanning: 'Een loopbaanplan in het kort',
  heroStat: (n, newest) =>
    `${n === 1 ? '1 vacature' : `${n} vacatures`} · nieuwste van ${newest}`,
  heroBrowseCta: 'Kies een probleemgebied',
  browseCauseHeading: 'Waar wil je aan werken?',
  browseCauseBody:
    'Vijf probleemgebieden die we volgen omdat ze groot, verwaarloosd en aan te pakken zijn. Kies een gebied, of ga meteen naar het onderwerp dat je zoekt.',
  browseSkillHeading: 'Geen voorkeur? Kies op vaardigheid',
  browseSkillBody:
    'Als het je niet uitmaakt aan welk probleem je werkt, maar je wel weet waar je goed in bent.',
  browseSkillAside: 'Dezelfde indeling die Probably Good gebruikt.',
  browseRoleCount: (n) => (n === 1 ? '1 vacature' : `${n} vacatures`),
  browseEmptyTile: 'Nu niets open',
  browseShowAll: (n) => `Bekijk alle ${n} vacatures`,
  backToBrowse: 'Alle probleemgebieden',
  filteredByCause: (label) => label,
  filteredBySubArea: (label) => label,
  filteredBySkill: (label) => `Vaardigheid: ${label.toLowerCase()}`,

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
  tierExpand: (n) => `Toon alle ${n} vacatures`,
  tierCollapse: 'Toon minder',
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

  onwardHeading: 'Nieuwsgierig geworden?',
  onwardBody:
    'Als je wilt weten hoe we tot deze lijst komen, hebben we een korte introductiecursus en een nieuwsbrief. Geen van beide kost je iets.',
  onwardCourse: 'Bekijk de introductiecursus',
  onwardNewsletter: 'Meld je aan voor de nieuwsbrief',

  languageSwitch: 'English',
  expiredHeading: 'Deze vacature is gesloten',
  expiredBody: 'De vacature staat niet meer open. Hieronder staat waar je verder kunt kijken.',
  updatedAt: 'Bijgewerkt',
  disagreeHeading: 'Oneens met iets op dit bord?',
  disagreeBody:
    'Dit bord wordt samengesteld door mensen die het mis kunnen hebben. Vind je dat een vacature er niet op hoort, mis je er een, of klopt er iets anders niet:',
  footerSlogan: 'Samen beter doen.',

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
  heroWhy:
    'Roles with real leverage on problems that are large, neglected and actually solvable. Work where what you do changes more than one person’s work — and where it matters that you take it, rather than someone who would have been there anyway.',
  heroWhyLink: 'How we reason',
  heroWhatIsImpact: 'What counts as doing good?',

  e2gBandHeading: 'Or earn well, and give away what you do not need',
  e2gBandBody:
    'If the work itself does not suit you, or you are not the strongest candidate for it, you can still do a great deal by taking a well-paid job and giving away a fixed share of your income. Amsterdam holds one of Europe’s largest trading hubs, so that trade-off is unusually concrete here.',
  e2gBandCta: 'Read why, and the case against',
  e2gBandRouted: 'How people actually do it:',
  e2gBandGwwc: 'Giving What We Can — the pledge to give at least 10%',
  e2gBandFoundersPledge: 'Founders Pledge — for founders committing a share of their equity',
  e2gBandProfitForGood: 'Profit for Good — companies whose profits go to charity',

  problemChoiceHeading: 'What you choose to work on matters more than almost anything else',
  problemChoiceLead:
    'The usual advice is to follow what you care about. We think the question before that one matters more.',
  problemChoiceBody: [
    'Say you want your work to count for something. Climate, education, pandemics, poverty — where do you start? Most people are told these things cannot be weighed against each other, and that they should therefore pick whatever they feel most strongly about. It is well-meant advice, and it leaves the most important question unanswered.',
    'Because problems differ enormously. Not slightly: in how many people or animals they affect, in how heavily that weighs, and in how much money and talent already goes to them. One more pair of hands adds less to a problem thousands of people work on than to one almost nobody is looking at. On that basis 80,000 Hours estimates that choosing a different problem could let you achieve over a hundred times as much.',
    'That is not a verdict on what anyone cares about. We would like every one of these problems to get far more attention than it does. But you have one career, and the best a single person can do is find the largest gaps in what is already happening, and go and stand in one.',
    'It is also less drastic than it sounds. It need not mean changing career: giving, political engagement and bringing others with you all count. And there is usually more room inside your current job than you would think. People in the Dutch civil service can typically move between policy files, and here that is the rule rather than the exception; people in the media choose part of what they cover. A shift like that does deserve real thought — considerably more than it usually gets.',
  ],
  problemChoiceSourceNote:
    'This argument is not ours. 80,000 Hours worked it out and backed it with figures we are not going to reproduce here.',
  problemChoiceLink: 'Read their case on the most pressing problems',

  pressingHeading: 'Which problems we think are most pressing',
  pressingLead:
    'Five, and the choice is arguable. This is where we land when we take the three questions above seriously.',
  pressingOutro:
    'Climate is not among them, for a separate reason set out further down. Beyond that: this is our judgement, not a settled fact. If you think we are missing one, we would like to hear it — the board is still young enough for that to change things.',

  solutionsHeading: 'Within a problem, one approach can beat another by a wide margin',
  solutionsLead:
    'Choosing the right problem is half the question. The other half is what you actually do about it.',
  solutionsBody: [
    'Two organisations can work on the same problem and get very different results from it. That gap is rarely small. In global health, the area where this has been measured most, the cost of gaining one healthy year of life varies widely between approaches that all sound equally sensible on paper.',
    'So we look not only at the problem an organisation works on but at what it does about it. That judgement is harder than it sounds, and it is exactly why this board separates two kinds of vacancy: for one group an independent evaluator has already assessed the work, and for the other the judgement is ours, made role by role.',
  ],
  solutionsTests: [
    {
      label: 'Is there evidence it works?',
      example: 'Is there research showing this approach does what it claims, or mainly a compelling story?',
    },
    {
      label: 'Can it get bigger?',
      example: 'Something that works for a thousand people and stalls at a million is a different kind of solution.',
    },
    {
      label: 'Is somebody already doing it?',
      example: 'Within one problem area, one approach can be crowded while almost nobody stands next to another.',
    },
    {
      label: 'Does it sit on a bottleneck?',
      example: 'The piece everything else is waiting on is worth more than the piece there are already five of.',
    },
  ],
  solutionsSourceNote:
    'This is 80,000 Hours\' work too. They go deeper into it than we can here, with examples for each problem area.',
  solutionsLink: 'Read their piece on choosing a solution',

  leverageHeading: 'What we mean by leverage',
  leverageLead: 'One word does most of the work on this board, so it is only fair to explain it.',
  leverageBody: [
    'Leverage is just this: how much can you point at the problem, besides your own hours? For most jobs the answer is nothing — you do the work, the work is the result, and that is not a criticism. But some roles command far more than their own time. They decide where money goes. They write rules a whole sector follows. They set what dozens of other people spend their year on. Or they produce an insight that is free to copy afterwards.',
    'This is why the board carries employers who would never describe themselves as working on a global problem. An investment officer at a development bank moves more money towards poor countries with one decision than most people earn in a career. A policy officer at a regulator writes the standard thousands of companies then comply with. Neither works at a charity; both have more leverage than most people who do.',
    'The reverse holds too, and it is the harder half: a role at an excellent organisation can have very little leverage. Generic IT or office support at a ministry doing exactly the right thing does not change what that ministry decides. Being useful to a team with leverage is not the same as having any. That is precisely the distinction we try to make, vacancy by vacancy.',
  ],
  leverageMechanisms: [
    {
      label: 'Directing money',
      example: 'An investment officer at FMO, a programme officer at a foundation, a credit analyst at an agricultural lender.',
    },
    {
      label: 'Rules and regulation',
      example: 'A policy officer at a ministry, a regulator at the ACM or the AFM, somebody drafting a standard.',
    },
    {
      label: 'Research and technology',
      example: 'A researcher at a university or a technical institute. A finding costs almost nothing to copy and does not go away.',
    },
    {
      label: 'Building the field',
      example: 'Finding people and routing them towards the work. Finding someone better suited to a job than you are is itself a way of doing that job.',
    },
    {
      label: 'Spreading ideas',
      example: 'Journalism, documentary, public communication, advocacy. Reaches more people per hour than any conversation can.',
    },
    {
      label: 'Building organisations',
      example: 'Founding, leading, or making the operation work — so that a hundred people together achieve more than they would apart.',
    },
    {
      label: 'Amplifying someone with reach',
      example: 'Chief of staff or right hand to someone whose own work changes a great deal. The leverage is borrowed, but it is real.',
    },
    {
      label: 'Earning well and giving it away',
      example: 'A job that uses your strengths and lets you fund other people’s work. This board has its own page for it.',
    },
  ],
  leverageCaveatHeading: 'Two things leverage is not',
  leverageCaveats: [
    'It is not a guarantee that anything works. Enormous leverage pointed at a weak solution still achieves very little. So we do not look at it alone: the first question is still whether the problem is large and neglected, and whether this approach moves it.',
    'It says nothing about whether the job suits you. We judge the role as it would be for a competent typical holder, not for you. Whether you would be good at this and want to do it for years is a question we cannot answer for you — and it often matters more than anything we write here.',
  ],
  leverageSourceNote:
    'This idea is not ours. 80,000 Hours worked it out and has written far more about it than fits here, with examples from careers we do not cover. If one thing on this page is worth reading in the original, it is that.',
  leverageSourceLink: 'Read 80,000 Hours on leverage',

  readProblemChoice: 'Why your choice of problem matters so much',
  readCareerGuide: 'The 80,000 Hours career guide',
  readCareerPlanning: 'Career planning, in short',
  heroStat: (n, newest) => `${n === 1 ? '1 job' : `${n} jobs`} · newest from ${newest}`,
  heroBrowseCta: 'Pick a problem area',
  browseCauseHeading: 'What do you want to work on?',
  browseCauseBody:
    'Five problem areas we track because they are large, neglected and tractable. Pick an area, or go straight to the topic you came for.',
  browseSkillHeading: 'No preference? Browse by skill',
  browseSkillBody:
    'For when the problem matters less to you than what you are good at.',
  browseSkillAside: 'The same categories Probably Good uses.',
  browseRoleCount: (n) => (n === 1 ? '1 job' : `${n} jobs`),
  browseEmptyTile: 'Nothing open now',
  browseShowAll: (n) => `See all ${n} jobs`,
  backToBrowse: 'All problem areas',
  filteredByCause: (label) => label,
  filteredBySubArea: (label) => label,
  filteredBySkill: (label) => `Skill: ${label.toLowerCase()}`,

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
  tierExpand: (n) => `Show all ${n} roles`,
  tierCollapse: 'Show fewer',
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

  onwardHeading: 'Curious?',
  onwardBody:
    'If you want to know how we arrive at this list, we run a short intro course and a newsletter. Neither costs anything.',
  onwardCourse: 'See the intro course',
  onwardNewsletter: 'Sign up for the newsletter',

  languageSwitch: 'Nederlands',
  expiredHeading: 'This job has closed',
  expiredBody: 'The role is no longer open. Below is where to look next.',
  updatedAt: 'Updated',
  disagreeHeading: 'Disagree with something here?',
  disagreeBody:
    'This board is curated by people who can be wrong. If you think a listing does not belong, if we are missing one, or if something else is off:',
  footerSlogan: 'Do better, together.',

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
