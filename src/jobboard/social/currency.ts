/**
 * Salaries in euros on the social posts (James, 9 Nov 2026).
 *
 * Three in four salaries on the board are in dollars or pounds, as the
 * employer wrote them. The posts speak to people in the Netherlands, so the
 * slides show them converted, marked "About" because a converted figure is an
 * approximation: annual amounts to the nearest €1,000, smaller ones to €100.
 *
 * Rates are the European Central Bank's daily reference rates, fetched at most
 * once a day. If the ECB can't be reached the salary stays in its own
 * currency: an unconverted figure is right, a guessed rate is not.
 */

import { parseSalaryText } from '../lib/text'

const ECB_DAILY = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'

/** Units of each currency per euro, as the ECB publishes them (USD 1.12 = €1). */
export type EurRates = Record<string, number>

let cached: { at: number; rates: EurRates } | null = null

export async function getEurRates(now = Date.now()): Promise<EurRates | null> {
  if (cached && now - cached.at < 864e5) return cached.rates
  try {
    const res = await fetch(ECB_DAILY, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) })
    if (!res.ok) return cached?.rates ?? null
    const rates = parseEcb(await res.text())
    if (!Object.keys(rates).length) return cached?.rates ?? null
    cached = { at: now, rates }
    return rates
  } catch {
    return cached?.rates ?? null
  }
}

export function parseEcb(xml: string): EurRates {
  const rates: EurRates = {}
  for (const m of xml.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g)) {
    const rate = Number(m[2])
    if (rate > 0) rates[m[1]] = rate
  }
  return rates
}

const round = (value: number) => (value >= 10_000 ? Math.round(value / 1000) * 1000 : Math.round(value / 100) * 100)
const euros = (value: number) => `€${round(value).toLocaleString('en-GB')}`

/**
 * "About €143,000–€223,000" for a salary in another currency, or null when it
 * is already in euros, has no currency or number, or there is no rate for it.
 */
export function inEuros(
  salaryText: string | null,
  rates: EurRates | null,
): { text: string; annual: boolean } | null {
  if (!salaryText || !rates) return null
  const { min, max, currency } = parseSalaryText(salaryText)
  if (!min || !currency || currency === 'EUR') return null
  const rate = rates[currency]
  if (!rate) return null
  const low = euros(min / rate)
  const high = max ? euros(max / rate) : null
  return {
    text: `About ${high && high !== low ? `${low}–${high}` : low}`,
    // Dollar salaries rarely say "per year"; nobody is paid €15,000 a month.
    annual: min / rate >= 15_000,
  }
}
