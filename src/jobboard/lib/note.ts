/**
 * Helpers for presenting the editorial note.
 *
 * Kept out of the component so they are pure and directly testable — the note
 * is the product, and how it gets truncated on a card or into a meta
 * description is worth having tests around.
 */

import type { Locale } from '../content/i18n'

/**
 * The note's first sentence, for the card and the meta description.
 *
 * Splits on a sentence end only when followed by whitespace and a capital, so
 * "€ 18,7 mln." and "e.g." do not cut the sentence in half — Dutch editorial
 * copy is full of both.
 */
export function firstLine(note: string | null | undefined, max = 220): string {
  if (!note) return ''
  const trimmed = note.trim()
  const match = trimmed.match(/^[\s\S]*?[.!?](?=\s+[A-ZÀ-Þ])/)
  const candidate = match ? match[0] : trimmed
  if (candidate.length <= max) return candidate
  return `${candidate.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

/**
 * Picks the note for a locale.
 *
 * Dutch is the source language; the English field is machine-translated on
 * publish. If the English one is missing, showing the Dutch note is the honest
 * fallback — a mixed-language page is entirely normal in the Netherlands and
 * needs no apologetic banner (§9.5).
 */
export function noteFor(
  listing: { whyThisMattersNl: string | null; whyThisMattersEn: string | null },
  locale: Locale,
): string | null {
  if (locale === 'en') return listing.whyThisMattersEn ?? listing.whyThisMattersNl
  return listing.whyThisMattersNl
}
