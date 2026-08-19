/**
 * Seed employer watchlist — spec Appendix A.
 *
 * "Treat the whole list as a starting point rather than a finished artefact.
 * Roughly a third of a curator's early time will go on extending and correcting
 * this table, and that is time well spent: the watchlist is the asset, not the
 * code."
 *
 * Verification flags from the appendix are carried through deliberately. Every
 * entry marked `verify` has something to confirm before it goes live, and the
 * reason is in `notes` rather than lost. A `null` ats means we have no public
 * feed yet — those employers need either a live test (M0) or a relationship.
 */

import type { CauseArea } from '../taxonomy'

export type SeedEmployer = {
  id: string
  name: string
  website?: string
  careersUrl?: string
  city?: string
  ats?: string | null
  atsToken?: string | null
  causeAreas: CauseArea[]
  leverageNote?: string
  e2gAllowlisted?: boolean
  e2gSalaryPresumed?: boolean
  /**
   * This org is itself vetted by an independent evaluator (GiveWell, ACE,
   * Founders Pledge, ...) or featured by 80,000 Hours/Probably Good. Any role
   * here is in scope regardless of the classifier's own leverage judgement —
   * see `trusted-recommendation` in ../taxonomy/index.ts.
   */
  recommenderAllowlisted?: boolean
  watchlistTier?: 1 | 2 | 3
  /** False when something in the appendix still needs confirming. */
  active?: boolean
  verify?: boolean
  notes?: string
}

/**
 * Corrections to common assumptions — Appendix A says apply these first.
 * Recorded here so nobody re-adds a wound-down company from an old list.
 */
export const CORRECTIONS = [
  'Meatable shut down (announced 19 December 2025, wound down after failing to raise). Do not list.',
  'Upstream Foods wound up mid-2025. The Dutch cultivated meat sector has consolidated to essentially one significant employer.',
  'Simavi is now WaterAid Nederland (renamed March 2026 on joining the WaterAid federation).',
  'Dutch AI policy moved from BZK to the Ministry of Economic Affairs and Climate (EZK) when the Jetten cabinet took office on 23 February 2026. It sits with the State Secretary for Digital Economy and Sovereignty. BZK kept only information security and internal government digitalisation. Watch EZK, not BZK. Note EZK is distinct from the separate Ministry of Climate and Green Growth — never write "Ministry of Economic Affairs" unqualified.',
  'There is no Dutch AI Safety Institute. Do not list one.',
  'Do not list Catalyze Impact or Timaeus as Dutch. Catalyze is a Colorado 501(c)(3); Timaeus merged into Resolution (Berkeley/Melbourne/London).',
  'Those Vegan Cowboys is operationally headquartered in Ghent, Belgium. Include only if the board accepts Benelux.',
  'PeakBridge is often miscited as a Dutch alt-protein VC — it is Malta/Antwerp. Exclude.',
  'Oak Foundation has no verified Netherlands presence; it is Geneva-headquartered. Do not list under NL.',
] as const

/**
 * Organisations removed when climate stopped being a cause area (August 2026).
 *
 * All five were on a Giving Green recommendation list and were perfectly
 * defensible entries under the old allowlist gate. They are out of scope now
 * because the board does not cover climate at all, not because anything about
 * them changed — so they are recorded rather than deleted. Anyone re-reading
 * Appendix A will find them there and should not re-add them.
 *
 * Someone whose priority is climate should be sent to Effective Environmentalism
 * (see `EXCLUDED_TOPICS` in ../taxonomy), which is a better resource for them
 * than a five-employer category here would ever have been.
 */
export const OUT_OF_SCOPE = [
  'Wetlands International (Ede) — climate and biodiversity. Out of scope.',
  'Clean Air Task Force — climate. Out of scope.',
  'Future Cleantech Architects — climate. Out of scope.',
  'Opportunity Green — climate. Out of scope.',
  'Project InnerSpace — geothermal. Out of scope.',
] as const

export const SEED_EMPLOYERS: SeedEmployer[] = [
  // -------------------------------------------------------------------------
  // Animal welfare and alternative proteins
  // -------------------------------------------------------------------------
  {
    id: 'mosa-meat',
    name: 'Mosa Meat',
    city: 'Maastricht',
    website: 'https://mosameat.com',
    careersUrl: 'https://careers.mosameat.com',
    // Homerun requires a Bearer token on every endpoint and the docs state
    // there are no public endpoints — so JSON-LD scraping of the career page
    // is the only route (§7.2).
    ats: 'homerun',
    atsToken: 'careers.mosameat.com',
    causeAreas: ['farmed-animal-welfare'],
    leverageNote:
      'De overgebleven Europese voorloper in gekweekt vlees. Of deze sector prijspariteit haalt, is bijna een kernvraag voor het hele probleemgebied.',
    watchlistTier: 1,
  },
  {
    id: 'rabobank-raboresearch',
    name: 'Rabobank — RaboResearch Food & Agribusiness',
    city: 'Utrecht',
    website: 'https://www.rabobank.com',
    careersUrl: 'https://rabobank.jobs/en',
    ats: null,
    causeAreas: ['farmed-animal-welfare'],
    leverageNote:
      'De grootste food-en-agrikredietverstrekker ter wereld. De sectorvooruitzichten van RaboResearch bewegen Europees kapitaal in veehouderij en alternatieve eiwitten. Plausibel de hoogste hefboom op dierenwelzijn van welke niet-voor-de-hand-liggende baan in Nederland ook.',
    watchlistTier: 1,
    notes: 'ATS unverified — inspect rabobank.jobs before building an adapter.',
    verify: true,
  },
  {
    id: 'invest-nl',
    name: 'Invest-NL',
    city: 'Amsterdam',
    website: 'https://www.invest-nl.nl',
    careersUrl: 'https://www.invest-nl.nl/en/about-us/working-at',
    ats: null,
    causeAreas: ['farmed-animal-welfare'],
    leverageNote:
      'Impactinvesteerder met staatssteun; circa €13 mln in startups voor alternatieve eiwitten. Werkt aan precies het gat in opschalingskapitaal dat net twee Nederlandse bedrijven de kop kostte.',
    watchlistTier: 2,
  },
  {
    id: 'unovis-asset-management',
    name: 'Unovis Asset Management',
    city: 'Amsterdam',
    website: 'https://unovis.vc',
    ats: null,
    causeAreas: ['farmed-animal-welfare'],
    leverageNote:
      'Pure-play durfkapitaal voor alternatieve eiwitten, tweede fonds van €146 mln, met Amsterdam als hub voor Europa en Azië.',
    watchlistTier: 3,
    notes: 'Appendix A: currently states no openings.',
    verify: true,
  },
  {
    id: 'cellulaire-agricultuur-nederland',
    name: 'Cellulaire Agricultuur Nederland',
    ats: null,
    causeAreas: ['farmed-animal-welfare'],
    leverageNote:
      'Coördineert het nationale Groeifondsprogramma voor cellulaire landbouw.',
    watchlistTier: 3,
    active: false,
    notes: 'No careers page found — needs a contact rather than a scraper.',
    verify: true,
  },
  {
    id: 'nwo-cellular-agriculture',
    name: 'NWO — Cellulaire landbouw',
    website: 'https://www.nwo.nl',
    careersUrl: 'https://www.nwo.nl/en/vacancies',
    ats: null,
    causeAreas: ['farmed-animal-welfare'],
    leverageNote: 'De onderzoeksraad die de academische kant financiert. PhD- en postdocstroom.',
    watchlistTier: 3,
  },
  {
    id: 'wageningen-university-research',
    name: 'Wageningen University & Research',
    city: 'Wageningen',
    website: 'https://www.wur.nl',
    careersUrl: 'https://www.wur.nl/en/vacancies',
    ats: null,
    causeAreas: ['farmed-animal-welfare', 'global-catastrophic-risks'],
    leverageNote:
      'De dominante Europese onderzoeksinstelling voor voedsel en landbouw, met een ongewoon korte weg van onderzoek naar beleid.',
    watchlistTier: 2,
    notes: 'Also reachable via AcademicTransfer.',
  },
  {
    id: 'wakker-dier',
    name: 'Wakker Dier',
    city: 'Amsterdam',
    website: 'https://www.wakkerdier.nl',
    careersUrl: 'https://www.wakkerdier.nl/over-wakker-dier/vacatures',
    ats: null,
    causeAreas: ['farmed-animal-welfare'],
    leverageNote:
      'Sterke staat van dienst in beleidswinst bij bedrijven per euro; de Nederlandse tegenhanger van het corporate-campaignmodel dat EA-donateurs voor dieren steunen.',
    watchlistTier: 2,
  },
  {
    id: 'dier-en-recht',
    name: 'Dier&Recht',
    website: 'https://www.dierenrecht.nl',
    careersUrl: 'https://www.dierenrecht.nl/over-dier-en-recht/vacatures',
    ats: null,
    causeAreas: ['farmed-animal-welfare'],
    leverageNote:
      'Dierenrecht. Rechtszaken en handhavingsklachten zijn een verwaarloosde Nederlandse hefboom.',
    watchlistTier: 2,
  },
  {
    id: 'proveg-nederland',
    name: 'ProVeg Nederland',
    website: 'https://proveg.org/nl',
    careersUrl: 'https://proveg.org/nl/vacatures',
    ats: null,
    causeAreas: ['farmed-animal-welfare'],
    leverageNote: 'Voedingsverandering, bedrijvenaanpak en institutionele catering.',
    watchlistTier: 2,
  },
  {
    id: 'world-animal-protection-nl',
    name: 'World Animal Protection Nederland',
    website: 'https://www.worldanimalprotection.nl',
    careersUrl: 'https://www.worldanimalprotection.nl/over-ons/vacatures',
    ats: null,
    causeAreas: ['farmed-animal-welfare'],
    watchlistTier: 3,
  },
  {
    id: 'good-food-institute-europe',
    name: 'Good Food Institute Europe',
    website: 'https://gfieurope.org',
    careersUrl: 'https://gfi.org/careers',
    ats: null,
    causeAreas: ['farmed-animal-welfare'],
    leverageNote:
      'Niet in Nederland gevestigd, maar plaatst regelmatig thuiswerkfuncties die openstaan voor mensen in Nederland.',
    // Qualifies on both the climate and biodiversity Giving Green tracks.
    watchlistTier: 2,
  },
  {
    id: 'green-protein-alliance',
    name: 'Green Protein Alliance / Transitiecoalitie Voedsel',
    ats: null,
    causeAreas: ['farmed-animal-welfare'],
    leverageNote: 'Kleine secretariaten, goed geplaatst voor beleid rond de eiwittransitie.',
    watchlistTier: 3,
    active: false,
    verify: true,
  },

  // -------------------------------------------------------------------------
  // AI safety and governance
  // -------------------------------------------------------------------------
  {
    id: 'autoriteit-persoonsgegevens',
    name: 'Autoriteit Persoonsgegevens — Directie Coördinatie Algoritmes',
    city: 'Den Haag',
    website: 'https://autoriteitpersoonsgegevens.nl',
    careersUrl: 'https://www.werkenvoornederland.nl/organisaties/autoriteit-persoonsgegevens',
    ats: null,
    causeAreas: ['better-futures'],
    leverageNote:
      'Deelt de coördinerende rol in AI-toezicht met de RDI onder de conceptuitvoeringswet, en is daarnaast de restcategorie-toezichthouder voor domeinen zonder eigen toezichthouder. Handhaaft de verboden praktijken uit de AI-verordening. Bouwt zichtbaar op. Vermoedelijk de AI-governancewerkgever met de grootste hefboom in het land.',
    watchlistTier: 1,
    notes:
      'Link to the organisation search on werkenvoornederland, not to postings — those expire fast. Time-sensitive: the consultation on the Uitvoeringswet AI-verordening ran 20 April to 1 June 2026, so the AP and RDI designations are provisional and national fining powers are still pending. Check the bill before describing anyone as the designated regulator.',
    verify: true,
  },
  {
    id: 'ministerie-ezk',
    name: 'Ministerie van Economische Zaken en Klimaat',
    city: 'Den Haag',
    careersUrl: 'https://www.werkenvoornederland.nl',
    ats: null,
    causeAreas: ['better-futures', 'global-catastrophic-risks'],
    leverageNote:
      'Heeft sinds februari 2026 digitale zaken en AI-beleid. Er is geen minister van Digitale Zaken, dus een klein team draagt een grote portefeuille — veel invloed per persoon.',
    watchlistTier: 1,
    notes:
      'Distinct from the separate Ministry of Climate and Green Growth. Never write "Ministry of Economic Affairs" unqualified.',
  },
  {
    id: 'rijksinspectie-digitale-infrastructuur',
    name: 'Rijksinspectie Digitale Infrastructuur (RDI)',
    website: 'https://www.rdi.nl',
    careersUrl: 'https://www.werkenvoornederland.nl',
    ats: null,
    causeAreas: ['better-futures'],
    leverageNote:
      'Samen met de AP coördinerend AI-toezichthouder, en de technische pijler: markttoezicht op AI in producten, en aanmeldende autoriteit voor conformiteitsbeoordelingsinstanties.',
    watchlistTier: 1,
    notes: 'Careers page unverified; also posts via werkenvoornederland.',
    verify: true,
  },
  {
    id: 'tno',
    name: 'TNO',
    city: 'Den Haag',
    website: 'https://www.tno.nl',
    careersUrl: 'https://www.tno.nl/en/careers/vacancies',
    ats: null,
    causeAreas: ['global-catastrophic-risks'],
    leverageNote:
      'Doet het toegepaste onderzoek waar ministeries en toezichthouders op leunen. Heeft lopende functies rond verantwoorde AI en taalmodellen.',
    watchlistTier: 2,
  },
  {
    id: 'rathenau-instituut',
    name: 'Rathenau Instituut',
    city: 'Den Haag',
    website: 'https://www.rathenau.nl',
    careersUrl: 'https://www.rathenau.nl/en/careers',
    ats: null,
    causeAreas: ['better-futures'],
    leverageNote:
      'Technologiebeoordeling voor de Tweede Kamer. Kleine organisatie, onevenredig veel agenderende macht.',
    watchlistTier: 2,
  },
  {
    id: 'uva-ivir',
    name: 'Universiteit van Amsterdam — IViR / AI, Media & Democracy Lab',
    city: 'Amsterdam',
    website: 'https://www.ivir.nl',
    careersUrl: 'https://www.ivir.nl/about-us/vacancies',
    ats: null,
    causeAreas: ['better-futures'],
    leverageNote:
      'Het sterkste Nederlandse deep-learningcentrum, gecombineerd met serieuze capaciteit in informatierecht.',
    watchlistTier: 2,
  },
  {
    id: 'tu-delft',
    name: 'TU Delft — AiTech, Design for Values, AI Labs',
    city: 'Delft',
    website: 'https://www.tudelft.nl',
    ats: null,
    causeAreas: ['global-catastrophic-risks'],
    leverageNote: 'Werkt aan zinvolle menselijke controle over autonome systemen.',
    watchlistTier: 2,
  },
  {
    id: 'sectorale-ai-toezichthouders',
    name: 'AFM, DNB, IGJ en Inspectie van het Onderwijs',
    careersUrl: 'https://www.werkenvoornederland.nl',
    ats: null,
    causeAreas: ['better-futures'],
    leverageNote:
      'Sectorale toezichthouders onder de AI-verordening. Het Nederlandse model is bewust gedecentraliseerd, dus AI-kennis is bij al deze organisaties nodig.',
    watchlistTier: 3,
    notes: 'Each has its own careers site; treat as four sources when built out.',
    verify: true,
  },
  {
    id: 'safe-ai-netherlands',
    name: 'Safe AI Netherlands',
    website: 'https://safeainetherlands.org',
    ats: null,
    causeAreas: ['global-catastrophic-risks'],
    leverageNote:
      'Nederlandse non-profit voor AI-veiligheid; AISF-cursussen, onderzoeksmatching, afdelingen in Groningen, Amsterdam en Utrecht.',
    watchlistTier: 3,
    active: false,
    notes: 'No careers page.',
    verify: true,
  },
  {
    id: 'stichting-pauseai',
    name: 'Stichting PauseAI',
    city: 'Zeist',
    website: 'https://pauseai.info',
    ats: null,
    causeAreas: ['global-catastrophic-risks'],
    leverageNote:
      'De belangrijkste internationale beweging rond AI-risico is juridisch een Nederlandse stichting.',
    watchlistTier: 3,
    notes: 'Historically volunteer-heavy — paid roles are rare.',
    verify: true,
  },
  {
    id: 'asml',
    name: 'ASML',
    city: 'Veldhoven',
    website: 'https://www.asml.com',
    careersUrl: 'https://www.asml.com/en/careers',
    ats: null,
    causeAreas: [],
    leverageNote:
      'Enige producent van EUV-lithografie — het knelpunt in de toeleveringsketen voor AI-rekenkracht. Een gewone commerciële baan, maar verdedigbaar loopbaankapitaal voor wie richting compute governance wil.',
    watchlistTier: 3,
  },
  {
    id: 'existential-risk-observatory',
    name: 'Existential Risk Observatory',
    city: 'Amsterdam',
    ats: null,
    causeAreas: ['global-catastrophic-risks'],
    watchlistTier: 3,
    active: false,
    notes: 'Explicitly states no full-time openings — list as volunteer/future.',
    verify: true,
  },

  // -------------------------------------------------------------------------
  // Biosecurity and pandemic preparedness
  // -------------------------------------------------------------------------
  {
    id: 'rivm',
    name: 'RIVM',
    city: 'Bilthoven',
    website: 'https://www.rivm.nl',
    careersUrl: 'https://www.werkenvoornederland.nl/organisaties/rivm',
    ats: null,
    causeAreas: ['global-catastrophic-risks'],
    leverageNote:
      'Voert de Nederlandse pandemiedetectie en -respons uit; het Centrum Infectieziektebestrijding is de operationele kern.',
    watchlistTier: 1,
  },
  {
    id: 'erasmus-mc-viroscience',
    name: 'Erasmus MC — Viroscience',
    city: 'Rotterdam',
    website: 'https://www.erasmusmc.nl',
    careersUrl: 'https://www.werkenbijerasmusmc.nl',
    ats: null,
    causeAreas: ['global-catastrophic-risks'],
    leverageNote:
      'Een van de leidende virologieafdelingen ter wereld, en een van de weinige plekken waar het debat over dual-use-onderzoek niet theoretisch maar geleefd is.',
    watchlistTier: 1,
  },
  {
    id: 'european-medicines-agency',
    name: 'European Medicines Agency',
    city: 'Amsterdam',
    website: 'https://www.ema.europa.eu',
    careersUrl: 'https://careers.ema.europa.eu',
    ats: null,
    causeAreas: ['global-catastrophic-risks', 'global-health-wellbeing'],
    leverageNote:
      'Een EU-brede toezichthouder die fysiek in Nederland zit en de toelatingsroutes voor vaccins en geneesmiddelen in 27 landen bepaalt. Vermoedelijk de meest onderschatte werkgever voor mondiale gezondheid in Nederland.',
    watchlistTier: 1,
  },
  {
    id: 'wageningen-bioveterinary-research',
    name: 'Wageningen Bioveterinary Research',
    city: 'Lelystad',
    careersUrl: 'https://www.wur.nl/en/vacancies',
    ats: null,
    causeAreas: ['global-catastrophic-risks'],
    leverageNote:
      'Nationaal referentielaboratorium voor dierziekten, waaronder vogelgriep. Surveillance op zoönotische overdracht in het dichtstbevolkte veehouderijland van Europa.',
    watchlistTier: 2,
  },
  {
    id: 'ministerie-vws',
    name: 'Ministerie van Volksgezondheid, Welzijn en Sport',
    city: 'Den Haag',
    careersUrl: 'https://www.werkenvoornederland.nl',
    ats: null,
    causeAreas: ['global-catastrophic-risks'],
    leverageNote: 'Voert het programma pandemische paraatheid uit.',
    watchlistTier: 2,
  },
  {
    id: 'pandemic-disaster-preparedness-center',
    name: 'Pandemic & Disaster Preparedness Center',
    city: 'Rotterdam / Delft',
    ats: null,
    causeAreas: ['global-catastrophic-risks'],
    leverageNote: 'Gezamenlijk centrum van Erasmus MC, EUR en TU Delft.',
    watchlistTier: 3,
    active: false,
    notes: '2026 activity unconfirmed.',
    verify: true,
  },

  // -------------------------------------------------------------------------
  // Global health and development
  //
  // Sector context worth stating on the board: Dutch ODA was cut heavily under
  // the previous cabinet and is now partially reversing. In June 2026 the
  // minority Jetten cabinet agreed roughly €380M extra for 2026 with
  // GroenLinks-PvdA to pass the budget — but largely money pulled forward from
  // later years, so describe it as stabilisation, not growth. The practical
  // implication is that Dutch development organisations are hiring again after
  // two contractionary years.
  // -------------------------------------------------------------------------
  {
    id: 'ministerie-buitenlandse-zaken-dgis',
    name: 'Ministerie van Buitenlandse Zaken — DGIS',
    city: 'Den Haag',
    careersUrl: 'https://www.werkenvoornederland.nl',
    ats: null,
    causeAreas: ['global-health-wellbeing'],
    leverageNote:
      'Verdeelt het hele Nederlandse hulpbudget. Beleidsfuncties hier bewegen meer geld dan bijna elke ngo-functie.',
    watchlistTier: 1,
  },
  {
    id: 'fmo',
    name: 'FMO',
    city: 'Den Haag',
    website: 'https://www.fmo.nl',
    careersUrl: 'https://www.fmo.nl/careers',
    ats: null,
    causeAreas: ['global-health-wellbeing'],
    leverageNote:
      'De Nederlandse ontwikkelingsbank. Zet kapitaal in op een schaal die ngo’s met giften niet benaderen. Sterke match voor wie financieel geschoold is.',
    watchlistTier: 1,
  },
  {
    id: 'pharmaccess',
    name: 'PharmAccess',
    city: 'Amsterdam',
    website: 'https://www.pharmaccess.org',
    careersUrl: 'https://www.pharmaccess.org/vacancies',
    ats: null,
    causeAreas: ['global-health-wellbeing'],
    leverageNote:
      'Zorgfinanciering en verzekeringsmarkten in sub-Sahara-Afrika — een hefboom op systeemniveau waar de meeste ngo’s in mondiale gezondheid niet aan raken.',
    watchlistTier: 2,
  },
  {
    id: 'kit-royal-tropical-institute',
    name: 'KIT Royal Tropical Institute',
    city: 'Amsterdam',
    website: 'https://www.kit.nl',
    ats: null,
    causeAreas: ['global-health-wellbeing'],
    leverageNote: 'Onderzoek en advies op het gebied van mondiale gezondheid.',
    watchlistTier: 3,
    notes: 'Posts via AcademicTransfer.',
  },
  {
    id: 'cordaid',
    name: 'Cordaid',
    city: 'Den Haag',
    website: 'https://www.cordaid.org',
    careersUrl: 'https://www.cordaid.org/nl/over-cordaid/vacatures',
    ats: null,
    causeAreas: ['global-health-wellbeing'],
    leverageNote: 'Zorgsystemen, fragiele staten en humanitaire hulp.',
    watchlistTier: 3,
  },
  {
    id: 'aidsfonds',
    name: 'Aidsfonds',
    city: 'Amsterdam',
    website: 'https://aidsfonds.org',
    careersUrl: 'https://aidsfonds.org/vacancies',
    ats: null,
    causeAreas: ['global-health-wellbeing'],
    watchlistTier: 3,
  },
  {
    id: 'wateraid-nederland',
    name: 'WaterAid Nederland',
    website: 'https://www.wateraid.org/nl',
    ats: null,
    causeAreas: ['global-health-wellbeing'],
    leverageNote: 'Water, sanitatie en vrouwengezondheid in Afrika en Azië.',
    watchlistTier: 3,
    notes: 'Formerly Simavi; renamed March 2026. Vacancies URL unverified.',
    verify: true,
  },
  {
    id: 'partos',
    name: 'Partos',
    website: 'https://www.partos.nl',
    careersUrl: 'https://www.partos.nl/vacatures',
    ats: null,
    causeAreas: ['global-health-wellbeing'],
    leverageNote:
      'Branchevereniging met meer dan honderd leden. Voor het bord is dit vooral een bron, niet alleen een werkgever.',
    watchlistTier: 2,
  },

  // -------------------------------------------------------------------------
  // Philanthropy and grantmaking — highest leverage per role
  // -------------------------------------------------------------------------
  {
    id: 'adessium-foundation',
    name: 'Adessium Foundation',
    city: 'Reeuwijk',
    website: 'https://www.adessium.org',
    ats: null,
    causeAreas: [],
    leverageNote:
      '€18,7 mln naar 95 organisaties in 2025, ongeveer de helft in Nederland. Onafhankelijk, en werkt met strategisch advies in plaats van alleen cheques. Programmamedewerkers sturen bedragen met acht cijfers.',
    watchlistTier: 1,
    active: false,
    notes:
      'No careers page — roles are filled informally. Build a relationship rather than a scraper.',
    verify: true,
  },
  {
    id: 'goede-doelen-loterijen',
    name: 'Nationale Postcode Loterij / Goede Doelen Loterijen',
    city: 'Amsterdam',
    website: 'https://www.goededoelenloterijen.nl',
    careersUrl: 'https://www.werkendoejebij.nl',
    ats: null,
    causeAreas: [],
    leverageNote:
      'Steunt 150 goede doelen en hoort bij de grootste particuliere filantropische geldschieters ter wereld. De verdeellogica zit stroomopwaarts van de meeste grote Nederlandse ngo’s.',
    watchlistTier: 2,
  },
  {
    id: 'stichting-doen',
    name: 'Stichting DOEN',
    city: 'Amsterdam',
    website: 'https://www.doen.nl',
    careersUrl: 'https://www.doen.nl/en/about-us/vacancies',
    ats: null,
    causeAreas: [],
    leverageNote: 'De subsidiërende arm van de Nederlandse goededoelenloterijen.',
    watchlistTier: 2,
  },
  {
    id: 'goldschmeding-foundation',
    name: 'Goldschmeding Foundation',
    website: 'https://goldschmeding.foundation',
    careersUrl: 'https://goldschmeding.foundation/vacatures',
    ats: null,
    causeAreas: [],
    leverageNote:
      'Expliciet gericht op onderzoeksfinanciering — de Nederlandse mainstreamstichting die het dichtst bij een bewijsgedreven model komt.',
    watchlistTier: 2,
  },
  {
    id: 'porticus',
    name: 'Porticus',
    city: 'Amsterdam',
    website: 'https://www.porticus.com',
    ats: null,
    causeAreas: [],
    leverageNote: 'Wereldwijde subsidieverstrekking voor de bedrijven van de familie Brenninkmeijer.',
    watchlistTier: 3,
    notes: 'Careers page unverified.',
    verify: true,
  },
  {
    id: 'doneer-effectief',
    name: 'Doneer Effectief',
    city: 'Amsterdam',
    website: 'https://doneereffectief.nl',
    ats: null,
    causeAreas: ['global-health-wellbeing', 'farmed-animal-welfare'],
    leverageNote:
      '€24,3 mln gefaciliteerd per augustus 2026, met vijf betaalde medewerkers — de hoogste hoeveelheid verplaatst geld per medewerker van alles op deze lijst.',
    watchlistTier: 2,
    active: false,
    notes: 'No careers page; enquire directly.',
    verify: true,
  },
  {
    id: 'tien-procent-club',
    name: 'Tien Procent Club / De Geefrevolutie',
    website: 'https://tienprocentclub.nl',
    ats: null,
    causeAreas: ['global-health-wellbeing', 'farmed-animal-welfare'],
    leverageNote: 'De Nederlandse gemeenschap rond de geefbelofte.',
    watchlistTier: 3,
    active: false,
    verify: true,
  },
  {
    id: 'turing-foundation',
    name: 'Turing Foundation',
    website: 'https://www.turingfoundation.org',
    ats: null,
    causeAreas: [],
    watchlistTier: 3,
    active: false,
    notes:
      'Active, but its visible 2026 pipeline is Dutch arts and museum education; historically EA-adjacent programmes were not visible. Verify relevance before including.',
    verify: true,
  },

  // -------------------------------------------------------------------------
  // Global catastrophic risks — arms control and international regimes
  // -------------------------------------------------------------------------
  {
    id: 'opcw',
    name: 'OPCW',
    city: 'Den Haag',
    website: 'https://www.opcw.org',
    careersUrl: 'https://jobs.opcw.org',
    ats: null,
    causeAreas: ['global-catastrophic-risks'],
    leverageNote:
      'Het enige functionerende internationale regime voor een categorie massavernietigingswapens — een werkend model voor de bio- en AI-regimes die nog niet bestaan.',
    watchlistTier: 2,
  },
  {
    id: 'clingendael',
    name: 'Instituut Clingendael',
    city: 'Den Haag',
    website: 'https://www.clingendael.org',
    careersUrl: 'https://careers.clingendael.org',
    ats: null,
    causeAreas: ['global-catastrophic-risks'],
    leverageNote:
      'De belangrijkste Nederlandse denktank voor internationale betrekkingen; de voornaamste route naar Nederlands buitenland- en veiligheidsbeleid.',
    watchlistTier: 2,
  },
  {
    id: 'hcss',
    name: 'The Hague Centre for Strategic Studies',
    city: 'Den Haag',
    website: 'https://hcss.nl',
    careersUrl: 'https://hcss.nl/jobs',
    ats: null,
    causeAreas: ['global-catastrophic-risks'],
    leverageNote:
      'Een van de weinige Europese denktanks die strategische studies en opkomende technologie echt verbindt.',
    watchlistTier: 2,
  },
  {
    id: 'den-haag-international-institutions',
    name: 'ICC, ICJ, Europol en Eurojust',
    city: 'Den Haag',
    ats: null,
    causeAreas: ['global-catastrophic-risks'],
    leverageNote: 'Loopbaankapitaal in internationaal recht en veiligheid.',
    watchlistTier: 3,
    active: false,
    notes:
      'Individual URLs unverified; aggregate at unvacancies.org/jobs/location/the-hague. T.M.C. Asser Instituut (international law, emerging military technologies) is plausible but unverified.',
    verify: true,
  },

  // -------------------------------------------------------------------------
  // Earning to give — ALLOWLIST PLUS SALARY FLOOR (§5.3)
  //
  // Employers here are listed because of what they pay, not what they do, and
  // the section says so publicly. The Amsterdam proprietary trading cluster is
  // a genuine national advantage and mostly does not publish salaries, so
  // e2gSalaryPresumed is set for all of them.
  // -------------------------------------------------------------------------
  {
    id: 'optiver',
    name: 'Optiver',
    city: 'Amsterdam',
    website: 'https://www.optiver.com',
    careersUrl: 'https://optiver.com/working-at-optiver/career-opportunities',
    ats: null,
    causeAreas: [],
    e2gAllowlisted: true,
    e2gSalaryPresumed: true,
    watchlistTier: 2,
    notes: 'Verify the current roster and each firm’s ATS before building adapters.',
    verify: true,
  },
  {
    id: 'imc-trading',
    name: 'IMC Trading',
    city: 'Amsterdam',
    website: 'https://www.imc.com',
    careersUrl: 'https://careers.imc.com',
    ats: null,
    causeAreas: [],
    e2gAllowlisted: true,
    e2gSalaryPresumed: true,
    watchlistTier: 2,
    verify: true,
  },
  {
    id: 'flow-traders',
    name: 'Flow Traders',
    city: 'Amsterdam',
    website: 'https://www.flowtraders.com',
    careersUrl: 'https://www.flowtraders.com/careers',
    ats: null,
    causeAreas: [],
    e2gAllowlisted: true,
    e2gSalaryPresumed: true,
    watchlistTier: 2,
    verify: true,
  },
  {
    id: 'da-vinci-derivatives',
    name: 'Da Vinci Derivatives',
    city: 'Amsterdam',
    website: 'https://davinciderivatives.com',
    ats: null,
    causeAreas: [],
    e2gAllowlisted: true,
    e2gSalaryPresumed: true,
    watchlistTier: 2,
    verify: true,
  },
  {
    id: 'mckinsey-amsterdam',
    name: 'McKinsey & Company — Amsterdam',
    city: 'Amsterdam',
    ats: null,
    causeAreas: [],
    e2gAllowlisted: true,
    e2gSalaryPresumed: true,
    watchlistTier: 3,
    active: false,
    notes: 'Strategy consulting. Needs a named-employer list rather than a category rule.',
    verify: true,
  },
  {
    id: 'bcg-amsterdam',
    name: 'Boston Consulting Group — Amsterdam',
    city: 'Amsterdam',
    ats: null,
    causeAreas: [],
    e2gAllowlisted: true,
    e2gSalaryPresumed: true,
    watchlistTier: 3,
    active: false,
    verify: true,
  },
  {
    id: 'bain-amsterdam',
    name: 'Bain & Company — Amsterdam',
    city: 'Amsterdam',
    ats: null,
    causeAreas: [],
    e2gAllowlisted: true,
    e2gSalaryPresumed: true,
    watchlistTier: 3,
    active: false,
    verify: true,
  },

  // -------------------------------------------------------------------------
  // Trusted recommendation — ALLOWLIST, NO LEVERAGE JUDGEMENT (added August 2026)
  //
  // These organisations are already vetted by an independent evaluator or
  // featured by 80,000 Hours/Probably Good. Any role there is in scope — see
  // `trusted-recommendation` in ../taxonomy/index.ts and the score override in
  // ../classify/run.ts. Researched against the Giving What We Can evaluator
  // database (April 2026); GiveWell is deliberately excluded from this list
  // despite being the highest-profile evaluator, because its own remote-work
  // policy restricts hiring to within three hours of Pacific Time or to
  // US/UK/Canada work authorisation — not realistically NL-accessible.
  // -------------------------------------------------------------------------
  {
    id: 'founders-pledge',
    name: 'Founders Pledge',
    website: 'https://founderspledge.com',
    careersUrl: 'https://founderspledge.teamtailor.com',
    ats: 'teamtailor',
    atsToken: 'founderspledge.teamtailor.com',
    causeAreas: ['global-health-wellbeing', 'global-catastrophic-risks', 'better-futures'],
    leverageNote:
      'Onderzoekt en beheert fondsen over meerdere probleemgebieden voor techondernemers die willen doneren; eigen research- en fondsenwervingsrollen bepalen waar honderden miljoenen euro’s aan donaties naartoe gaan.',
    recommenderAllowlisted: true,
    watchlistTier: 2,
    notes: 'Careers page lists "Europe (flexible remote)" as an eligible location for some roles.',
  },
  {
    id: 'animal-charity-evaluators',
    name: 'Animal Charity Evaluators',
    website: 'https://animalcharityevaluators.org',
    careersUrl: 'https://animalcharityevaluators.org/about/our-team/join-our-team/',
    ats: null,
    causeAreas: ['farmed-animal-welfare'],
    leverageNote:
      'De belangrijkste onafhankelijke evaluator van dierenwelzijnsorganisaties; bepaalt welke liefdadigheidsinstellingen het vertrouwen en geld van donateurs wereldwijd krijgen.',
    recommenderAllowlisted: true,
    watchlistTier: 3,
    notes:
      'Careers hosted directly on their own WordPress site (no third-party ATS found) — needs a bespoke scraper or manual watch, not one of the existing adapters. "All positions are remote" per their benefits language.',
    verify: true,
  },
  {
    id: 'the-life-you-can-save',
    name: 'The Life You Can Save',
    website: 'https://www.thelifeyoucansave.org',
    ats: null,
    causeAreas: ['global-health-wellbeing'],
    leverageNote:
      'Peter Singers evaluator en fondsenwerver voor bewezen kosteneffectieve armoedebestrijding; stuurt donaties naar een kleine lijst zorgvuldig geëvalueerde organisaties.',
    recommenderAllowlisted: true,
    watchlistTier: 3,
    notes:
      'Described as "a fully remote organization with a globally distributed team" — no specific ATS found and no confirmed NL staff yet.',
    verify: true,
  },
  {
    id: 'happier-lives-institute',
    name: 'Happier Lives Institute',
    website: 'https://www.happierlivesinstitute.org',
    ats: null,
    causeAreas: ['global-health-wellbeing'],
    leverageNote:
      'Evalueert liefdadigheidsinstellingen op subjectief welzijn in plaats van op traditionele gezondheidsmaatstaven — een ander lens op wat "de meeste goed doen" betekent.',
    recommenderAllowlisted: true,
    watchlistTier: 3,
    notes:
      'Registered as a Dutch ANBI charity (tax status only, not an office or hiring signal). No open roles found at time of research (July 2026) — revisit periodically.',
    verify: true,
  },

  // -------------------------------------------------------------------------
  // Discovered via 80,000 Hours (August 2026) — orgs behind the NL/remote-
  // eligible listings in its Algolia index that already had a detectable ATS.
  // recommenderAllowlisted per the same trusted-recommendation rationale as
  // above: 80k featuring the role is the vetting, not this board's own
  // leverage judgement. nlEligible is still enforced per-listing regardless.
  // -------------------------------------------------------------------------
  {
    id: 'epoch-ai',
    name: 'Epoch AI',
    ats: 'lever',
    atsToken: 'epoch-ai',
    causeAreas: ['global-catastrophic-risks'],
    leverageNote:
      'Onderzoekt en publiceert de belangrijkste kwantitatieve gegevens over de vooruitgang van AI — compute, schaalvergroting en trends — waar beleidsmakers en onderzoekers wereldwijd op vertrouwen.',
    recommenderAllowlisted: true,
    watchlistTier: 2,
  },
  {
    id: 'eighty-thousand-hours',
    name: '80,000 Hours',
    website: 'https://80000hours.org',
    ats: 'ashby',
    atsToken: '80000hours',
    causeAreas: [],
    leverageNote: 'De belangrijkste loopbaanadviesorganisatie van de EA-beweging.',
    recommenderAllowlisted: true,
    watchlistTier: 3,
    notes: 'Meta/field-building — spans all cause areas rather than one.',
  },
  {
    id: 'far-ai',
    name: 'FAR AI',
    website: 'https://far.ai',
    ats: 'ashby',
    atsToken: 'far.ai',
    causeAreas: ['global-catastrophic-risks'],
    leverageNote: 'AI-veiligheidsonderzoek gericht op het robuust maken van geavanceerde AI-systemen.',
    recommenderAllowlisted: true,
    watchlistTier: 2,
  },
  {
    id: 'kairos-project',
    name: 'Kairos',
    ats: 'ashby',
    atsToken: 'kairos-project',
    causeAreas: ['global-catastrophic-risks'],
    leverageNote: 'AI-veiligheidsfellowship en onderzoeksincubator.',
    recommenderAllowlisted: true,
    watchlistTier: 3,
    verify: true,
  },
  {
    id: 'givewell',
    name: 'GiveWell',
    website: 'https://www.givewell.org',
    ats: 'greenhouse',
    atsToken: 'givewell',
    causeAreas: ['global-health-wellbeing'],
    leverageNote:
      'De meest rigoureuze evaluator van kosteneffectieve armoedebestrijding; stuurt honderden miljoenen dollars aan donaties per jaar.',
    recommenderAllowlisted: true,
    watchlistTier: 3,
    notes:
      'GiveWell’s general remote-work policy is US/UK/Canada-restricted, so most roles will fail nlEligible regardless of this flag — kept in because the specific listing that surfaced this org already passed 80k’s NL-eligible facet filter.',
  },
  {
    id: 'coefficient-giving',
    name: 'Coefficient Giving',
    ats: 'ashby',
    atsToken: 'coefficientgiving',
    causeAreas: [],
    leverageNote:
      'Voorheen Open Philanthropy — een van de grootste grantmakers over meerdere probleemgebieden in de EA-ruimte.',
    recommenderAllowlisted: true,
    watchlistTier: 2,
    notes: 'Renamed from Open Philanthropy; verify the rename and current scope before publishing copy.',
    verify: true,
  },
  {
    id: 'future-of-life-institute',
    name: 'Future of Life Institute',
    website: 'https://futureoflife.org',
    ats: 'lever',
    atsToken: 'futureof-life',
    causeAreas: ['global-catastrophic-risks'],
    leverageNote: 'AI-veiligheidsbeleid en bestaansrisico-onderzoek; onder meer bekend van de AI-pauzebrief.',
    recommenderAllowlisted: true,
    watchlistTier: 2,
    notes:
      '80k also surfaced "Center for AI Risk Management and Alignment" under the same Lever token (futureof-life) — likely the same org under two names in 80k’s data. Not added as a separate employer to avoid double-polling the identical board.',
  },
  {
    id: 'futuresearch',
    name: 'FutureSearch',
    ats: 'workable',
    atsToken: 'futuresearch',
    causeAreas: ['global-catastrophic-risks'],
    leverageNote: 'Bouwt AI-ondersteunde voorspellingstools voor beleidsrelevante vragen.',
    recommenderAllowlisted: true,
    watchlistTier: 3,
    verify: true,
  },
  {
    id: 'gray-swan-ai',
    name: 'Gray Swan AI',
    ats: 'ashby',
    atsToken: 'Gray Swan AI',
    causeAreas: ['global-catastrophic-risks'],
    leverageNote: 'Red-teaming en evaluatie van AI-modellen op veiligheidsrisico’s.',
    recommenderAllowlisted: true,
    watchlistTier: 3,
    verify: true,
  },
  {
    id: 'deep-science-ventures',
    name: 'Deep Science Ventures',
    ats: 'workable',
    atsToken: 'deep-science-ventures',
    causeAreas: [],
    leverageNote: 'Wetenschappelijke venture builder; scope per project verifiëren voor publicatie.',
    recommenderAllowlisted: true,
    watchlistTier: 3,
    notes: 'Cause relevance varies by active project — verify before publishing any listing from here.',
    verify: true,
  },
  {
    id: 'metr',
    name: 'METR (Model Evaluation and Threat Research)',
    website: 'https://metr.org',
    ats: 'lever',
    atsToken: 'metr',
    causeAreas: ['global-catastrophic-risks'],
    leverageNote:
      'Evalueert vooraanstaande AI-modellen op gevaarlijke capaciteiten voordat ze worden uitgebracht.',
    recommenderAllowlisted: true,
    watchlistTier: 2,
  },
  {
    id: 'valthos',
    name: 'Valthos',
    ats: 'ashby',
    atsToken: 'valthos',
    causeAreas: ['global-catastrophic-risks'],
    leverageNote: 'Scope onbevestigd — verifiëren voor publicatie.',
    recommenderAllowlisted: true,
    watchlistTier: 3,
    notes: 'Org focus unconfirmed at seed time — verify before publishing any listing from here.',
    verify: true,
  },
  {
    id: 'mercy-for-animals',
    name: 'Mercy For Animals',
    website: 'https://mercyforanimals.org',
    ats: 'greenhouse',
    atsToken: 'mercyforanimals',
    causeAreas: ['farmed-animal-welfare'],
    leverageNote: 'Internationale organisatie voor dierenwelzijnscampagnes en beleidswerk in de veehouderij.',
    recommenderAllowlisted: true,
    watchlistTier: 2,
  },

  // -------------------------------------------------------------------------
  // Actual evaluator-RECOMMENDED charities/grantees (August 2026) — as opposed
  // to the evaluators themselves, added earlier. This is what priority 1 in
  // the board's stated ordering actually means: any job at an org GiveWell,
  // ACE, Founders Pledge, HLI or TLYCS recommend, not just at the evaluator.
  // Climate-focused Founders Pledge recommendations (Clean Air Task Force,
  // TerraPraxis, Carbon180) are deliberately excluded — out of scope entirely.
  // Compiled by cross-referencing each evaluator's current public
  // recommendation list against the ATS adapters this pipeline already
  // supports; several boutique ATSes (TrinetHire, Getro, Flair.hr, IRIS/
  // Networx, SAP SuccessFactors, JazzHR) were found but aren't wired here —
  // no adapter exists for them yet.
  // -------------------------------------------------------------------------
  {
    id: 'centre-for-effective-altruism',
    name: 'Centre for Effective Altruism',
    website: 'https://www.centreforeffectivealtruism.org',
    ats: 'ashby',
    atsToken: 'centreforeffectivealtruism',
    causeAreas: [],
    leverageNote: 'De organisatorische kern van de EA-beweging — gemeenschapsopbouw, evenementen en infrastructuur.',
    recommenderAllowlisted: true,
    watchlistTier: 2,
    notes: 'Meta/field-building — spans all cause areas rather than one.',
  },
  {
    id: 'new-incentives',
    name: 'New Incentives',
    website: 'https://www.newincentives.org',
    ats: 'breezy',
    atsToken: 'new-incentives',
    causeAreas: ['global-health-wellbeing'],
    leverageNote: 'GiveWell top charity — conditionele geldoverdrachten om vaccinatiegraad bij kinderen in Noord-Nigeria te verhogen.',
    recommenderAllowlisted: true,
    watchlistTier: 2,
  },
  {
    id: 'animal-welfare-observatory',
    name: 'Animal Welfare Observatory',
    ats: 'personio',
    atsToken: 'observatoriodebienestaranimal',
    causeAreas: ['farmed-animal-welfare'],
    leverageNote: 'Door ACE aanbevolen organisatie voor dierenwelzijnsbeleid.',
    recommenderAllowlisted: true,
    watchlistTier: 3,
    notes: 'Personio tenant TLD unconfirmed as .com — verify before relying on this source.',
    verify: true,
  },
  {
    id: 'the-humane-league',
    name: 'The Humane League',
    website: 'https://thehumaneleague.org',
    ats: 'greenhouse',
    atsToken: 'thltestcareers',
    causeAreas: ['farmed-animal-welfare'],
    leverageNote: 'Door ACE aanbevolen organisatie voor campagnes tegen kooihuisvesting van legkippen.',
    recommenderAllowlisted: true,
    watchlistTier: 2,
    notes: 'Greenhouse token name ("thltestcareers") reads like a stale test board — verify it still reflects live postings.',
    verify: true,
  },
  {
    id: 'givedirectly',
    name: 'GiveDirectly',
    website: 'https://www.givedirectly.org',
    ats: 'greenhouse',
    atsToken: 'givedirectly',
    causeAreas: ['global-health-wellbeing'],
    leverageNote: 'Directe, onvoorwaardelijke geldoverdrachten aan mensen in extreme armoede — aanbevolen door meerdere evaluatoren.',
    recommenderAllowlisted: true,
    watchlistTier: 2,
  },
  {
    id: 'building-tomorrow',
    name: 'Building Tomorrow',
    ats: 'breezy',
    atsToken: 'building-tomorrow',
    causeAreas: ['global-health-wellbeing'],
    leverageNote: 'Door The Life You Can Save aanbevolen organisatie voor toegang tot onderwijs in Oeganda.',
    recommenderAllowlisted: true,
    watchlistTier: 3,
  },
  {
    id: 'development-media-international',
    name: 'Development Media International',
    ats: 'bamboohr',
    atsToken: 'developmentmedia',
    causeAreas: ['global-health-wellbeing'],
    leverageNote: 'Gebruikt massamedia om gedragsverandering te stimuleren die kindersterfte in lage-inkomenslanden vermindert.',
    recommenderAllowlisted: true,
    watchlistTier: 3,
    notes: 'ATS fetch returned 403 during verification (likely bot-blocked) — confirm before relying on this source.',
    verify: true,
  },
  {
    id: 'eidu',
    name: 'EIDU',
    ats: 'personio',
    atsToken: 'eidu',
    causeAreas: ['global-health-wellbeing'],
    leverageNote: 'Door The Life You Can Save aanbevolen edtech-organisatie voor vroegschools leren in lage-inkomenslanden.',
    recommenderAllowlisted: true,
    watchlistTier: 3,
  },
  {
    id: 'evidence-action',
    name: 'Evidence Action',
    website: 'https://www.evidenceaction.org',
    ats: 'workable',
    atsToken: 'evidence-action',
    causeAreas: ['global-health-wellbeing'],
    leverageNote: 'Schaalt bewezen kosteneffectieve interventies zoals waterzuivering en ontworming naar miljoenen mensen.',
    recommenderAllowlisted: true,
    watchlistTier: 2,
  },
  {
    id: 'luminos-fund',
    name: 'The Luminos Fund',
    ats: 'breezy',
    atsToken: 'the-luminos-fund',
    causeAreas: ['global-health-wellbeing'],
    leverageNote: 'Versneld basisonderwijs voor kinderen die geen school hebben kunnen volgen, in West-Afrika en het Midden-Oosten.',
    recommenderAllowlisted: true,
    watchlistTier: 3,
  },
  {
    id: 'raising-the-village',
    name: 'Raising The Village',
    ats: 'breezy',
    atsToken: 'raisingthevillage',
    causeAreas: ['global-health-wellbeing'],
    leverageNote: 'Programma’s tegen extreme armoede op het Afrikaanse platteland, aanbevolen door The Life You Can Save.',
    recommenderAllowlisted: true,
    watchlistTier: 3,
  },
  {
    id: 'strongminds',
    name: 'StrongMinds',
    website: 'https://strongminds.org',
    ats: 'bamboohr',
    atsToken: 'strongminds',
    causeAreas: ['global-health-wellbeing'],
    leverageNote: 'Happier Lives Institute-topaanbeveling — groepstherapie tegen depressie op schaal in Afrika.',
    recommenderAllowlisted: true,
    watchlistTier: 2,
  },
  {
    id: 'good-food-institute',
    name: 'The Good Food Institute',
    website: 'https://gfi.org',
    ats: 'greenhouse',
    atsToken: 'thegoodfoodinstitute80',
    causeAreas: ['farmed-animal-welfare'],
    leverageNote: 'Onderzoek en beleid voor de eiwittransitie — kweekvlees, fermentatie en plantaardige alternatieven.',
    recommenderAllowlisted: true,
    watchlistTier: 2,
  },
  {
    id: 'securebio',
    name: 'SecureBio',
    website: 'https://securebio.org',
    ats: 'ashby',
    atsToken: 'securebio',
    causeAreas: ['global-catastrophic-risks'],
    leverageNote: 'Door Founders Pledge aanbevolen organisatie voor biosecurity — technische verdediging tegen pandemische dreigingen.',
    recommenderAllowlisted: true,
    watchlistTier: 2,
  },
]

/**
 * Domain → watchlist employer, derived from the seed list rather than
 * maintained separately.
 *
 * Used by the Partos adapter to identify which member organisation a vacancy
 * actually belongs to, so the listing inherits that employer's durable leverage
 * note and gate flags instead of arriving anonymous.
 */
export function employerDomainMap(): Record<string, { id: string; name: string }> {
  const map: Record<string, { id: string; name: string }> = {}
  for (const e of SEED_EMPLOYERS) {
    for (const url of [e.website, e.careersUrl]) {
      if (!url) continue
      try {
        const host = new URL(url).hostname.replace(/^www\./, '')
        // Never let a careers subdomain overwrite a more specific mapping.
        map[host] ??= { id: e.id, name: e.name }
      } catch {
        /* skip malformed seed URLs */
      }
    }
  }
  return map
}

/**
 * Sources to create alongside the watchlist. Everything the spec names, with the
 * config each adapter needs.
 */
export type SeedSource = {
  id: string
  kind: 'ats' | 'gov-api' | 'crawl' | 'ea-board' | 'manual'
  adapter: string
  employerId?: string
  config?: Record<string, unknown>
  /** Only true where the source returns a complete set on every run (§7.8). */
  returnsCompleteSet: boolean
  enabled?: boolean
  notes?: string
}

/** Organisation codes on werkenvoornederland, from the slug suffix. */
const WVN_ALWAYS_INCLUDE = ['RIVM', 'AP', 'RDI', 'EZK', 'VWS', 'BZ']
const WVN_KEYWORD_GATED = ['BZK', 'JENV', 'DEF', 'IENW', 'LNV', 'OCW', 'FIN', 'AZ']
const WVN_KEYWORDS = [
  'algoritme',
  'artificiele intelligentie',
  'kunstmatige intelligentie',
  ' ai ',
  'ai-',
  'digitale',
  'data',
  'toezicht',
  'pandemie',
  'infectieziekte',
  'biosecurity',
  'bioveiligheid',
  'zoonose',
  'nucleair',
  'non-proliferatie',
  'ontwikkelingssamenwerking',
  'mondiale gezondheid',
  'dierenwelzijn',
  'eiwittransitie',
  'biotechnologie',
]

export const SEED_SOURCES: SeedSource[] = [
  // ---- The most important single source (§7.3) ----
  {
    id: 'wvn-sitemap',
    kind: 'crawl',
    adapter: 'wvn-sitemap',
    returnsCompleteSet: true,
    config: {
      sitemapUrl: 'https://www.werkenvoornederland.nl/sitemap-vacatures.xml',
      alwaysIncludeOrgs: WVN_ALWAYS_INCLUDE,
      keywordGatedOrgs: WVN_KEYWORD_GATED,
      keywords: WVN_KEYWORDS,
      orgNames: {
        RIVM: 'RIVM',
        AP: 'Autoriteit Persoonsgegevens',
        RDI: 'Rijksinspectie Digitale Infrastructuur',
        EZK: 'Ministerie van Economische Zaken en Klimaat',
        VWS: 'Ministerie van Volksgezondheid, Welzijn en Sport',
        BZ: 'Ministerie van Buitenlandse Zaken',
        BZK: 'Ministerie van Binnenlandse Zaken en Koninkrijksrelaties',
        JENV: 'Ministerie van Justitie en Veiligheid',
        DEF: 'Ministerie van Defensie',
        IENW: 'Ministerie van Infrastructuur en Waterstaat',
        LNV: 'Ministerie van Landbouw, Natuur en Voedselkwaliteit',
      },
      employerIdByOrg: {
        RIVM: 'rivm',
        AP: 'autoriteit-persoonsgegevens',
        RDI: 'rijksinspectie-digitale-infrastructuur',
        EZK: 'ministerie-ezk',
        VWS: 'ministerie-vws',
        BZ: 'ministerie-buitenlandse-zaken-dgis',
      },
    },
    notes:
      'The sitemap crawl is built regardless of CSO API credentials because it de-risks the whole source. robots.txt permits 10 req/s and the data is CC-0.',
  },
  {
    id: 'cso-api',
    kind: 'gov-api',
    adapter: 'cso-api',
    returnsCompleteSet: true,
    // Disabled until credentials arrive; the adapter also self-disables.
    enabled: false,
    config: { baseUrl: 'https://api.cso20.net/v1/JobAPI/', pageSize: 100 },
    notes:
      'M0 lead-time item with no self-service signup: email helpdesk@werkenvoornederland.nl or call +31 70 7000510. Also confirm the read API is still supported — the apis.developer.overheid.nl register entry now returns "API niet gevonden".',
  },

  // ---- Academic (§7.4) ----
  {
    id: 'academictransfer',
    kind: 'crawl',
    adapter: 'academictransfer',
    // A budgeted incremental crawl never returns the complete set, so it must
    // not drive set-difference closure detection.
    returnsCompleteSet: false,
    config: {
      listingUrl: 'https://www.academictransfer.com/en/jobs/',
      maxDetailFetches: 25,
      maxIndexPages: 6,
    },
    notes:
      'Crawl-delay: 10 is honoured centrally in lib/http.ts. A full crawl would take ~90 minutes, so this walks the index and fetches only new numeric IDs, 25 per run.',
  },
  {
    id: 'euraxess',
    kind: 'crawl',
    adapter: 'euraxess',
    returnsCompleteSet: false,
    enabled: false,
    config: {},
    notes:
      'M0 investigation: check euraxess.ec.europa.eu/sites/default/files/exports/ for a full jobs export. If one exists it may replace the AcademicTransfer crawl entirely. Set config.exportUrl and enable.',
  },

  // ---- Sector feed (§7.5) ----
  {
    id: 'partos',
    kind: 'crawl',
    adapter: 'partos',
    // Deliberately NOT employerId: 'partos'. Partos is a trade association, so
    // the employer is the member organisation the vacancy links out to — the
    // adapter resolves it from that outbound domain.
    returnsCompleteSet: true,
    config: {
      indexUrl: 'https://www.partos.nl/vacatures/',
      domainToEmployer: employerDomainMap(),
    },
    notes:
      'No JSON-LD on their vacancy pages (verified), so the HTML parser is the real path. Not effectiveness-filtered, so lean on the classifier. Email Partos before launch for an explicit arrangement (§10).',
  },

  // ---- The EA boards, primarily as discovery sources (§7.6) ----
  {
    id: '80000hours',
    kind: 'ea-board',
    adapter: '80000hours',
    returnsCompleteSet: true,
    config: {
      boardUrl: 'https://jobs.80000hours.org/',
      // Read live from the page on every run; this is only the last-known
      // fallback if the page shape changes.
      fallback: { appId: 'W6KM1UDIB3', apiKey: '', index: 'jobs_prod' },
    },
    notes:
      'Also a real listings source (not just discovery, revised August 2026): the facet filter already covers remote-Europe/remote-global roles, which is most of what makes an 80k-featured organisation NL-accessible even with no physical NL presence. Email them before launch (§10).',
  },
  {
    id: 'probablygood',
    kind: 'ea-board',
    adapter: 'probablygood',
    returnsCompleteSet: true,
    config: { graphqlUrl: 'https://backend.jobs.probablygood.org/api/graphql' },
    notes:
      'Hitting Algolia spends Probably Good’s paid search quota: poll at most daily. Email them before launch (§10).',
  },

  // ---- ATS sources for watchlist employers with a known public feed ----
  {
    id: 'jsonld:mosa-meat',
    kind: 'crawl',
    adapter: 'jsonld-careers',
    employerId: 'mosa-meat',
    returnsCompleteSet: false,
    config: {
      indexUrl: 'https://careers.mosameat.com/',
      linkPattern: 'href="(https://careers\\.mosameat\\.com/[^"#?]+)"',
      employerId: 'mosa-meat',
      employerName: 'Mosa Meat',
    },
    notes:
      'Homerun has no public feed — every endpoint needs a Bearer token — so this reads JobPosting markup from the career page instead (§7.2).',
  },
  {
    id: 'teamtailor:founders-pledge',
    kind: 'ats',
    adapter: 'teamtailor',
    employerId: 'founders-pledge',
    returnsCompleteSet: true,
    config: { host: 'founderspledge.teamtailor.com' },
  },

  // ---- Discovered via 80,000 Hours (August 2026) — see the employer entries
  // above for the trusted-recommendation rationale. "Gray Swan AI" is
  // deliberately not wired: its detected Ashby token contained spaces, which
  // is not a valid board-name slug — needs a manual check of the real URL. ----
  {
    id: 'lever:epoch-ai',
    kind: 'ats',
    adapter: 'lever',
    employerId: 'epoch-ai',
    returnsCompleteSet: true,
    config: { site: 'epoch-ai' },
  },
  {
    id: 'ashby:80000hours',
    kind: 'ats',
    adapter: 'ashby',
    employerId: 'eighty-thousand-hours',
    returnsCompleteSet: true,
    config: { boardName: '80000hours' },
  },
  {
    id: 'ashby:far-ai',
    kind: 'ats',
    adapter: 'ashby',
    employerId: 'far-ai',
    returnsCompleteSet: true,
    config: { boardName: 'far.ai' },
  },
  {
    id: 'ashby:kairos-project',
    kind: 'ats',
    adapter: 'ashby',
    employerId: 'kairos-project',
    returnsCompleteSet: true,
    config: { boardName: 'kairos-project' },
  },
  {
    id: 'greenhouse:givewell',
    kind: 'ats',
    adapter: 'greenhouse',
    employerId: 'givewell',
    returnsCompleteSet: true,
    config: { token: 'givewell' },
  },
  {
    id: 'ashby:coefficientgiving',
    kind: 'ats',
    adapter: 'ashby',
    employerId: 'coefficient-giving',
    returnsCompleteSet: true,
    config: { boardName: 'coefficientgiving' },
  },
  {
    id: 'lever:futureof-life',
    kind: 'ats',
    adapter: 'lever',
    employerId: 'future-of-life-institute',
    returnsCompleteSet: true,
    config: { site: 'futureof-life' },
  },
  {
    id: 'workable:futuresearch',
    kind: 'ats',
    adapter: 'workable',
    employerId: 'futuresearch',
    returnsCompleteSet: true,
    config: { account: 'futuresearch' },
  },
  {
    id: 'workable:deep-science-ventures',
    kind: 'ats',
    adapter: 'workable',
    employerId: 'deep-science-ventures',
    returnsCompleteSet: true,
    config: { account: 'deep-science-ventures' },
  },
  {
    id: 'lever:metr',
    kind: 'ats',
    adapter: 'lever',
    employerId: 'metr',
    returnsCompleteSet: true,
    config: { site: 'metr' },
  },
  {
    id: 'ashby:valthos',
    kind: 'ats',
    adapter: 'ashby',
    employerId: 'valthos',
    returnsCompleteSet: true,
    config: { boardName: 'valthos' },
  },
  {
    id: 'greenhouse:mercyforanimals',
    kind: 'ats',
    adapter: 'greenhouse',
    employerId: 'mercy-for-animals',
    returnsCompleteSet: true,
    config: { token: 'mercyforanimals' },
  },

  // ---- Evaluator-recommended charities/grantees (August 2026) ----
  {
    id: 'ashby:centreforeffectivealtruism',
    kind: 'ats',
    adapter: 'ashby',
    employerId: 'centre-for-effective-altruism',
    returnsCompleteSet: true,
    config: { boardName: 'centreforeffectivealtruism' },
  },
  {
    id: 'breezy:new-incentives',
    kind: 'ats',
    adapter: 'breezy',
    employerId: 'new-incentives',
    returnsCompleteSet: true,
    config: { company: 'new-incentives' },
  },
  {
    id: 'personio:observatoriodebienestaranimal',
    kind: 'ats',
    adapter: 'personio',
    employerId: 'animal-welfare-observatory',
    returnsCompleteSet: true,
    config: { tenant: 'observatoriodebienestaranimal', tld: 'com' },
  },
  {
    id: 'greenhouse:thltestcareers',
    kind: 'ats',
    adapter: 'greenhouse',
    employerId: 'the-humane-league',
    returnsCompleteSet: true,
    config: { token: 'thltestcareers' },
  },
  {
    id: 'greenhouse:givedirectly',
    kind: 'ats',
    adapter: 'greenhouse',
    employerId: 'givedirectly',
    returnsCompleteSet: true,
    config: { token: 'givedirectly' },
  },
  {
    id: 'breezy:building-tomorrow',
    kind: 'ats',
    adapter: 'breezy',
    employerId: 'building-tomorrow',
    returnsCompleteSet: true,
    config: { company: 'building-tomorrow' },
  },
  {
    id: 'bamboohr:developmentmedia',
    kind: 'ats',
    adapter: 'bamboohr',
    employerId: 'development-media-international',
    returnsCompleteSet: true,
    config: { company: 'developmentmedia' },
  },
  {
    id: 'personio:eidu',
    kind: 'ats',
    adapter: 'personio',
    employerId: 'eidu',
    returnsCompleteSet: true,
    config: { tenant: 'eidu', tld: 'com' },
  },
  {
    id: 'workable:evidence-action',
    kind: 'ats',
    adapter: 'workable',
    employerId: 'evidence-action',
    returnsCompleteSet: true,
    config: { account: 'evidence-action' },
  },
  {
    id: 'breezy:the-luminos-fund',
    kind: 'ats',
    adapter: 'breezy',
    employerId: 'luminos-fund',
    returnsCompleteSet: true,
    config: { company: 'the-luminos-fund' },
  },
  {
    id: 'breezy:raisingthevillage',
    kind: 'ats',
    adapter: 'breezy',
    employerId: 'raising-the-village',
    returnsCompleteSet: true,
    config: { company: 'raisingthevillage' },
  },
  {
    id: 'bamboohr:strongminds',
    kind: 'ats',
    adapter: 'bamboohr',
    employerId: 'strongminds',
    returnsCompleteSet: true,
    config: { company: 'strongminds' },
  },
  {
    id: 'greenhouse:thegoodfoodinstitute80',
    kind: 'ats',
    adapter: 'greenhouse',
    employerId: 'good-food-institute',
    returnsCompleteSet: true,
    config: { token: 'thegoodfoodinstitute80' },
  },
  {
    id: 'ashby:securebio',
    kind: 'ats',
    adapter: 'ashby',
    employerId: 'securebio',
    returnsCompleteSet: true,
    config: { boardName: 'securebio' },
  },
]
