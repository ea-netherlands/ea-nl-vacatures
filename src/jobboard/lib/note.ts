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

/**
 * Picks the role summary for a locale.
 *
 * Same shape as `noteFor`, and it exists for the same reason. The excerpt used
 * to be a single field, which was fine while the board was imagined as a Dutch
 * product with an English shell: a reader on /en got the frame, the labels and
 * the filters in English and then a Dutch paragraph under "About the role".
 * That reads as an unfinished page rather than as a bilingual one, because the
 * two languages are not doing different jobs — it is the same sentence, only
 * untranslated.
 */
export function excerptFor(
  listing: { excerpt: string | null; excerptEn: string | null },
  locale: Locale,
): string | null {
  if (locale === 'en') return listing.excerptEn ?? listing.excerpt
  return listing.excerpt
}

/**
 * The advertised salary, with its period in the reader's language.
 *
 * `salaryText` holds the figure and nothing else. The period used to be spelled
 * into it at promotion time — in Dutch — which is how "€5.900–€8.100 per maand"
 * ended up under an English heading on every listing that published a salary.
 *
 * Documents promoted before that changed still carry the old suffix and have no
 * `salaryPeriod`, so the suffix is both stripped and read: stripping alone would
 * silently drop "per month" from every existing listing, which trades a
 * language bug for a factual one. New documents carry the field and the regex
 * finds nothing to strip.
 */
export function salaryFor(
  listing: { salaryText: string | null; salaryPeriod: 'month' | 'year' | null },
  copy: { salaryPerMonth: string; salaryPerYear: string },
): string | null {
  const raw = listing.salaryText?.trim()
  if (!raw) return null

  const legacy = raw.match(/\s+per\s+(maand|jaar|month|year)\s*$/i)
  const figure = legacy ? raw.slice(0, legacy.index).trim() : raw
  const inferred =
    legacy && /maand|month/i.test(legacy[1]) ? 'month' : legacy ? 'year' : null

  const period = listing.salaryPeriod ?? inferred
  if (period === 'month') return `${figure} ${copy.salaryPerMonth}`
  if (period === 'year') return `${figure} ${copy.salaryPerYear}`
  return figure
}
