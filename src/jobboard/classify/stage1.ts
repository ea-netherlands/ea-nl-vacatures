/**
 * Stage one — cheap and deterministic (spec §8.1).
 *
 * Drops anything not plausibly Netherlands-relevant using location fields,
 * country codes and a remote-eligibility check. This discards the large
 * majority before any tokens are spent.
 *
 * Stage one also resolves which labels the classifier is allowed to assign, and
 * passes that constraint into the prompt. Since climate stopped being a cause
 * area the only gated label left is `earning-to-give`, which needs the
 * employer's allowlist flag and the listing's salary.
 */

import { allowedCauseAreas, allowedLeverageTypes, type EmployerGateFlags } from '../taxonomy/gates'

export type Stage1Input = {
  id: number
  title: string
  employer_name: string
  location_raw: string | null
  country: string | null
  description: string | null
  salary_max: number | null
  salary_currency: string | null
  employer: EmployerGateFlags | null
}

export type Stage1Verdict =
  | { pass: true; allowedCauses: string[]; allowedLeverage: string[]; nlReason: string }
  | { pass: false; reason: string }

const NL_CITIES =
  /\b(amsterdam|rotterdam|the hague|den haag|'s-gravenhage|utrecht|eindhoven|groningen|tilburg|almere|breda|nijmegen|enschede|haarlem|arnhem|zaanstad|amersfoort|apeldoorn|hoofddorp|maastricht|leiden|dordrecht|zoetermeer|zwolle|delft|wageningen|bilthoven|lelystad|leeuwarden|ede|reeuwijk|zeist|veldhoven|soesterberg|hilversum|deventer|alkmaar|emmen|venlo|heerlen|schiphol|bunnik|driebergen|houten)\b/i

const NL_COUNTRY = /\b(netherlands|nederland|the netherlands|holland|\bNL\b|\bNLD\b)\b/i

/**
 * Remote wordings that a Netherlands resident is genuinely eligible for. This
 * is how GFI Europe and similar orgs get in (§5.4) — but "remote (US)" must
 * not, so the exclusions matter as much as the inclusions.
 */
const REMOTE_ELIGIBLE =
  /\bremote\b(?![^.]{0,40}\b(us|usa|united states|canada|uk only|india|australia|apac|latam|brazil|africa only)\b)|\bremote,?\s*(global|worldwide|anywhere|eu|europe)\b|\bwork from anywhere\b|\bhome[- ]based\b|\beurope \(excluding uk\)\b|\bemea\b/i

const REMOTE_EXCLUDED =
  /\bremote\s*\(?\s*(us|usa|united states|canada|india|australia|brazil|latam|apac|uk)\b|\bus[- ]based\b|\bmust be based in the (us|united states|uk)\b|\bus work authorization\b|\bmust reside in the united states\b/i

/** Benelux is a curator decision (§ Appendix A, Those Vegan Cowboys). */
const BENELUX_ADJACENT = /\b(brussels|brussel|bruxelles|antwerp|antwerpen|ghent|gent|leuven|luxembourg)\b/i

export function nlEligible(input: {
  location_raw: string | null
  country: string | null
  title: string
  description: string | null
}): { eligible: boolean; reason: string } {
  const country = (input.country ?? '').trim().toUpperCase()
  if (country === 'NL') return { eligible: true, reason: 'country code NL' }

  const location = input.location_raw ?? ''
  const haystack = `${input.title}\n${location}`
  // Only the first slice of the body is consulted: a boilerplate "we have
  // offices in Amsterdam" tail should not make a San Francisco role NL-eligible.
  const bodyHead = (input.description ?? '').slice(0, 600)

  if (NL_COUNTRY.test(haystack) || NL_CITIES.test(haystack)) {
    return { eligible: true, reason: 'Dutch location named in title or location field' }
  }

  if (REMOTE_EXCLUDED.test(`${haystack}\n${bodyHead}`)) {
    return { eligible: false, reason: 'remote role restricted to a non-EU region' }
  }
  if (REMOTE_ELIGIBLE.test(haystack)) {
    return { eligible: true, reason: 'remote role a Netherlands resident could hold' }
  }

  // A non-Dutch country code with no remote wording is a straightforward drop.
  if (country && country !== 'NL') {
    return { eligible: false, reason: `country code ${country}, no NL-eligible remote wording` }
  }

  if (NL_COUNTRY.test(bodyHead) || NL_CITIES.test(bodyHead)) {
    return { eligible: true, reason: 'Dutch location named in the opening of the ad' }
  }
  if (BENELUX_ADJACENT.test(haystack)) {
    return { eligible: false, reason: 'Benelux-adjacent but not NL; add by hand if in scope' }
  }
  if (!location && !input.description) {
    // No location and no body text is not evidence of ineligibility — that is
    // an 80k-style stub whose ATS twin carries the detail. Let it through
    // cheaply rather than dropping a real role.
    return { eligible: true, reason: 'no location data yet; deferring to stage two' }
  }
  return { eligible: false, reason: 'no Netherlands signal in location, title or ad opening' }
}

export function stage1(input: Stage1Input): Stage1Verdict {
  if (!input.title.trim()) return { pass: false, reason: 'no title' }

  const nl = nlEligible(input)
  if (!nl.eligible) return { pass: false, reason: nl.reason }

  // Enough text to reason about? A stub with no description can still pass —
  // its ATS twin usually supplies the body — but there is nothing for the
  // classifier to read yet, so hold it until there is.
  const body = (input.description ?? '').trim()
  if (body.length < 200) {
    return { pass: false, reason: 'description too short to classify; waiting for a fuller fetch' }
  }

  return {
    pass: true,
    nlReason: nl.reason,
    // Every cause area is assignable; the earning-to-give gate below is the one
    // label the model never gets to see unless the employer has cleared it.
    allowedCauses: allowedCauseAreas(),
    allowedLeverage: allowedLeverageTypes(input.employer, {
      salary_max: input.salary_max,
      salary_currency: input.salary_currency,
    }),
  }
}
