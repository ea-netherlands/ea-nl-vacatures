/**
 * The mechanical gate — spec §5.3 (earning to give).
 *
 * There used to be two. `climate` was the other, gated to employers on Giving
 * Green's recommendation lists; it is now out of scope entirely and handled by
 * a referral rather than a gate (see `EXCLUDED_TOPICS` in ./index). Removing it
 * from here rather than leaving a dormant gate behind is deliberate: a gate that
 * nothing passes through is a trap for the next reader.
 *
 * Earning to give would swamp the board if judged by an LLM — there are
 * thousands of well-paid Amsterdam jobs and a classifier will find a plausible
 * case for most of them. So the label is never a judgement call: it is an
 * employer-level boolean plus a salary floor, checked before the classifier
 * sees the listing and enforced again on its output.
 *
 * The double enforcement is deliberate: an LLM told not to use a label will
 * occasionally use it anyway, and this is the category where a single leak
 * starts an erosion (§8.1).
 *
 * `trusted-recommendation` (added August 2026) is the same pattern for a
 * different reason: not to prevent over-eager use, but because the classifier
 * would otherwise score a legitimate support role at an evaluator-endorsed org
 * as low leverage and reject it — exactly the outcome the label exists to
 * avoid. See `run.ts` for the score override; this module only decides
 * whether the label is available at all.
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
  e2g_allowlisted: boolean
  e2g_salary_presumed: boolean
  recommender_allowlisted: boolean
}

export type ListingSalary = {
  salary_max: number | null
  salary_currency: string | null
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
 * The set of cause labels the classifier is allowed to assign. No cause area is
 * gated any more, so this is every area — but the call sites and the prompt
 * still route through it, so re-introducing a gated category later is a change
 * in one place rather than five.
 */
export function allowedCauseAreas(): CauseArea[] {
  return [...CLASSIFIER_ASSIGNABLE_CAUSES]
}

export function allowedLeverageTypes(
  employer: EmployerGateFlags | null,
  listing: ListingSalary,
): LeverageType[] {
  const allowed = [...CLASSIFIER_ASSIGNABLE_LEVERAGE]
  if (earningToGiveEligible(employer, listing)) allowed.push('earning-to-give')
  if (employer?.recommender_allowlisted) allowed.push('trusted-recommendation')
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
  const causes = new Set(allowedCauseAreas())
  const leverages = new Set(allowedLeverageTypes(employer, listing))
  const violations: GateViolation[] = []

  let primaryCause = result.primaryCause
  if (primaryCause && !causes.has(primaryCause as CauseArea)) {
    violations.push({
      field: 'primaryCause',
      value: primaryCause,
      reason: `${primaryCause} is not a cause area on this board`,
    })
    primaryCause = null
  }

  const secondaryCauses = result.secondaryCauses.filter((c) => {
    if (causes.has(c as CauseArea)) return true
    violations.push({
      field: 'secondaryCauses',
      value: c,
      reason: `${c} is not a cause area on this board`,
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
