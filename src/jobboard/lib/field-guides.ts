/**
 * The website's field guides — AI safety, alternative proteins, policy — and
 * which board views and listings should point to them. November 2026: the
 * guides moved to /carrieregids/… and /en/career-guide/… on the main site.
 *
 * A reader who filters to one of these fields, or opens a listing in one, is
 * the person each guide was written for, so a one-line pointer goes there.
 * The sub-area wins over the broader signals because it is the most specific.
 */

export type FieldGuide = 'ai-safety' | 'alternative-proteins' | 'policy'

export const FIELD_GUIDE_URLS: Record<FieldGuide, { nl: string; en: string }> = {
  'ai-safety': {
    nl: 'https://effectiefaltruisme.nl/carrieregids/ai-veiligheid',
    en: 'https://effectiefaltruisme.nl/en/career-guide/ai-safety',
  },
  'alternative-proteins': {
    nl: 'https://effectiefaltruisme.nl/carrieregids/alternatieve-eiwitten',
    en: 'https://effectiefaltruisme.nl/en/career-guide/alternative-proteins',
  },
  policy: {
    nl: 'https://effectiefaltruisme.nl/carrieregids/beleid',
    en: 'https://effectiefaltruisme.nl/en/career-guide/policy',
  },
}

const BY_SUB_AREA: Record<string, FieldGuide> = {
  'ai-safety': 'ai-safety',
  'ai-governance': 'ai-safety',
  'alternative-protein': 'alternative-proteins',
  'protein-transition-policy': 'alternative-proteins',
}

export function fieldGuideFor(signals: {
  subarea?: string | null
  band?: string | null
  skills?: readonly string[]
}): FieldGuide | null {
  if (signals.subarea && signals.subarea in BY_SUB_AREA) return BY_SUB_AREA[signals.subarea]
  if (signals.band === 'dutch' || signals.skills?.includes('policy')) return 'policy'
  return null
}
