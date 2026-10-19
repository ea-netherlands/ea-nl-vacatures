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
 * case for most of them. So the label is never a judgement call. A listing
 * qualifies by either of two mechanical tests (October 2026, James's call; it
 * used to be the allowlist AND the floor, which nothing ever passed):
 *
 * 1. Its own ad states a salary at or above the floor, at any employer outside
 *    the excluded industries below. Few Dutch ads state pay, so this finds
 *    little today; it is there for the ones that do.
 * 2. The employer is on the earning-to-give allowlist and either the ad clears
 *    the floor, or the employer is known to (`e2g_salary_presumed`) AND the
 *    title names a well-paid function. The title test exists because "everyone
 *    at Adyen earns enough to give" is false: support, recruiting and office
 *    roles do not. It is a fixed pattern rather than a classifier call, for the
 *    reason above.
 *
 * Both are checked before the classifier sees the listing and enforced again
 * on its output.
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
  type ListingKind,
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
  /** A single stated figure parses as a min with no max ("EUR 100k"). */
  salary_min?: number | null
  /** 'month' | 'year' | null. Null reads as a year, the usual case for a high figure. */
  salary_period?: string | null
  /** The role-title test and the industry exclusion read these. */
  title?: string
  employer_name?: string | null
}

/**
 * Functions the allowlisted employers pay enough in to give from, matched on
 * the title only. "Research" is there for quant research, which is how the
 * trading firms title it.
 */
export const E2G_ROLE_TITLE =
  /\b(trad(er|ers|ing)|quant(s|itative)?|engineer(s|ing)?|developer|software|data scien(ce|tist)|machine learning|ML|researcher|research scientist|architect|SRE|site reliability)\b/i

/**
 * Titles that name a well-paid function but are not a salaried role in it,
 * found in the first live run (19 October 2026): recruiters and assistants on
 * a trading floor, internships and working students (a few months' pay is not
 * a salary to give from), recruitment events, and "Developer Experience" in a
 * product manager's title.
 */
export const E2G_ROLE_TITLE_EXCLUDED =
  /\b(intern(s|ship|ships)?|working student|werkstudent|recruit(er|ers|ing|ment)|assistant|surveillance|operations analyst|product manager|trading days|talent pool|career kickstarter|futurefocus)\b/i

/** The role test for presumed-salary employers. */
export function isEarningToGiveRole(title: string): boolean {
  return E2G_ROLE_TITLE.test(title) && !E2G_ROLE_TITLE_EXCLUDED.test(title)
}

/**
 * Industries whose pay does not count on the salary-only test, however high.
 * Matched on the employer's name. Short and literal on purpose: a backstop for
 * a test that today mostly sees EA boards and Dutch government, not a verdict
 * on every employer in the country. Allowlisted employers skip it.
 */
export const E2G_EXCLUDED_EMPLOYERS =
  /\b(shell|exxon(mobil)?|bp|totalenergies|chevron|equinor|philip morris|british american tobacco|japan tobacco|jti|imperial brands|holland casino|bet365|flutter|entain|kindred|betcity|lockheed martin|northrop grumman|raytheon|rtx)\b/i

/** The ad's top figure as an annual amount, or null when it states none. */
export function annualSalary(listing: ListingSalary): number | null {
  const top = listing.salary_max ?? listing.salary_min ?? null
  if (top === null) return null
  // Dutch monthly figures exclude the 8% holiday allowance; multiplying by 12
  // rather than 12.96 errs towards keeping a listing out.
  return listing.salary_period === 'month' ? top * 12 : top
}

function clearsFloor(listing: ListingSalary): boolean {
  const annual = annualSalary(listing)
  if (annual === null) return false
  // A floor in euros cannot be compared against another currency without an
  // FX rate we deliberately do not carry.
  if (listing.salary_currency && listing.salary_currency !== E2G_SALARY_CURRENCY) return false
  return annual >= E2G_SALARY_FLOOR
}

/**
 * Earning-to-give gate:
 *   salary test:   ad clears FLOOR AND employer not in an excluded industry
 *   employer test: e2g_allowlisted AND
 *                  (ad clears FLOOR OR (e2g_salary_presumed AND well-paid title))
 */
export function earningToGiveEligible(
  employer: EmployerGateFlags | null,
  listing: ListingSalary,
  kind: ListingKind = 'job',
): boolean {
  // A stipend is not a salary to give from: a fellowship at an allowlisted
  // firm would otherwise clear the floor on its stipend and land in the
  // earning-to-give section.
  if (kind === 'programme') return false
  const allowlisted = employer?.e2g_allowlisted ?? false
  if (clearsFloor(listing)) {
    return allowlisted || !E2G_EXCLUDED_EMPLOYERS.test(listing.employer_name ?? '')
  }
  if (!allowlisted || !employer?.e2g_salary_presumed) return false
  return isEarningToGiveRole(listing.title ?? '')
}

/** The gate's listing input, from a row that carries the usual listing columns. */
export function gateListing(row: {
  title: string
  employer_name: string | null
  salary_min?: number | null
  salary_max: number | null
  salary_currency: string | null
  salary_period?: string | null
}): ListingSalary {
  return {
    title: row.title,
    employer_name: row.employer_name,
    salary_min: row.salary_min ?? null,
    salary_max: row.salary_max,
    salary_currency: row.salary_currency,
    salary_period: row.salary_period ?? null,
  }
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
  kind: ListingKind = 'job',
): LeverageType[] {
  const allowed = [...CLASSIFIER_ASSIGNABLE_LEVERAGE]
  if (earningToGiveEligible(employer, listing, kind)) allowed.push('earning-to-give')
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
  kind: ListingKind = 'job',
): {
  primaryCause: string | null
  secondaryCauses: string[]
  leverage: string | null
  violations: GateViolation[]
} {
  const causes = new Set(allowedCauseAreas())
  const leverages = new Set(allowedLeverageTypes(employer, listing, kind))
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
