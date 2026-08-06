/**
 * Text normalisation shared by every adapter.
 *
 * The gotchas here each cost an hour if you rediscover them (spec §7.2):
 * Greenhouse returns HTML-entity-encoded content, Lever splits the
 * description across three fields, and Dutch government ads carry long
 * boilerplate tails that carry no classification signal.
 */

import { createHash } from 'node:crypto'

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  '#x27': "'",
  '#x2F': '/',
  nbsp: ' ',
  eacute: 'é',
  euml: 'ë',
  iuml: 'ï',
  ouml: 'ö',
  uuml: 'ü',
  auml: 'ä',
  egrave: 'è',
  ccedil: 'ç',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  euro: '€',
}

/**
 * Unescapes HTML entities, including numeric ones. Greenhouse double-encodes
 * its `content` field, so this is applied twice there — the most common
 * Greenhouse integration bug is unescaping only once.
 */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, name: string) => {
    if (name.startsWith('#x') || name.startsWith('#X')) {
      const code = parseInt(name.slice(2), 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole
    }
    if (name.startsWith('#')) {
      const code = parseInt(name.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole
    }
    return ENTITIES[name] ?? whole
  })
}

/** HTML → readable plain text, preserving paragraph and list breaks. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return ''
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\r/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim()
}

/**
 * Truncates to roughly `maxWords` words for the classifier (§8.4). Dutch
 * government ads in particular have long boilerplate tails about the
 * organisation and the application procedure that carry no signal.
 */
export function truncateWords(text: string, maxWords = 1500): string {
  const words = text.split(/\s+/)
  if (words.length <= maxWords) return text
  return `${words.slice(0, maxWords).join(' ')}\n\n[…afgekapt voor classificatie]`
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/**
 * Strips tracking parameters before hashing or storing a URL. This alone
 * resolves most 80k overlap, since 80k links to the employer ATS URL we
 * already poll, with UTM tags appended (§7.7).
 */
const TRACKING_PARAMS = [
  /^utm_/i,
  /^gclid$/i,
  /^fbclid$/i,
  /^mc_(cid|eid)$/i,
  /^ref$/i,
  /^source$/i,
  /^src$/i,
  /^gh_src$/i,
  /^lever-(source|origin)/i,
]

export function canonicaliseUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim())
    url.hash = ''
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    if (url.protocol === 'http:') url.protocol = 'https:'
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.some((re) => re.test(key))) url.searchParams.delete(key)
    }
    // Sort what remains so two orderings of the same query hash identically.
    const sorted = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b))
    url.search = ''
    for (const [k, v] of sorted) url.searchParams.append(k, v)
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '')
    return url.toString()
  } catch {
    return rawUrl.trim()
  }
}

/** URL with the query string dropped entirely — the dedup_key input (§7.7). */
export function urlWithoutQuery(rawUrl: string): string {
  try {
    const url = new URL(canonicaliseUrl(rawUrl))
    url.search = ''
    return url.toString()
  } catch {
    return rawUrl.trim()
  }
}

/** Detects a mention of the Dutch 30% expat ruling (§5.3). Flag only. */
export function mentions30PercentRuling(text: string): boolean {
  return /\b(30\s*%|30-?procent|dertig\s*procent)[- ]?(regeling|ruling)\b|\bexpatregeling\b|\b30%-regeling\b/i.test(
    text,
  )
}

const CURRENCY_SYMBOLS: Record<string, string> = { '€': 'EUR', $: 'USD', '£': 'GBP' }

/**
 * Parses a number written in either the Dutch or the English convention.
 *
 * The ambiguous case is a single separator: `4.500` is four and a half thousand
 * in Dutch and four-point-five in English, and Dutch salary ads are full of the
 * former. The rule below resolves it by group length — a separator followed by
 * exactly three digits is a thousands separator — which is what both
 * conventions actually guarantee.
 */
export function parseLocaleNumber(raw: string): number {
  const lastComma = raw.lastIndexOf(',')
  const lastDot = raw.lastIndexOf('.')

  // Both separators present: the last one is the decimal separator.
  if (lastComma >= 0 && lastDot >= 0) {
    return lastComma > lastDot
      ? Number.parseFloat(raw.replace(/\./g, '').replace(',', '.'))
      : Number.parseFloat(raw.replace(/,/g, ''))
  }

  const sep = lastComma >= 0 ? ',' : lastDot >= 0 ? '.' : null
  if (!sep) return Number.parseFloat(raw)

  const groups = raw.split(sep)
  // 4.500 / 1.234.567 → thousands. 4.5 / 4.50 → decimal.
  const isThousands = groups.slice(1).every((g) => g.length === 3)
  return isThousands
    ? Number.parseFloat(groups.join(''))
    : Number.parseFloat(raw.replace(sep, '.'))
}

/**
 * Best-effort salary extraction from free text, for ATS feeds that publish a
 * salary string rather than structured numbers. Deliberately conservative:
 * the earning-to-give gate falls back to `e2g_salary_presumed` rather than a
 * guess, so a missed parse is safe and a wrong parse is not.
 */
export function parseSalaryText(text: string | null | undefined): {
  min: number | null
  max: number | null
  currency: string | null
  period: string | null
} {
  const empty = { min: null, max: null, currency: null, period: null }
  if (!text) return empty

  const currencyMatch = text.match(/[€$£]|\b(EUR|USD|GBP)\b/i)
  const currency = currencyMatch
    ? (CURRENCY_SYMBOLS[currencyMatch[0]] ?? currencyMatch[0].toUpperCase())
    : null

  const period = /\b(per\s*(maand|month|mnd)|monthly|p\/m)\b/i.test(text)
    ? 'month'
    : /\b(per\s*(jaar|year|annum)|annually|p\/a|jaarlijks)\b/i.test(text)
      ? 'year'
      : null

  // Numbers with thousands separators in either convention, plus k-suffixes.
  const numbers = [...text.matchAll(/(\d[\d.,]*\d|\d)\s*(k\b)?/gi)]
    .map((m) => {
      let value = parseLocaleNumber(m[1])
      if (m[2]) value *= 1000
      return value
    })
    .filter((n) => Number.isFinite(n) && n >= 1000 && n <= 2_000_000)

  if (numbers.length === 0) return { ...empty, currency, period }
  const min = Math.min(...numbers)
  const max = Math.max(...numbers)
  return { min, max: max === min ? null : max, currency, period }
}
