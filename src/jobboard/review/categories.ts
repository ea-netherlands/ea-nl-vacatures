/*
  Kept free of imports on purpose: the classifier (via calibration.ts), the
  dashboard's client component and the decision API all read this list, and a
  dependency here would pull server-only modules into the browser bundle.
*/

/**
 * Why a listing does not belong. A short fixed list, because the classifier
 * is shown these grouped by kind and a free-text-only reason cannot be
 * counted; the free text alongside is where the actual argument goes.
 */
export const REJECT_CATEGORIES = [
  { value: 'low-leverage', label: 'Not enough leverage' },
  { value: 'wrong-cause', label: 'Not one of our problems' },
  { value: 'not-nl', label: 'Not open to people in the Netherlands' },
  { value: 'weak-employer', label: 'Not an employer we would vouch for' },
  { value: 'closed', label: 'Closed or dead link' },
  { value: 'duplicate', label: 'Already on the board' },
  { value: 'other', label: 'Something else' },
] as const

export type RejectCategory = (typeof REJECT_CATEGORIES)[number]['value']

export function isRejectCategory(value: unknown): value is RejectCategory {
  return REJECT_CATEGORIES.some((c) => c.value === value)
}
