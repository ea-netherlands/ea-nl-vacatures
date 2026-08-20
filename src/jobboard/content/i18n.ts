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

  // Suggestions (August 2026)
  suggestTitle: string
  suggestLead: string
  suggestBody: string[]
  suggestKindLabel: string
  suggestKindListing: string
  suggestKindEmployer: string
  suggestUrlListing: string
  suggestUrlEmployer: string
  suggestOrgLabel: string
  suggestWhyLabel: string
  suggestWhyHint: string
  suggestEmailLabel: string
  suggestEmailHint: string
  suggestSubmit: string
  suggestSending: string
  suggestError: string
  suggestThanksHeading: string
  suggestThanksBody: string
  suggestNavLabel: string

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

  heroTitle: 'De banen in Nederland waarmee je het meeste goed doet.',
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

  readProblemChoice: 'Waarom je keuze van probleem zoveel uitmaakt',
  readCareerGuide: 'De loopbaangids van 80,000 Hours',
  readCareerPlanning: 'Een loopbaanplan in het kort',
  heroStat: (n, newest) =>
    `${n === 1 ? '1 vacature' : `${n} vacatures`} · nieuwste van ${newest}`,
  heroBrowseCta: 'Kies een probleemgebied',
  browseCauseHeading: 'Waar wil je aan werken?',
  browseCauseBody:
    'Vijf probleemgebieden die we volgen omdat ze groot, verwaarloosd en aan te pakken zijn. Kies een gebied, of ga meteen naar het onderwerp dat je zoekt.',
  browseSkillHeading: 'Geen voorkeur? Kies op vaardigheid.',
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

  suggestTitle: 'Ken je een vacature of organisatie die hier hoort?',
  suggestLead:
    'De meeste Nederlandse organisaties publiceren hun vacatures niet op een manier die wij automatisch kunnen volgen. Mensen die in het veld werken weten het vaak eerder dan wij.',
  suggestBody: [
    'Van de eenendertig Nederlandse organisaties die we onlangs onderzochten, publiceerde er één een vacaturebestand dat we automatisch kunnen uitlezen. De rest zet vacatures op een gewone webpagina, vaak twee weken lang. Daar komen we alleen achter als iemand het ons vertelt.',
    'Je tip komt bij een mens terecht, niet direct op het bord. We beoordelen elke vacature zelf en schrijven er zelf bij waarom die er staat — dat is het enige wat dit bord de moeite waard maakt.',
  ],
  suggestKindLabel: 'Wat wil je doorgeven?',
  suggestKindListing: 'Een specifieke vacature',
  suggestKindEmployer: 'Een organisatie om in de gaten te houden',
  suggestUrlListing: 'Link naar de vacature',
  suggestUrlEmployer: 'Link naar de vacaturepagina van de organisatie',
  suggestOrgLabel: 'Welke organisatie?',
  suggestWhyLabel: 'Waarom hoort dit hier?',
  suggestWhyHint:
    'Niet verplicht, maar dit is het nuttigste veld. Wat zie jij aan deze functie dat wij van buitenaf missen?',
  suggestEmailLabel: 'Je e-mailadres',
  suggestEmailHint:
    'Niet verplicht. Alleen om een vraag te stellen als iets onduidelijk is. We gebruiken het nergens anders voor.',
  suggestSubmit: 'Verstuur',
  suggestSending: 'Bezig met versturen',
  suggestError: 'Er ging iets mis. Probeer het opnieuw, of mail ons.',
  suggestThanksHeading: 'Dank je wel',
  suggestThanksBody:
    'We hebben het binnen. Iemand kijkt ernaar. Je hoort alleen van ons als we een vraag hebben.',
  suggestNavLabel: 'Tip ons',

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
    'Van deze organisaties zijn we er redelijk zeker van dat ze wereldwijd tot de besten behoren in hun vak — doorgelicht door GiveWell, Animal Charity Evaluators, Founders Pledge of The Life You Can Save, of uitgelicht door 80,000 Hours. Daarom staat hier elke functie die openstaat voor iemand in Nederland, ook ondersteunend of operationeel werk. Reken wel op stevige concurrentie, en op werk op afstand of verhuizen.',
  tierRecommendedCount: (n) => (n === 1 ? '1 vacature' : `${n} vacatures`),
  tierDutchHeading: 'Functies met een hefboom, hier in Nederland',
  tierDutchBody:
    'Nederlandse organisaties — ministeries, toezichthouders, universiteiten, banken — waar je vanuit Nederland aan een van deze problemen kunt bijdragen. Niemand heeft ze als geheel doorgelicht, dus beoordelen we per functie: telt wat deze specifieke rol doet, of leunt het op de missie van de werkgever? Dat oordeel is van ons. De concurrentie is hier meestal een stuk minder hevig.',
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
    'research-evidence': 'Onderzoek en bewijs',
    'field-building': 'Het veld opbouwen',
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

  heroTitle: 'The most socially impactful jobs in the Netherlands.',
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

  readProblemChoice: 'Why your choice of problem matters so much',
  readCareerGuide: 'The 80,000 Hours career guide',
  readCareerPlanning: 'Career planning, in short',
  heroStat: (n, newest) => `${n === 1 ? '1 job' : `${n} jobs`} · newest from ${newest}`,
  heroBrowseCta: 'Pick a problem area',
  browseCauseHeading: 'What do you want to work on?',
  browseCauseBody:
    'Five problem areas we track because they are large, neglected and tractable. Pick an area, or go straight to the topic you came for.',
  browseSkillHeading: 'No preference? Browse by skill.',
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

  suggestTitle: 'Know a job or an organisation that belongs here?',
  suggestLead:
    'Most Dutch organisations do not publish vacancies in a form we can follow automatically. People working in the field usually know before we do.',
  suggestBody: [
    'Of thirty-one Dutch organisations we recently checked, one published a job feed we can read automatically. The rest post vacancies as ordinary web pages, often for two weeks. We only find those if someone tells us.',
    'Your tip goes to a person, not straight onto the board. We assess every vacancy ourselves and write our own reason for listing it — that is the only thing making this board worth reading.',
  ],
  suggestKindLabel: 'What are you telling us about?',
  suggestKindListing: 'A specific vacancy',
  suggestKindEmployer: 'An organisation to watch',
  suggestUrlListing: 'Link to the vacancy',
  suggestUrlEmployer: 'Link to the organisation’s careers page',
  suggestOrgLabel: 'Which organisation?',
  suggestWhyLabel: 'Why does it belong here?',
  suggestWhyHint:
    'Optional, but the most useful field. What do you see in this role that we would miss from outside?',
  suggestEmailLabel: 'Your email address',
  suggestEmailHint:
    'Optional. Only so we can ask if something is unclear. We will not use it for anything else.',
  suggestSubmit: 'Send',
  suggestSending: 'Sending',
  suggestError: 'Something went wrong. Try again, or email us.',
  suggestThanksHeading: 'Thank you',
  suggestThanksBody:
    'We have it. Someone will look. You will only hear from us if we have a question.',
  suggestNavLabel: 'Suggest a job',

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
    'We are fairly confident these organisations are among the best in the world in their field — vetted by GiveWell, Animal Charity Evaluators, Founders Pledge or The Life You Can Save, or featured by 80,000 Hours. So we list every role there that is open to someone in the Netherlands, including support and operations work. Expect fierce competition, and expect remote work or a move.',
  tierRecommendedCount: (n) => (n === 1 ? '1 role' : `${n} roles`),
  tierDutchHeading: 'Roles with leverage, here in the Netherlands',
  tierDutchBody:
    'Dutch organisations — ministries, regulators, universities, banks — where you can work on one of these problems without leaving. Nobody has vetted them as a whole, so we judge role by role: does what this specific job does count, or is it leaning on the employer’s mission? That judgement is ours. Competition here is usually a good deal lighter.',
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
    'research-evidence': 'Research and evidence',
    'field-building': 'Building the field',
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
