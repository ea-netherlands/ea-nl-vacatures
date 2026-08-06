/**
 * The taxonomy — spec §5.
 *
 * Two orthogonal axes (cause area, leverage archetype) plus the practical
 * eligibility fields that make the board usable in a Dutch context.
 *
 * This module is the single source of truth for the controlled vocabularies.
 * The Sanity schemas, the classifier's structured-output schema, the filter
 * UI and the interface translations all derive their option lists from here,
 * so a vocabulary change cannot drift between layers.
 */

// ---------------------------------------------------------------------------
// Axis one — cause area (§5.1)
// ---------------------------------------------------------------------------

export const CAUSE_AREAS = [
  'ai-safety-governance',
  'biosecurity-pandemics',
  'animal-welfare-alt-protein',
  'global-health-development',
  'global-catastrophic-risk',
  'effective-giving-meta',
  'climate',
  'career-capital',
] as const

export type CauseArea = (typeof CAUSE_AREAS)[number]

/**
 * `climate` is gated by an allowlist, not by the classifier's judgement
 * (§5.1). `career-capital` is not a cause area as such — it is a flag for
 * roles that are not directly impactful but are unusually strong stepping
 * stones. Neither may be assigned from the ad text alone.
 */
export const GATED_CAUSE_AREAS: readonly CauseArea[] = ['climate']

/** Cause areas the classifier may choose from without an employer-level gate. */
export const CLASSIFIER_ASSIGNABLE_CAUSES: readonly CauseArea[] = CAUSE_AREAS.filter(
  (c) => !GATED_CAUSE_AREAS.includes(c),
)

export const CAUSE_AREA_DEFINITIONS: Record<CauseArea, string> = {
  'ai-safety-governance':
    'Technical AI safety, AI policy, compute governance, AI Act implementation and enforcement, standards work.',
  'biosecurity-pandemics':
    'Pandemic preparedness, biosurveillance, dual-use research governance, chemical and biological weapons regimes.',
  'animal-welfare-alt-protein':
    'Farmed animal advocacy, animal law, cultivated meat and fermentation, protein transition policy, and the finance and corporate roles that shape all of it.',
  'global-health-development':
    'Global health, development finance, aid policy, health systems in low- and middle-income countries.',
  'global-catastrophic-risk':
    'Nuclear security, great-power conflict, international institution building, existential risk research not covered by the AI or bio categories.',
  'effective-giving-meta':
    'Effective giving organisations, community building, grantmaking infrastructure, research on which problems to prioritise.',
  climate:
    'Climate and biodiversity, restricted to employers on one of Giving Green’s current recommendation lists. Gated by allowlist, never by the classifier.',
  'career-capital':
    'Not directly impactful, but an unusually strong stepping stone toward a high-leverage role. Used sparingly.',
}

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
 * (§5.3) and can never be assigned by the classifier.
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
    'The role builds the ecosystem: talent pipelines, coalitions, community infrastructure, movement organisations.',
  'direct-work':
    'The role does the object-level thing. Programme delivery, engineering at a mission-aligned company, campaigning.',
  'career-capital':
    'The role is a stepping stone rather than impactful in itself.',
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
  'ai-safety-governance': 'AI-veiligheid en -beleid',
  'biosecurity-pandemics': 'Biosecurity en pandemieën',
  'animal-welfare-alt-protein': 'Dierenwelzijn en eiwittransitie',
  'global-health-development': 'Mondiale gezondheid en ontwikkeling',
  'global-catastrophic-risk': 'Mondiale catastrofale risico’s',
  'effective-giving-meta': 'Effectief geven en meta',
  climate: 'Klimaat en biodiversiteit (allowlist)',
  'career-capital': 'Loopbaankapitaal',
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
