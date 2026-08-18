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
    'Health and material welfare of the world’s poorest people, alive today. Global health, development finance, aid policy, health systems in low- and middle-income countries, lead and air quality, mental health at scale.',
  'farmed-animal-welfare':
    'The suffering of animals in food production. Farmed animal advocacy, animal law and enforcement, cultivated meat and fermentation, the protein transition, and the corporate and finance roles that shape all of it. Not general nature or biodiversity work.',
  'global-catastrophic-risks':
    'Events that could kill a very large share of humanity or permanently end its prospects. AI takeover, misalignment and catastrophic misuse; pandemics, biosurveillance and dual-use research governance; nuclear security and great-power conflict.',
  'better-futures':
    'Whether the long-run future goes well *given* that humanity survives. Who holds power over transformative AI and whose values get locked in; the quality and resilience of democratic institutions; the moral circle, including digital minds; space governance. The concern here is not extinction but a surviving world that is much worse than it could have been.',
}

/**
 * Sub-areas. Not a stored field and not a filter — descriptive text used in the
 * classifier prompt and on the cause pages, so that a four-item taxonomy still
 * tells a reader (and the model) what actually falls inside each area.
 *
 * The AI entries are deliberately split across two areas. That is the whole
 * point of the revision, and the sub-area lists are where the boundary is
 * stated concretely enough to act on.
 */
export const CAUSE_SUBAREAS: Record<CauseArea, readonly string[]> = {
  'global-health-wellbeing': [
    'Global health and disease control',
    'Development finance and aid policy',
    'Health systems in low- and middle-income countries',
    'Lead exposure and air quality',
    'Mental health at scale',
  ],
  'farmed-animal-welfare': [
    'Farmed animal advocacy and corporate campaigns',
    'Animal law and enforcement',
    'Cultivated meat, fermentation and plant-based protein',
    'Protein transition policy and finance',
  ],
  'global-catastrophic-risks': [
    'AI takeover, misalignment and catastrophic misuse',
    'Biosecurity, pandemic preparedness and dual-use research',
    'Nuclear security and great-power conflict',
  ],
  'better-futures': [
    'AI governance, power concentration and value lock-in',
    'Quality and resilience of democratic institutions',
    'Moral circle expansion, including digital minds',
    'Space governance',
  ],
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
// Axis two — leverage archetype (§5.2). Each job gets exactly one.
// ---------------------------------------------------------------------------

export const LEVERAGE_TYPES = [
  'capital-allocation',
  'policy-regulation',
  'research-evidence',
  'field-building',
  'direct-work',
  'career-capital',
  'earning-to-give',
] as const

export type LeverageType = (typeof LEVERAGE_TYPES)[number]

/**
 * `earning-to-give` is gated by an employer allowlist plus a salary floor
 * (§5.3) and can never be assigned by the classifier. This is now the only
 * gate in the system, and it is the one that most needs to hold.
 */
export const GATED_LEVERAGE_TYPES: readonly LeverageType[] = ['earning-to-give']

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

export const LOCATION_MODES = ['on-site', 'hybrid', 'remote-nl', 'remote-eu'] as const
export type LocationMode = (typeof LOCATION_MODES)[number]

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
}

export const LEVERAGE_TITLES_NL: Record<LeverageType, string> = {
  'capital-allocation': 'Kapitaalallocatie',
  'policy-regulation': 'Beleid en toezicht',
  'research-evidence': 'Onderzoek en bewijs',
  'field-building': 'Veldopbouw',
  'direct-work': 'Direct werk',
  'career-capital': 'Loopbaankapitaal',
  'earning-to-give': 'Earning to give',
}

export const causeAreaOptions = (): SanityOption[] =>
  CAUSE_AREAS.map((value) => ({ value, title: CAUSE_AREA_TITLES_NL[value] }))

export const leverageOptions = (): SanityOption[] =>
  LEVERAGE_TYPES.map((value) => ({ value, title: LEVERAGE_TITLES_NL[value] }))

export const plainOptions = (values: readonly string[]): SanityOption[] =>
  values.map((value) => ({ value, title: value }))
