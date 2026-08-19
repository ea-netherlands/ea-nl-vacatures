/**
 * The taxonomy — spec §5, revised August 2026.
 *
 * Two orthogonal axes (cause area, leverage archetype) plus the practical
 * eligibility fields that make the board usable in a Dutch context.
 *
 * This module is the single source of truth for the controlled vocabularies.
 * The Sanity schemas, the classifier's structured-output schema, the filter
 * UI and the interface translations all derive their option lists from here,
 * so a vocabulary change cannot drift between layers.
 *
 * ## What changed, and why it matters if you are reading this later
 *
 * The cause axis was eight categories and is now four: the board presents the
 * same carve-up of the problem space that the rest of the field has converged
 * on. Three consequences worth knowing before you change anything:
 *
 * 1. `climate` is no longer a cause area *at all* — not gated, not allowlisted,
 *    simply out of scope, with a referral to Effective Environmentalism. See
 *    `EXCLUDED_TOPICS` below. The old Giving Green allowlist gate is gone with
 *    it; the earning-to-give gate is untouched.
 * 2. `effective-giving-meta` and `career-capital` are no longer cause areas.
 *    Meta work is categorised by the problem it serves, and "this is a stepping
 *    stone" is a statement about leverage, not about a problem — so it lives on
 *    the leverage axis, where it always belonged.
 * 3. AI work now splits across two areas rather than having one of its own.
 *    `global-catastrophic-risks` takes the failure modes that end in
 *    catastrophe; `better-futures` takes the ones where humanity survives and
 *    the outcome is still bad. That split is a real judgement call on some
 *    listings, which is why `secondaryCauses` exists — see the prompt.
 */

// ---------------------------------------------------------------------------
// Axis one — cause area (§5.1)
// ---------------------------------------------------------------------------

export const CAUSE_AREAS = [
  'global-health-wellbeing',
  'farmed-animal-welfare',
  'global-catastrophic-risks',
  'better-futures',
  'movement-building',
] as const

export type CauseArea = (typeof CAUSE_AREAS)[number]

/**
 * No cause area is gated any more. The constant stays because the classifier
 * and the gate module both read it, and because a future contested category
 * should be added here rather than by loosening the classifier's instructions.
 */
export const GATED_CAUSE_AREAS: readonly CauseArea[] = []

/** Cause areas the classifier may choose from without an employer-level gate. */
export const CLASSIFIER_ASSIGNABLE_CAUSES: readonly CauseArea[] = CAUSE_AREAS.filter(
  (c) => !GATED_CAUSE_AREAS.includes(c),
)

export const CAUSE_AREA_DEFINITIONS: Record<CauseArea, string> = {
  'global-health-wellbeing':
    'Health and material welfare of the world’s poorest people, alive today — specifically people living in extreme poverty or in low- and middle-income countries. Global health, development finance, aid policy, health systems in low- and middle-income countries, lead and air quality in poor countries, mental health at scale in the developing world. Explicitly NOT Dutch or European domestic healthcare, welfare, or environmental policy, however well-run or well-intentioned — a role improving the Dutch healthcare system, Dutch elderly care, Dutch social security, or Dutch/EU environmental regulation does not belong here just because it touches "health". Judge by whose welfare the work actually serves.',
  'farmed-animal-welfare':
    'The suffering of animals in food production. Farmed animal advocacy, animal law and enforcement, cultivated meat and fermentation, the protein transition, and the corporate and finance roles that shape all of it. Not general nature or biodiversity work.',
  'global-catastrophic-risks':
    'Events that could kill a very large share of humanity or permanently end its prospects. AI takeover, misalignment and catastrophic misuse; pandemics, biosurveillance and dual-use research governance; nuclear security and great-power conflict.',
  'better-futures':
    'Whether the long-run future goes well *given* that humanity survives. Who holds power over transformative AI and whose values get locked in; the quality and resilience of democratic institutions; the moral circle, including digital minds; space governance. The concern here is not extinction but a surviving world that is much worse than it could have been.',
  'movement-building':
    'Growing the number of people who take these problems seriously and act on them, and the number who give effectively. Community building at the Centre for Effective Altruism, Effectief Altruïsme Nederland, the School for Moral Ambition and equivalents; consumer-facing effective giving at Giving What We Can, Doneer Effectief, the Tien Procent Club. The boundary is deliberately narrow, and three exclusions carry it: (1) it is NOT "any job at an EA organisation" — a researcher at GiveWell or a campaigner at an ACE-recommended charity is filed under the problem their work serves; (2) fundraising or advocacy for a single operating charity\u2019s own programme is that charity\u2019s problem area, not this one; (3) field building aimed at ONE problem belongs to that problem, not here — an AI-safety fellowship, talent pipeline or research incubator such as Kairos is global-catastrophic-risks work, because the field it grows is AI safety rather than the movement as a whole. What lands here is cause-general: the community and the giving infrastructure that serve every problem on the board at once.',
}

/**
 * Sub-areas — a real, stored, filterable field as of August 2026.
 *
 * They used to be descriptive prose for the classifier prompt and the cause
 * pages. They are now first-class, because the four-item cause axis fails at
 * the only moment that matters: almost nobody browsing a job board thinks of
 * themselves as looking for "global catastrophic risks". They look for AI
 * safety, or pandemic preparedness, or nuclear security. The cause area is how
 * we reason about the board; the sub-area is how a reader finds their way into
 * it, so it has to be clickable rather than merely readable.
 *
 * Ids are stable and appear in URLs (`?subarea=ai-safety`). Renaming one is a
 * breaking change to an indexed URL — add a new id instead.
 *
 * Every sub-area belongs to exactly one cause area, so `SUB_AREA_CAUSE` can be
 * derived rather than maintained, and a sub-area filter implies its parent.
 */
export const SUB_AREAS_BY_CAUSE = {
  'global-health-wellbeing': [
    'global-health',
    'development-finance',
    'health-systems',
    'lead-and-air-quality',
    'mental-health',
  ],
  'farmed-animal-welfare': [
    'animal-advocacy',
    'animal-law',
    'alternative-protein',
    'protein-transition-policy',
  ],
  'global-catastrophic-risks': ['ai-safety', 'biosecurity', 'nuclear-security'],
  'better-futures': [
    'ai-governance',
    'democratic-institutions',
    'moral-circle',
    'space-governance',
  ],
  'movement-building': ['community-building', 'effective-giving'],
} as const satisfies Record<CauseArea, readonly string[]>

export const SUB_AREAS = Object.values(SUB_AREAS_BY_CAUSE).flat() as readonly SubArea[]

export type SubArea =
  (typeof SUB_AREAS_BY_CAUSE)[CauseArea][number]

/** Which cause area a sub-area belongs to. Derived, never hand-maintained. */
export const SUB_AREA_CAUSE: Record<SubArea, CauseArea> = Object.fromEntries(
  (Object.entries(SUB_AREAS_BY_CAUSE) as [CauseArea, readonly SubArea[]][]).flatMap(
    ([cause, subs]) => subs.map((sub) => [sub, cause] as const),
  ),
) as Record<SubArea, CauseArea>

/**
 * Definitions used by the classifier. Deliberately concrete: the AI split
 * across `ai-safety` and `ai-governance` is the one boundary the model gets
 * wrong most often, so both entries say what the *other* one takes.
 */
export const SUB_AREA_DEFINITIONS: Record<SubArea, string> = {
  'global-health': 'Infectious disease control, vaccination, nutrition and mortality in low- and middle-income countries.',
  'development-finance': 'Aid budgets, development banks, concessional finance, and the policy that directs them.',
  'health-systems': 'Building and running health systems in low- and middle-income countries.',
  'lead-and-air-quality': 'Lead exposure, indoor and outdoor air quality, and environmental health in poor countries.',
  'mental-health': 'Delivering mental health care at scale in the developing world.',
  'animal-advocacy': 'Corporate campaigns, welfare commitments, and public advocacy for farmed animals.',
  'animal-law': 'Animal law, welfare regulation, inspection and enforcement.',
  'alternative-protein': 'Cultivated meat, precision fermentation and plant-based protein — science, engineering and commercial roles.',
  'protein-transition-policy': 'Policy, subsidy and investment that shapes what protein gets produced.',
  'ai-safety': 'Preventing AI systems from causing catastrophe: alignment, interpretability, evaluations, control, and catastrophic misuse. The failure mode is that things end very badly. Governance work aimed at who *holds power* rather than at catastrophe belongs in ai-governance.',
  'biosecurity': 'Pandemic preparedness, biosurveillance, dual-use research governance, and biological weapons.',
  'nuclear-security': 'Nuclear weapons policy, arms control, escalation risk and great-power conflict.',
  'ai-governance': 'Who ends up holding power over transformative AI and whose values get entrenched: AI regulation, competition and compute policy, standards, auditing regimes. The failure mode is a surviving world that is much worse than it could have been. Work aimed squarely at preventing catastrophe belongs in ai-safety.',
  'democratic-institutions': 'The quality, integrity and resilience of democratic institutions, including information environments.',
  'moral-circle': 'Extending moral consideration — wild animals, invertebrates, digital minds.',
  'space-governance': 'Rules and institutions for activity beyond Earth.',
  'community-building': 'Growing and supporting the community of people who work on these problems: national and university groups, events, fellowships, careers advice, the Centre for Effective Altruism, the School for Moral Ambition.',
  'effective-giving': 'Public-facing effective giving: persuading people to donate and directing those donations well. Giving What We Can, Doneer Effectief, the Tien Procent Club, pledge and platform work.',
}

// ---------------------------------------------------------------------------
// Axis two — skill (August 2026)
// ---------------------------------------------------------------------------

/**
 * The skill axis, for readers who are cause-neutral and know what they are good
 * at rather than what they want to work on.
 *
 * This is Probably Good's taxonomy, adopted deliberately rather than invented:
 * a reader who has already browsed jobs.probablygood.org should not have to
 * learn a second vocabulary to browse ours, and the categories are well tested.
 * `engineering` is physical/biological/chemical engineering; `software-engineering`
 * is software. Keeping them apart is Probably Good's call and a correct one for
 * a board carrying both cultivated-meat process engineers and ML engineers.
 *
 * A listing carries one or two. Two is the cap on purpose — a role tagged with
 * five skills is a role the classifier did not understand.
 */
export const SKILLS = [
  'communications',
  'data',
  'engineering',
  'finance',
  'information-security',
  'legal',
  'management',
  'operations',
  'policy',
  'research',
  'software-engineering',
] as const

export type Skill = (typeof SKILLS)[number]

export const MAX_SKILLS_PER_LISTING = 2

export const SKILL_DEFINITIONS: Record<Skill, string> = {
  communications: 'Communications, marketing, outreach, community management, journalism, fundraising and public affairs.',
  data: 'Data science, data analysis, statistics, monitoring and evaluation, data engineering.',
  engineering: 'Physical, biological, chemical and process engineering. Laboratory and manufacturing roles. NOT software.',
  finance: 'Investment, grantmaking, accounting, financial analysis, economics applied to capital.',
  'information-security': 'Security engineering, threat modelling, compliance and infrastructure hardening.',
  legal: 'Law, regulatory compliance, contracts, litigation and legal research.',
  management: 'Leading teams, running organisations, executive and programme leadership.',
  operations: 'Operations, HR, recruiting, finance administration, office and event management, executive assistance.',
  policy: 'Policy analysis, advising, advocacy, government affairs, diplomacy and regulation.',
  research: 'Academic and applied research, including AI safety research, economics, and policy research.',
  'software-engineering': 'Software engineering, machine learning engineering, infrastructure and product engineering.',
}

/**
 * Topics the board deliberately does not cover, and where to send someone
 * instead. Rendered on the method page and used to instruct the classifier.
 *
 * This is the successor to the old climate allowlist gate. The gate existed
 * because the Netherlands has an enormous sustainability sector that would
 * swamp a climate category — but a gate that admits five organisations is a
 * category nobody browses, and it implied the board had a view on climate
 * effectiveness that it is not the right project to hold. Excluding the topic
 * outright and naming the initiative that does cover it is both more honest and
 * more useful to the reader.
 */
export const EXCLUDED_TOPICS = [
  {
    id: 'climate',
    referralUrl: 'https://www.effectiveenvironmentalism.org',
    referralName: 'Effective Environmentalism',
  },
] as const

export type ExcludedTopic = (typeof EXCLUDED_TOPICS)[number]['id']

// ---------------------------------------------------------------------------
// Leverage archetype (§5.2) — INTERNAL ONLY as of August 2026.
//
// This was the board's second public browse axis and it no longer is. It was
// retired from the reader-facing UI because it asked people to sort themselves
// by a concept they do not hold: nobody arrives thinking "I would like to do
// capital allocation". Skill and cause are the two axes a reader actually has.
//
// It survives because it is still doing real work out of sight:
//   - `meetsPromotionThreshold` scores every listing on it before publication,
//     which is the board's quality bar;
//   - `earning-to-give` and `trusted-recommendation` are employer-level gates,
//     and the latter is what splits the two tiers on the index.
// Deleting it would cost the board its filter on mediocrity and buy the reader
// nothing they can see. So: classified, scored, never rendered.
// ---------------------------------------------------------------------------

export const LEVERAGE_TYPES = [
  'capital-allocation',
  'policy-regulation',
  'research-evidence',
  'field-building',
  'direct-work',
  'career-capital',
  'earning-to-give',
  'trusted-recommendation',
] as const

export type LeverageType = (typeof LEVERAGE_TYPES)[number]

/**
 * `earning-to-give` and `trusted-recommendation` are both gated by an
 * employer-level allowlist and can never be assigned by the classifier
 * itself (§5.3, and August 2026 for the latter).
 */
export const GATED_LEVERAGE_TYPES: readonly LeverageType[] = [
  'earning-to-give',
  'trusted-recommendation',
]

export const CLASSIFIER_ASSIGNABLE_LEVERAGE: readonly LeverageType[] = LEVERAGE_TYPES.filter(
  (l) => !GATED_LEVERAGE_TYPES.includes(l),
)

export const LEVERAGE_DEFINITIONS: Record<LeverageType, string> = {
  'capital-allocation':
    'The role moves or shapes money. Foundation programme officers, development-bank investment officers, VC roles, bank credit and sector research.',
  'policy-regulation':
    'The role writes, enforces, advises on, or implements rules. Ministry policy officers, regulator staff, standards bodies.',
  'research-evidence':
    'The role produces knowledge that feeds capital allocation and policy. Academic posts, think tanks, technical assessment institutes.',
  'field-building':
    'The role builds the ecosystem: talent pipelines, coalitions, community infrastructure, movement organisations, effective giving and grantmaking infrastructure.',
  'direct-work':
    'The role does the object-level thing. Programme delivery, engineering at a mission-aligned company, campaigning.',
  'career-capital':
    'The role is a stepping stone rather than impactful in itself: it builds skills, credentials or a network that unlock a high-leverage role later. Used sparingly.',
  'earning-to-give':
    'The work itself is not the point. The role pays enough that a person donating a meaningful share can fund more good than they could produce directly.',
  'trusted-recommendation':
    'Any role at an organisation already vetted by an independent evaluator (GiveWell, Animal Charity Evaluators, Founders Pledge, ...) or featured by 80,000 Hours or Probably Good, open to a Netherlands-based or NL-remote applicant. The evaluator has already done the leverage judgement at the organisation level; this label exists so a generic support role there is not filtered out by a role-level score it was never meant to pass.',
}

/**
 * The scoring rubric rewards these two archetypes at organisations that are
 * not EA-identified, because those are exactly the listings no other board
 * will surface (§5.2).
 */
export const PRIORITY_LEVERAGE_TYPES: readonly LeverageType[] = [
  'capital-allocation',
  'policy-regulation',
]

// ---------------------------------------------------------------------------
// Practical eligibility fields (§5.4)
// ---------------------------------------------------------------------------

export const LANGUAGE_REQUIREMENTS = [
  'dutch-required',
  'dutch-preferred',
  'english-sufficient',
  'unclear',
] as const
export type LanguageRequirement = (typeof LANGUAGE_REQUIREMENTS)[number]

export const WORK_AUTHORISATIONS = [
  'eu-citizens-or-existing-permit',
  'sponsorship-available',
  'dutch-nationality-required',
  'unclear',
] as const
export type WorkAuthorisation = (typeof WORK_AUTHORISATIONS)[number]

/**
 * Where you actually have to be — three options, revised August 2026.
 *
 * It used to be `on-site | hybrid | remote-nl | remote-eu`, which mixed two
 * questions together and answered neither well. A reader in the Netherlands is
 * deciding one thing: do I have to be somewhere, and if so, how often. So:
 *
 * - `remote`      you can do this job from anywhere in the Netherlands.
 * - `on-site-nl`  you have to be at a specific Dutch workplace.
 * - `nl-flexible` a Dutch employer with a Dutch office where a hybrid
 *                 arrangement is normal — some days in, most days wherever.
 *
 * Note what is deliberately NOT here. Most `remote` roles on this board are at
 * foreign organisations, and "remote at a US non-profit" is a materially
 * different proposition from "remote at a Dutch ministry" — different contract,
 * different timezone, different right-to-work question. That distinction is
 * real, but it is a question about the employer and about work authorisation,
 * both of which already have their own fields. Crowding it into the location
 * filter would give the reader four options that answer three questions again.
 */
export const LOCATION_MODES = ['remote', 'on-site-nl', 'nl-flexible'] as const
export type LocationMode = (typeof LOCATION_MODES)[number]

/**
 * The pre-August-2026 vocabulary, kept solely so the backfill and any listing
 * classified before the change can be mapped forward. Nothing reads this at
 * runtime once the backfill has run.
 */
export const LEGACY_LOCATION_MODE_MAP: Record<string, LocationMode> = {
  'on-site': 'on-site-nl',
  hybrid: 'nl-flexible',
  'remote-nl': 'remote',
  'remote-eu': 'remote',
}

export const SENIORITIES = ['internship', 'entry', 'mid', 'senior', 'executive'] as const
export type Seniority = (typeof SENIORITIES)[number]

// ---------------------------------------------------------------------------
// Scoring (§8.3)
// ---------------------------------------------------------------------------

/** Promote to Sanity when total >= 4 AND cause >= 2. */
export const PROMOTION_TOTAL_THRESHOLD = 4
export const PROMOTION_MIN_CAUSE_SCORE = 2

/** Score 3 near-misses are reviewed monthly to calibrate the thresholds. */
export const NEAR_MISS_TOTAL = 3

export function meetsPromotionThreshold(causeScore: number, leverageScore: number): boolean {
  return (
    causeScore + leverageScore >= PROMOTION_TOTAL_THRESHOLD &&
    causeScore >= PROMOTION_MIN_CAUSE_SCORE
  )
}

// ---------------------------------------------------------------------------
// Sanity option lists — keeps the Studio dropdowns in step with the above
// ---------------------------------------------------------------------------

export type SanityOption = { title: string; value: string }

/**
 * Studio dropdown titles. Curator-facing, so Dutch — the curator works in
 * Dutch and the public labels come from the i18n files, not from here.
 */
export const CAUSE_AREA_TITLES_NL: Record<CauseArea, string> = {
  'global-health-wellbeing': 'Mondiale gezondheid en welzijn',
  'farmed-animal-welfare': 'Dierenwelzijn in de veehouderij',
  'global-catastrophic-risks': 'Mondiale catastrofale risico’s',
  'better-futures': 'Betere toekomsten',
  'movement-building': 'De beweging opbouwen',
}

export const SUB_AREA_TITLES_NL: Record<SubArea, string> = {
  'global-health': 'Mondiale gezondheid en infectieziekten',
  'development-finance': 'Ontwikkelingsfinanciering en hulpbeleid',
  'health-systems': 'Zorgstelsels in arme landen',
  'lead-and-air-quality': 'Lood en luchtkwaliteit',
  'mental-health': 'Mentale gezondheid op schaal',
  'animal-advocacy': 'Belangenbehartiging en campagnes',
  'animal-law': 'Dierenrecht en handhaving',
  'alternative-protein': 'Kweekvlees en plantaardige eiwitten',
  'protein-transition-policy': 'Beleid rond de eiwittransitie',
  'ai-safety': 'AI-veiligheid',
  'biosecurity': 'Pandemieën en biosecurity',
  'nuclear-security': 'Nucleaire veiligheid',
  'ai-governance': 'AI-governance en macht',
  'democratic-institutions': 'Democratische instituties',
  'moral-circle': 'De morele cirkel',
  'space-governance': 'Ruimtebestuur',
  'community-building': 'Community building',
  'effective-giving': 'Effectief geven',
}

export const SKILL_TITLES_NL: Record<Skill, string> = {
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
}

export const LEVERAGE_TITLES_NL: Record<LeverageType, string> = {
  'capital-allocation': 'Kapitaalallocatie',
  'policy-regulation': 'Beleid en toezicht',
  'research-evidence': 'Onderzoek en bewijs',
  'field-building': 'Veldopbouw',
  'direct-work': 'Direct werk',
  'career-capital': 'Loopbaankapitaal',
  'earning-to-give': 'Earning to give',
  'trusted-recommendation': 'Aanbevolen door een evaluator',
}

export const causeAreaOptions = (): SanityOption[] =>
  CAUSE_AREAS.map((value) => ({ value, title: CAUSE_AREA_TITLES_NL[value] }))

export const leverageOptions = (): SanityOption[] =>
  LEVERAGE_TYPES.map((value) => ({ value, title: LEVERAGE_TITLES_NL[value] }))

export const subAreaOptions = (): SanityOption[] =>
  SUB_AREAS.map((value) => ({ value, title: SUB_AREA_TITLES_NL[value] }))

export const skillOptions = (): SanityOption[] =>
  SKILLS.map((value) => ({ value, title: SKILL_TITLES_NL[value] }))

export const plainOptions = (values: readonly string[]): SanityOption[] =>
  values.map((value) => ({ value, title: value }))
