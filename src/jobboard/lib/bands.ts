/**
 * The index's three bands — October 2026.
 *
 * The list used to have two tiers: roles at organisations someone else vetted,
 * and roles whose leverage we judged ourselves. That left no place for the
 * listings that are neither, and are often the most useful thing on the board
 * for a reader near the start: the ways in. A ministry internship on the AI
 * strategy team, an economics traineeship, a paid residency that turns
 * generalists into AI-safety operators. Scored as jobs they sat at the bottom
 * of the leverage tier, if they got onto the board at all.
 *
 * So there are three bands, in this order (James's call):
 *
 * 1. `vetted` — any role at an organisation an independent evaluator or an EA
 *    funder has already vetted (`trusted-recommendation`), and any role that
 *    80,000 Hours, Probably Good or EA Opportunities lists (`listedByEaBoard`).
 * 2. `routes` — ways in: programmes (fellowships, residencies, bootcamps),
 *    internships and traineeships, and anything classified as career capital.
 * 3. `dutch` — roles with leverage in Dutch institutions: organisations nobody
 *    in EA has vetted, where we judged the role itself worth listing because
 *    it moves money, rules or people at scale.
 *
 * The EA-board test was added in November 2026 at James's request. Before it,
 * `vetted` was only the hand-kept employer allowlist, so every EA organisation
 * missing from it (AVA International, First Domino, EA Funds, NOVAH, ...) fell
 * through to `dutch`. That filled the leverage band with remote roles at EA
 * organisations, which is the opposite of what the band is for. An EA board
 * listing a role is the same signal the allowlist encodes: somebody in EA has
 * already vetted the organisation.
 *
 * Membership is decided in a different order from display: a route in is a
 * route in wherever it is, so a Kairos fellowship goes in `routes` even though
 * Kairos is vetted. Otherwise the band a junior reader most needs would be
 * emptied into the one they are least likely to win a place in. Ordinary
 * entry-level jobs are not routes in — AIM's associates stay with AIM.
 */

import type { LeverageType, ListingKind, Seniority } from '../taxonomy'

export const BANDS = ['vetted', 'routes', 'dutch'] as const
export type Band = (typeof BANDS)[number]

/**
 * Titles that name a traineeship, which the seniority scale files as entry
 * level. No leading word boundary: Dutch compounds it ("Rijkstraineeship").
 */
export const TRAINEESHIP = /trainee(ship)?s?\b|traineeprogramma|\btrainingsprogramma\b/i

/**
 * The band the rules below would choose, ignoring a curator's override. The
 * review dashboard shows it as the "automatic" option.
 */
export function automaticBand(listing: {
  title: string
  listingKind: ListingKind | null
  seniority: Seniority | null
  leverage: LeverageType | null
  /** 80,000 Hours, Probably Good or EA Opportunities lists the role (any copy). */
  listedByEaBoard?: boolean | null
}): Band {
  if (
    listing.listingKind === 'programme' ||
    listing.seniority === 'internship' ||
    listing.leverage === 'career-capital' ||
    TRAINEESHIP.test(listing.title)
  ) {
    return 'routes'
  }
  if (listing.leverage === 'trusted-recommendation' || listing.listedByEaBoard) return 'vetted'
  return 'dutch'
}

/**
 * Where a listing goes. A curator's `section` wins: the rules are right for
 * most roles, but some cannot be moved by them at all — a role whose title
 * names a traineeship is a way in whatever its other fields say.
 */
export function bandOf(listing: Parameters<typeof automaticBand>[0] & { section?: Band | null }): Band {
  return listing.section && isBand(listing.section) ? listing.section : automaticBand(listing)
}

export function isBand(value: string | undefined): value is Band {
  return (BANDS as readonly string[]).includes(value ?? '')
}

/** Splits a list into the bands, each keeping the list's own order. */
export function splitIntoBands<T extends Parameters<typeof bandOf>[0]>(
  listings: T[],
): Record<Band, T[]> {
  const out: Record<Band, T[]> = { vetted: [], routes: [], dutch: [] }
  for (const l of listings) out[bandOf(l)].push(l)
  return out
}
