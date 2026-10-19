/**
 * Per-source filters applied after normalising, before anything is written.
 *
 * Added October 2026 for the earning-to-give employers. IMC alone lists 171
 * roles worldwide and Adyen several hundred; only Netherlands-based roles in a
 * well-paid function can ever reach the board, and every other one would cost
 * a classifier call to reject. Filtered listings still count as seen, so they
 * cannot trigger closure detection.
 */

import { isEarningToGiveRole } from '../taxonomy/gates'
import type { NormalisedListing } from './types'

export type SourceFilterConfig = {
  /** Keep a listing only if its location contains one of these (case-insensitive). */
  onlyLocations?: string[]
  /** Keep a listing only if its title names a function the earning-to-give gate accepts. */
  e2gRolesOnly?: boolean
}

export function passesSourceFilters(
  listing: Pick<NormalisedListing, 'title' | 'locationRaw'>,
  config: Record<string, unknown>,
): boolean {
  const { onlyLocations, e2gRolesOnly } = config as SourceFilterConfig
  if (onlyLocations?.length) {
    const location = (listing.locationRaw ?? '').toLowerCase()
    if (!onlyLocations.some((place) => location.includes(place.toLowerCase()))) return false
  }
  if (e2gRolesOnly && !isEarningToGiveRole(listing.title)) return false
  return true
}
