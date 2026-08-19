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
  WORK_AUTHORISATIONS,
  type CauseArea,
  type LanguageRequirement,
  type LeverageType,
  type LocationMode,
  type Seniority,
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
  tienProcentClub: 'https://tienprocentclub.nl',
  contact: 'mailto:jobs@effectiefaltruisme.nl',
  effectiveEnvironmentalism: 'https://www.effectiveenvironmentalism.org',
} as const

type Strings = {
  boardName: string
  boardTagline: string
  skipToContent: string

  // The international-first statement (§4a) — index, method page and every
  // listing. `intlShort` is the compact form for a listing page, where a full
  // section would be nagging but silence would be misleading.
  intlHeading: string
  intlBody: string[]
  intlBoardBlurbs: Record<InternationalBoardId, string>
  intlFallback: string
  intlShort: string
  intlLink: string

  // Why climate is not on the board (§5.1)
  climateHeading: string
  climateBody: string[]
  climateReferralLink: string

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
  tierDutchCount: (n: number) => string
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

  causeAreas: Record<CauseArea, string>
  causeSubareas: Record<CauseArea, string[]>
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
  intlLink: 'Waarom we dit zeggen',

  climateHeading: 'Waarom staat klimaat er niet bij?',
  climateBody: [
    'Niet omdat we klimaatverandering onbelangrijk vinden. Het staat er niet bij omdat het in Nederland niet verwaarloosd is: er gaat al veel geld, talent en politieke aandacht naartoe. Dat is goed nieuws. De problemen op dit bord hebben die aandacht niet, en dat is precies waarom we ze eruit lichten.',
    'Welk klimaatwerk dan wél ondergewaardeerd is, blijft een goede vraag — en een aparte. Effective Environmentalism stelt die vraag serieus en heeft er onderzoek en een gemeenschap omheen. Dat is een betere plek om te beginnen dan een handvol werkgevers hier zou zijn geweest.',
  ],
  climateReferralLink: 'Ga naar Effective Environmentalism',

  indexTitle: 'Vacatures',
  indexIntroHeading: 'Wat staat hier?',
  indexIntroBody: [
    'Dit bord gaat over één vraag: hoe werk je vanuit Nederland aan de grootste en meest verwaarloosde problemen ter wereld? We houden vier probleemgebieden bij en zoeken de Nederlandse functies die er echt iets aan veranderen.',
    'De meeste staan bij werkgevers die zelf niet zouden zeggen dat ze aan een groot wereldprobleem werken: een ministerie, een bank, een toezichthouder, een universiteit. Bij elke vacature schrijven we één of twee zinnen over waar de hefboom zit — waarom déze functie meer verandert dan het werk van één persoon.',
    'We houden de lijst kort. Vijfentwintig goede vacatures zijn meer waard dan tweehonderd middelmatige.',
  ],
  indexIntroDismiss: 'Verberg deze uitleg',
  indexIntroMethodLink: 'Zo kiezen we',
  resultCount: (n) => (n === 1 ? '1 vacature' : `${n} vacatures`),
  sortLabel: 'Sorteer op',
  sortRecent: 'Nieuwste eerst',
  sortLeverage: 'Grootste hefboom eerst',
  tierRecommendedHeading: 'Onze beste aanbevelingen',
  tierRecommendedBody:
    'Deze functies zijn bij organisaties die door onafhankelijke onderzoeksorganisaties zijn doorgelicht — GiveWell, Animal Charity Evaluators, Founders Pledge en The Life You Can Save — of die door 80,000 Hours worden uitgelicht. Zij hebben het werk al gedaan om te beoordelen of de organisatie zelf iets betekent. Daarom staat hier elke functie die openstaat voor iemand in Nederland, ook een ondersteunende of operationele rol.',
  tierRecommendedCount: (n) => (n === 1 ? '1 vacature' : `${n} vacatures`),
  tierDutchHeading: 'Nederlandse organisaties met een hefboom',
  tierDutchBody:
    'Grote Nederlandse organisaties — ministeries, toezichthouders, universiteiten, banken — die invloed hebben op een van deze vier problemen. Niemand heeft ze als geheel doorgelicht, dus beoordelen we hier per functie: telt wat deze specifieke rol doet, of leunt het vooral op de missie van de werkgever? Dat oordeel is van ons, en je mag het van ons betwisten.',
  tierDutchCount: (n) => (n === 1 ? '1 vacature' : `${n} vacatures`),
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
  disagreeHeading: 'Oneens met een vacature op deze lijst?',
  disagreeBody:
    'Dit bord wordt samengesteld door mensen die het mis kunnen hebben. Vind je dat een vacature er niet op hoort, of mis je er een, mail ons dan.',

  causeAreas: {
    'global-health-wellbeing': 'Mondiale gezondheid en welzijn',
    'farmed-animal-welfare': 'Dierenwelzijn in de veehouderij',
    'global-catastrophic-risks': 'Mondiale catastrofale risico’s',
    'better-futures': 'Betere toekomsten',
  },
  // Sub-areas are display text, not a filter. They exist because four
  // categories are too coarse to tell a reader what actually falls inside one.
  causeSubareas: {
    'global-health-wellbeing': [
      'Mondiale gezondheid en infectieziekten',
      'Ontwikkelingsfinanciering en hulpbeleid',
      'Zorgstelsels in lage- en middeninkomenslanden',
      'Loodvergiftiging en luchtkwaliteit',
      'Psychische gezondheid op schaal',
    ],
    'farmed-animal-welfare': [
      'Campagnes richting bedrijven en belangenbehartiging',
      'Dierenrecht en handhaving',
      'Kweekvlees, fermentatie en plantaardige eiwitten',
      'Beleid en financiering van de eiwittransitie',
    ],
    'global-catastrophic-risks': [
      'AI die zich aan menselijke controle onttrekt, en catastrofaal misbruik',
      'Biosecurity, pandemische paraatheid en dual-use onderzoek',
      'Nucleaire veiligheid en conflict tussen grootmachten',
    ],
    'better-futures': [
      'AI-beleid, machtsconcentratie en het vastleggen van waarden',
      'Kwaliteit en weerbaarheid van democratische instituties',
      'Uitbreiding van je morele cirkel, inclusief digitale wezens (digital minds)',
      'Ruimtebeleid',
    ],
  },
  leverage: {
    'capital-allocation': 'Geldstromen sturen',
    'policy-regulation': 'Beleid en toezicht',
    'research-evidence': 'Onderzoek en bewijs',
    'field-building': 'Het veld opbouwen',
    'direct-work': 'Direct werk',
    'career-capital': 'Loopbaankapitaal',
    'earning-to-give': 'Earning to give',
    'trusted-recommendation': 'Aanbevolen door een evaluator',
  },
  locationModes: {
    'on-site': 'Op locatie',
    hybrid: 'Hybride',
    'remote-nl': 'Op afstand (Nederland)',
    'remote-eu': 'Op afstand (Europa)',
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
  intlLink: 'Why we say this',

  climateHeading: 'Why is climate not here?',
  climateBody: [
    'Not because we think climate change does not matter. It is not here because in the Netherlands it is not neglected: a great deal of money, talent and political attention already goes to it. That is good news. The problems on this board do not have that attention, which is exactly why we single them out.',
    'Which climate work is genuinely underrated remains a good question — and a separate one. Effective Environmentalism takes it seriously and has research and a community around it. That is a better place to start than a handful of employers here would have been.',
  ],
  climateReferralLink: 'Go to Effective Environmentalism',

  indexTitle: 'Jobs',
  indexIntroHeading: 'What is this?',
  indexIntroBody: [
    'This board is about one question: how do you work on the world’s largest and most neglected problems from the Netherlands? We track four problem areas and look for the Dutch roles that genuinely move them.',
    'Most are at employers who would not say they work on a big global problem: a ministry, a bank, a regulator, a university. For each one we write a sentence or two about where the leverage sits — why this particular role changes more than one person’s work.',
    'We keep the list short. Twenty-five good listings are worth more than two hundred mediocre ones.',
  ],
  indexIntroDismiss: 'Hide this',
  indexIntroMethodLink: 'How we choose',
  resultCount: (n) => (n === 1 ? '1 job' : `${n} jobs`),
  sortLabel: 'Sort by',
  sortRecent: 'Newest first',
  sortLeverage: 'Highest leverage first',
  tierRecommendedHeading: 'Our strongest recommendations',
  tierRecommendedBody:
    'These roles are at organisations vetted by independent research organisations — GiveWell, Animal Charity Evaluators, Founders Pledge and The Life You Can Save — or featured by 80,000 Hours. They have already done the work of judging whether the organisation itself is worth your time. So we list every role there that is open to someone in the Netherlands, including support and operations roles.',
  tierRecommendedCount: (n) => (n === 1 ? '1 role' : `${n} roles`),
  tierDutchHeading: 'Dutch organisations with leverage',
  tierDutchBody:
    'Large Dutch organisations — ministries, regulators, universities, banks — with influence over one of these four problems. Nobody has vetted them as a whole, so here we judge role by role: does what this specific job does count, or is it leaning on the employer’s mission? That judgement is ours, and you are welcome to argue with it.',
  tierDutchCount: (n) => (n === 1 ? '1 role' : `${n} roles`),
  filtersHeading: 'Filter',
  clearFilters: 'Clear filters',
  emptyHeading: 'No jobs match these filters',
  emptyBody: 'That happens easily on a board this size. Try loosening one filter.',
  emptySuggestion: 'Look at these instead:',
  emptyClear: 'Clear all filters',

  filterCause: 'Problem area',
  filterLeverage: 'Kind of leverage',
  filterLocation: 'Where you work',
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
  disagreeHeading: 'Disagree with something on this list?',
  disagreeBody:
    'This board is curated by people who can be wrong. If you think a listing does not belong, or we are missing one, email us.',

  causeAreas: {
    'global-health-wellbeing': 'Global health and wellbeing',
    'farmed-animal-welfare': 'Farmed animal welfare',
    'global-catastrophic-risks': 'Global catastrophic risks',
    'better-futures': 'Better futures',
  },
  causeSubareas: {
    'global-health-wellbeing': [
      'Global health and infectious disease',
      'Development finance and aid policy',
      'Health systems in low- and middle-income countries',
      'Lead exposure and air quality',
      'Mental health at scale',
    ],
    'farmed-animal-welfare': [
      'Corporate campaigns and advocacy',
      'Animal law and enforcement',
      'Cultivated meat, fermentation and plant-based protein',
      'Protein transition policy and finance',
    ],
    'global-catastrophic-risks': [
      'AI escaping human control, and catastrophic misuse',
      'Biosecurity, pandemic preparedness and dual-use research',
      'Nuclear security and great-power conflict',
    ],
    'better-futures': [
      'AI governance, power concentration and value lock-in',
      'Quality and resilience of democratic institutions',
      'Moral circle expansion, including digital minds',
      'Space governance',
    ],
  },
  leverage: {
    'capital-allocation': 'Directing money',
    'policy-regulation': 'Policy and regulation',
    'research-evidence': 'Research and evidence',
    'field-building': 'Building the field',
    'direct-work': 'Direct work',
    'career-capital': 'Career capital',
    'earning-to-give': 'Earning to give',
    'trusted-recommendation': 'Recommended by an evaluator',
  },
  locationModes: {
    'on-site': 'On site',
    hybrid: 'Hybrid',
    'remote-nl': 'Remote (Netherlands)',
    'remote-eu': 'Remote (Europe)',
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
