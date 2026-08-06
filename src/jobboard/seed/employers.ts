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
  givingGreenListed?: boolean
  e2gAllowlisted?: boolean
  e2gSalaryPresumed?: boolean
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
    causeAreas: ['animal-welfare-alt-protein'],
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
    causeAreas: ['animal-welfare-alt-protein'],
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
    causeAreas: ['animal-welfare-alt-protein', 'climate'],
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
    causeAreas: ['animal-welfare-alt-protein'],
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
    causeAreas: ['animal-welfare-alt-protein'],
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
    causeAreas: ['animal-welfare-alt-protein'],
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
    causeAreas: ['animal-welfare-alt-protein', 'biosecurity-pandemics'],
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
    causeAreas: ['animal-welfare-alt-protein'],
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
    causeAreas: ['animal-welfare-alt-protein'],
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
    causeAreas: ['animal-welfare-alt-protein'],
    leverageNote: 'Voedingsverandering, bedrijvenaanpak en institutionele catering.',
    watchlistTier: 2,
  },
  {
    id: 'world-animal-protection-nl',
    name: 'World Animal Protection Nederland',
    website: 'https://www.worldanimalprotection.nl',
    careersUrl: 'https://www.worldanimalprotection.nl/over-ons/vacatures',
    ats: null,
    causeAreas: ['animal-welfare-alt-protein'],
    watchlistTier: 3,
  },
  {
    id: 'good-food-institute-europe',
    name: 'Good Food Institute Europe',
    website: 'https://gfieurope.org',
    careersUrl: 'https://gfi.org/careers',
    ats: null,
    causeAreas: ['animal-welfare-alt-protein', 'climate'],
    leverageNote:
      'Niet in Nederland gevestigd, maar plaatst regelmatig thuiswerkfuncties die openstaan voor mensen in Nederland.',
    // Qualifies on both the climate and biodiversity Giving Green tracks.
    givingGreenListed: true,
    watchlistTier: 2,
  },
  {
    id: 'green-protein-alliance',
    name: 'Green Protein Alliance / Transitiecoalitie Voedsel',
    ats: null,
    causeAreas: ['animal-welfare-alt-protein'],
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
    causeAreas: ['ai-safety-governance'],
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
    causeAreas: ['ai-safety-governance'],
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
    causeAreas: ['ai-safety-governance'],
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
    causeAreas: ['ai-safety-governance', 'biosecurity-pandemics'],
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
    causeAreas: ['ai-safety-governance'],
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
    causeAreas: ['ai-safety-governance'],
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
    causeAreas: ['ai-safety-governance'],
    leverageNote: 'Werkt aan zinvolle menselijke controle over autonome systemen.',
    watchlistTier: 2,
  },
  {
    id: 'sectorale-ai-toezichthouders',
    name: 'AFM, DNB, IGJ en Inspectie van het Onderwijs',
    careersUrl: 'https://www.werkenvoornederland.nl',
    ats: null,
    causeAreas: ['ai-safety-governance'],
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
    causeAreas: ['ai-safety-governance'],
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
    causeAreas: ['ai-safety-governance'],
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
    causeAreas: ['career-capital'],
    leverageNote:
      'Enige producent van EUV-lithografie — het knelpunt in de toeleveringsketen voor AI-rekenkracht. Een gewone commerciële baan, maar verdedigbaar loopbaankapitaal voor wie richting compute governance wil.',
    watchlistTier: 3,
  },
  {
    id: 'existential-risk-observatory',
    name: 'Existential Risk Observatory',
    city: 'Amsterdam',
    ats: null,
    causeAreas: ['global-catastrophic-risk', 'ai-safety-governance'],
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
    causeAreas: ['biosecurity-pandemics'],
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
    causeAreas: ['biosecurity-pandemics'],
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
    causeAreas: ['biosecurity-pandemics', 'global-health-development'],
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
    causeAreas: ['biosecurity-pandemics'],
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
    causeAreas: ['biosecurity-pandemics'],
    leverageNote: 'Voert het programma pandemische paraatheid uit.',
    watchlistTier: 2,
  },
  {
    id: 'pandemic-disaster-preparedness-center',
    name: 'Pandemic & Disaster Preparedness Center',
    city: 'Rotterdam / Delft',
    ats: null,
    causeAreas: ['biosecurity-pandemics'],
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
    causeAreas: ['global-health-development'],
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
    causeAreas: ['global-health-development'],
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
    causeAreas: ['global-health-development'],
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
    causeAreas: ['global-health-development'],
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
    causeAreas: ['global-health-development'],
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
    causeAreas: ['global-health-development'],
    watchlistTier: 3,
  },
  {
    id: 'wateraid-nederland',
    name: 'WaterAid Nederland',
    website: 'https://www.wateraid.org/nl',
    ats: null,
    causeAreas: ['global-health-development'],
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
    causeAreas: ['global-health-development'],
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
    causeAreas: ['effective-giving-meta'],
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
    causeAreas: ['effective-giving-meta'],
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
    causeAreas: ['effective-giving-meta'],
    leverageNote: 'De subsidiërende arm van de Nederlandse goededoelenloterijen.',
    watchlistTier: 2,
  },
  {
    id: 'goldschmeding-foundation',
    name: 'Goldschmeding Foundation',
    website: 'https://goldschmeding.foundation',
    careersUrl: 'https://goldschmeding.foundation/vacatures',
    ats: null,
    causeAreas: ['effective-giving-meta'],
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
    causeAreas: ['effective-giving-meta'],
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
    causeAreas: ['effective-giving-meta'],
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
    causeAreas: ['effective-giving-meta'],
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
    causeAreas: ['effective-giving-meta'],
    watchlistTier: 3,
    active: false,
    notes:
      'Active, but its visible 2026 pipeline is Dutch arts and museum education; historically EA-adjacent programmes were not visible. Verify relevance before including.',
    verify: true,
  },

  // -------------------------------------------------------------------------
  // Climate and biodiversity — ALLOWLIST ONLY (§5.1)
  //
  // An employer qualifies only by appearing on one of Giving Green's two
  // recommendation tracks. Most are US-based and will never produce a Dutch
  // role — that is fine; the gate costs nothing to maintain and the few that do
  // produce European roles are worth catching.
  //
  // RUNBOOK: re-check both tracks when a new cycle publishes and update
  // giving_green_listed. The biodiversity track is new as of 2026 and likely to
  // expand. An allowlist nobody refreshes becomes a wrong allowlist.
  // -------------------------------------------------------------------------
  {
    id: 'wetlands-international',
    name: 'Wetlands International',
    city: 'Ede',
    website: 'https://www.wetlands.org',
    careersUrl: 'https://www.wetlands.org/vacancies',
    ats: null,
    causeAreas: ['climate'],
    leverageNote:
      'De sterkste naam op beide Giving Green-lijsten voor dit publiek: Nederlands hoofdkantoor, neemt lokaal aan in Ede-Wageningen, en benoemd als Top Biodiversity Nonprofit in de cyclus van 2026. Wetlands dragen tot 40% van alle soorten op 10% van het landoppervlak — dat is het argument in één zin.',
    givingGreenListed: true,
    watchlistTier: 1,
  },
  {
    id: 'clean-air-task-force',
    name: 'Clean Air Task Force',
    website: 'https://www.catf.us',
    careersUrl: 'https://www.catf.us/careers',
    ats: 'breezy',
    atsToken: 'clean-air-task-force',
    causeAreas: ['climate'],
    leverageNote:
      'Neemt aantoonbaar in Europa aan, Amsterdam inbegrepen — er stond ten minste één directeursfunctie open voor "Brussel, Berlijn of Amsterdam" — en plaatst veel functies als Remote (Europa).',
    givingGreenListed: true,
    watchlistTier: 2,
  },
  {
    id: 'future-cleantech-architects',
    name: 'Future Cleantech Architects',
    website: 'https://fcarchitects.org',
    careersUrl: 'https://fcarchitects.org/we-are-hiring',
    ats: null,
    causeAreas: ['climate'],
    leverageNote:
      'Heeft Nederlandse senior medewerkers en heeft direct met het Nederlandse EA-ecosysteem opgetrokken, onder meer als spreker bij de Tien Procent Club in Rotterdam.',
    givingGreenListed: true,
    watchlistTier: 2,
    notes:
      'Their public team page lists Germany, Brussels and Geneva without individual NL locations, so do not rely on the site to identify Dutch roles — treat FCA as NL-relevant by default. Appendix B asks EA NL to confirm Magnolia Tovar’s location and role.',
    verify: true,
  },
  {
    id: 'opportunity-green',
    name: 'Opportunity Green',
    website: 'https://www.opportunitygreen.org',
    ats: null,
    causeAreas: ['climate'],
    givingGreenListed: true,
    watchlistTier: 3,
    active: false,
    notes: 'Allowlisted; NL presence unverified and probably nil.',
  },
  {
    id: 'project-innerspace',
    name: 'Project InnerSpace',
    website: 'https://www.projectinnerspace.org',
    ats: null,
    causeAreas: ['climate'],
    givingGreenListed: true,
    watchlistTier: 3,
    active: false,
    notes: 'Allowlisted; NL presence unverified and probably nil.',
  },

  // -------------------------------------------------------------------------
  // Global catastrophic risk and international security
  //
  // The Hague's concentration of international institutions is the
  // Netherlands' most distinctive GCR asset.
  // -------------------------------------------------------------------------
  {
    id: 'opcw',
    name: 'OPCW',
    city: 'Den Haag',
    website: 'https://www.opcw.org',
    careersUrl: 'https://jobs.opcw.org',
    ats: null,
    causeAreas: ['global-catastrophic-risk'],
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
    causeAreas: ['global-catastrophic-risk'],
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
    causeAreas: ['global-catastrophic-risk', 'ai-safety-governance'],
    leverageNote:
      'Een van de weinige Europese denktanks die strategische studies en opkomende technologie echt verbindt.',
    watchlistTier: 2,
  },
  {
    id: 'den-haag-international-institutions',
    name: 'ICC, ICJ, Europol en Eurojust',
    city: 'Den Haag',
    ats: null,
    causeAreas: ['global-catastrophic-risk'],
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
      'Treat as a discovery source for the watchlist more than a listings source: none of 80k’s 53 featured organisations are Netherlands-based. Email them before launch (§10).',
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
    id: 'breezy:clean-air-task-force',
    kind: 'ats',
    adapter: 'breezy',
    employerId: 'clean-air-task-force',
    returnsCompleteSet: true,
    config: {
      company: 'clean-air-task-force',
      employerId: 'clean-air-task-force',
      employerName: 'Clean Air Task Force',
    },
  },
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
]
