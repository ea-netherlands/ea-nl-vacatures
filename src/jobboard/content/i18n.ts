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
    causes: '/vacatures/oorzaken',
    cause: (slug: string) => `/vacatures/oorzaken/${slug}`,
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

/** External destinations for the onward step (§4). */
export const ONWARD_LINKS = {
  introCourse: 'https://effectiefaltruisme.nl/introductiecursus',
  newsletter: 'https://effectiefaltruisme.nl/nieuwsbrief',
  glossary: 'https://effectiefaltruisme.nl/begrippenlijst',
  careerGuide: 'https://effectiefaltruisme.nl/loopbaan',
  community: 'https://effectiefaltruisme.nl/community',
  doneerEffectief: 'https://doneereffectief.nl',
  tienProcentClub: 'https://tienprocentclub.nl',
  contact: 'mailto:jobs@effectiefaltruisme.nl',
} as const

type Strings = {
  boardName: string
  boardTagline: string
  skipToContent: string

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
  leverage: Record<LeverageType, string>
  locationModes: Record<LocationMode, string>
  languageRequirements: Record<LanguageRequirement, string>
  workAuthorisations: Record<WorkAuthorisation, string>
  seniorities: Record<Seniority, string>
}

const nl: Strings = {
  boardName: 'Vacatures',
  boardTagline: 'Banen in Nederland waarmee je veel goed kunt doen',
  skipToContent: 'Naar de inhoud',

  indexTitle: 'Vacatures',
  indexIntroHeading: 'Wat staat hier?',
  indexIntroBody: [
    'Dit is een kleine, met de hand samengestelde lijst met banen in Nederland waarmee je volgens ons ongewoon veel goed kunt doen.',
    'De meeste staan bij werkgevers die zelf niet zouden zeggen dat ze aan een groot wereldprobleem werken: een ministerie, een bank, een toezichthouder, een universiteit. Bij elke vacature schrijven we één of twee zinnen over waar de hefboom zit — waarom déze functie meer verandert dan het werk van één persoon.',
    'We houden de lijst kort. Vijfentwintig goede vacatures zijn meer waard dan tweehonderd middelmatige.',
  ],
  indexIntroDismiss: 'Verberg deze uitleg',
  indexIntroMethodLink: 'Zo kiezen we',
  resultCount: (n) => (n === 1 ? '1 vacature' : `${n} vacatures`),
  sortLabel: 'Sorteer op',
  sortRecent: 'Nieuwste eerst',
  sortLeverage: 'Grootste hefboom eerst',
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
    'ai-safety-governance': 'AI-veiligheid en -beleid',
    'biosecurity-pandemics': 'Biosecurity en pandemieën',
    'animal-welfare-alt-protein': 'Dierenwelzijn en eiwittransitie',
    'global-health-development': 'Mondiale gezondheid en ontwikkeling',
    'global-catastrophic-risk': 'Mondiale catastrofale risico’s',
    'effective-giving-meta': 'Effectief geven',
    climate: 'Klimaat en biodiversiteit',
    'career-capital': 'Loopbaankapitaal',
  },
  leverage: {
    'capital-allocation': 'Geldstromen sturen',
    'policy-regulation': 'Beleid en toezicht',
    'research-evidence': 'Onderzoek en bewijs',
    'field-building': 'Het veld opbouwen',
    'direct-work': 'Direct werk',
    'career-capital': 'Loopbaankapitaal',
    'earning-to-give': 'Earning to give',
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
  boardTagline: 'Jobs in the Netherlands where you can do a lot of good',
  skipToContent: 'Skip to content',

  indexTitle: 'Jobs',
  indexIntroHeading: 'What is this?',
  indexIntroBody: [
    'A small, hand-picked list of jobs in the Netherlands where we think you can do an unusual amount of good.',
    'Most are at employers who would not say they work on a big global problem: a ministry, a bank, a regulator, a university. For each one we write a sentence or two about where the leverage sits — why this particular role changes more than one person’s work.',
    'We keep the list short. Twenty-five good listings are worth more than two hundred mediocre ones.',
  ],
  indexIntroDismiss: 'Hide this',
  indexIntroMethodLink: 'How we choose',
  resultCount: (n) => (n === 1 ? '1 job' : `${n} jobs`),
  sortLabel: 'Sort by',
  sortRecent: 'Newest first',
  sortLeverage: 'Highest leverage first',
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
    'ai-safety-governance': 'AI safety and governance',
    'biosecurity-pandemics': 'Biosecurity and pandemics',
    'animal-welfare-alt-protein': 'Animal welfare and alternative proteins',
    'global-health-development': 'Global health and development',
    'global-catastrophic-risk': 'Global catastrophic risk',
    'effective-giving-meta': 'Effective giving',
    climate: 'Climate and biodiversity',
    'career-capital': 'Career capital',
  },
  leverage: {
    'capital-allocation': 'Directing money',
    'policy-regulation': 'Policy and regulation',
    'research-evidence': 'Research and evidence',
    'field-building': 'Building the field',
    'direct-work': 'Direct work',
    'career-capital': 'Career capital',
    'earning-to-give': 'Earning to give',
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
