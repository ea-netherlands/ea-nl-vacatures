/**
 * The two mechanical gates — spec §5.1 (climate) and §5.3 (earning to give).
 *
 * Both categories would swamp the board if judged by an LLM. The Netherlands
 * has an enormous sustainability sector and thousands of well-paid Amsterdam
 * jobs; a classifier will find a plausible case for most of them. So neither
 * label is ever a judgement call — both are employer-level booleans checked
 * before the classifier sees the listing, and enforced again on its output.
 *
 * The double enforcement is deliberate: an LLM told not to use a label will
 * occasionally use it anyway, and this is the one category where a single
 * leak starts an erosion (§8.1).
 */

import {
  type CauseArea,
  type LeverageType,
  CLASSIFIER_ASSIGNABLE_CAUSES,
  CLASSIFIER_ASSIGNABLE_LEVERAGE,
} from './index'

/**
 * Set high enough that the earning-to-give section stays small. Configurable
 * rather than hardcoded (§5.3) — raise it if the section starts to fill up.
 */
export const E2G_SALARY_FLOOR = Number(process.env.E2G_SALARY_FLOOR ?? 90_000)
export const E2G_SALARY_CURRENCY = 'EUR'

/** The employer-level flags the gates read. Mirrors the `employer` table. */
export type EmployerGateFlags = {
  giving_green_listed: boolean
  climate_exception: boolean
  e2g_allowlisted: boolean
  e2g_salary_presumed: boolean
}

export type ListingSalary = {
  salary_max: number | null
  salary_currency: string | null
}

/**
 * Climate gate. A role qualifies for `climate` only if the employer appears
 * on one of Giving Green's current recommendation lists — or on the manual
 * exception list, which requires an explicit human decision and should stay
 * near-empty. If it grows past a couple of entries the gate has stopped
 * working and the category is drifting back toward general sustainability.
 */
export function climateAllowed(employer: EmployerGateFlags | null): boolean {
  if (!employer) return false
  return employer.giving_green_listed || employer.climate_exception
}

/**
 * Earning-to-give gate:
 *   employer.e2g_allowlisted AND (salary_max >= FLOOR OR e2g_salary_presumed)
 *
 * `e2g_salary_presumed` handles employers who never publish salary but are
 * known to clear the bar — the Amsterdam trading firms mostly don't advertise
 * numbers.
 */
export function earningToGiveEligible(
  employer: EmployerGateFlags | null,
  listing: ListingSalary,
): boolean {
  if (!employer?.e2g_allowlisted) return false
  if (employer.e2g_salary_presumed) return true
  if (listing.salary_max === null) return false
  // A floor expressed in euros cannot be compared against another currency
  // without an FX rate we deliberately do not carry. Fall back to the
  // presumption flag instead of guessing.
  if (listing.salary_currency && listing.salary_currency !== E2G_SALARY_CURRENCY) return false
  return listing.salary_max >= E2G_SALARY_FLOOR
}

/**
 * The set of cause labels the classifier is allowed to assign for this
 * listing. Passed into the prompt so the model never sees `climate` as an
 * option unless the employer has cleared the gate.
 */
export function allowedCauseAreas(employer: EmployerGateFlags | null): CauseArea[] {
  const allowed = [...CLASSIFIER_ASSIGNABLE_CAUSES]
  if (climateAllowed(employer)) allowed.push('climate')
  return allowed
}

export function allowedLeverageTypes(
  employer: EmployerGateFlags | null,
  listing: ListingSalary,
): LeverageType[] {
  const allowed = [...CLASSIFIER_ASSIGNABLE_LEVERAGE]
  if (earningToGiveEligible(employer, listing)) allowed.push('earning-to-give')
  return allowed
}

export type GateViolation = {
  field: 'primaryCause' | 'secondaryCauses' | 'leverage'
  value: string
  reason: string
}

/**
 * Output-side enforcement. Strips any gated label the model used anyway and
 * reports what it stripped, so leaks show up in the decision log rather than
 * silently correcting themselves.
 */
export function enforceGates(
  result: { primaryCause: string | null; secondaryCauses: string[]; leverage: string | null },
  employer: EmployerGateFlags | null,
  listing: ListingSalary,
): {
  primaryCause: string | null
  secondaryCauses: string[]
  leverage: string | null
  violations: GateViolation[]
} {
  const causes = new Set(allowedCauseAreas(employer))
  const leverages = new Set(allowedLeverageTypes(employer, listing))
  const violations: GateViolation[] = []

  let primaryCause = result.primaryCause
  if (primaryCause && !causes.has(primaryCause as CauseArea)) {
    violations.push({
      field: 'primaryCause',
      value: primaryCause,
      reason: `employer has not cleared the ${primaryCause} gate`,
    })
    primaryCause = null
  }

  const secondaryCauses = result.secondaryCauses.filter((c) => {
    if (causes.has(c as CauseArea)) return true
    violations.push({
      field: 'secondaryCauses',
      value: c,
      reason: `employer has not cleared the ${c} gate`,
    })
    return false
  })

  let leverage = result.leverage
  if (leverage && !leverages.has(leverage as LeverageType)) {
    violations.push({
      field: 'leverage',
      value: leverage,
      reason: `employer has not cleared the ${leverage} gate`,
    })
    leverage = null
  }

  return { primaryCause, secondaryCauses, leverage, violations }
}
