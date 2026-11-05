/**
 * The website's header menus and footer, read from the website itself.
 *
 * The site publishes them at effectiefaltruisme.nl/api/site-chrome (its
 * src/lib/site-chrome.ts), built from the same code its own header and footer
 * render. The board reads that once an hour, so a menu change on the site
 * reaches the board within an hour of the site deploying, with nothing to copy.
 *
 * If the site is down, slow, or sends something this file doesn't understand,
 * the board renders ./site-chrome.snapshot.json instead — the same payload,
 * saved into this repo by `npm run sync-site-chrome` — and logs why. A slightly
 * stale menu beats a broken page. The board's own strings (the course button,
 * the language switch, screen-reader labels, the footer tagline) are in
 * ./site-chrome.ts.
 */

import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from '../lib/consent'
import { isIconName } from '../components/Icon'
import type { Locale } from './i18n'
import {
  BOARD_FOOTER,
  BOARD_NAV,
  SITE,
  type SiteFooter,
  type SiteLink,
  type SiteNav,
  type SiteNavLink,
  type SitePillar,
} from './site-chrome'
import snapshot from './site-chrome.snapshot.json'

export type { SiteFooter, SiteNav }

/** The payload shape this file understands; the site bumps it on a breaking change. */
export const SITE_CHROME_VERSION = 1

export const SITE_CHROME_URL =
  process.env.SITE_CHROME_URL ?? `${SITE}/api/site-chrome`

/** How often the board asks again, in seconds. */
const REVALIDATE = 3600
const TIMEOUT_MS = 3000

export type SiteChrome = {
  nav: SiteNav
  footer: SiteFooter
  /** Where it came from, for logs and tests. */
  source: 'site' | 'fallback'
}

/** An icon the site uses but the board can't draw yet: shown instead, never fatal. */
const FALLBACK_ICON = 'arrow-right'

const BOARD_PATHS = ['/vacatures', '/en/jobs']

/**
 * The site's links are root-relative ("/carrieregids"). On effectiefaltruisme.nl
 * that works as is, but the board also runs on its own Vercel address, where
 * "/carrieregids" would 404. So everything but the board's own paths gets the
 * site's origin, as in the bundled copy.
 */
export function absolute(href: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href
  const isBoard = BOARD_PATHS.some(
    (p) => href === p || href.startsWith(`${p}/`) || href.startsWith(`${p}?`),
  )
  return isBoard ? href : `${SITE}${href}`
}

class ShapeError extends Error {}

type Json = unknown

function obj(v: Json, path: string): Record<string, Json> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new ShapeError(`${path}: not an object`)
  return v as Record<string, Json>
}
function arr(v: Json, path: string): Json[] {
  if (!Array.isArray(v) || v.length === 0) throw new ShapeError(`${path}: not a non-empty array`)
  return v
}
function str(v: Json, path: string): string {
  if (typeof v !== 'string' || !v.trim()) throw new ShapeError(`${path}: not a string`)
  return v
}
/** A `{ nl, en }` value, in one language. */
function loc(v: Json, locale: Locale, path: string): string {
  return str(obj(v, path)[locale], `${path}.${locale}`)
}

function link(v: Json, locale: Locale, path: string): SiteLink {
  const o = obj(v, path)
  return {
    label: loc(o.label, locale, `${path}.label`),
    href: absolute(loc(o.href, locale, `${path}.href`)),
  }
}

function navLink(v: Json, locale: Locale, path: string, warn: (m: string) => void): SiteNavLink {
  const o = obj(v, path)
  const icon = str(o.icon, `${path}.icon`)
  if (!isIconName(icon)) warn(`site uses icon "${icon}", which the board doesn't have (Icon.tsx)`)
  return {
    ...link(o, locale, path),
    description: loc(o.description, locale, `${path}.description`),
    icon: isIconName(icon) ? icon : FALLBACK_ICON,
  }
}

function pillar(v: Json, locale: Locale, path: string, warn: (m: string) => void): SitePillar {
  const o = obj(v, path)
  const groups = arr(o.groups, `${path}.groups`).map((g, i) => {
    const go = obj(g, `${path}.groups[${i}]`)
    return {
      ...(go.title ? { title: loc(go.title, locale, `${path}.groups[${i}].title`) } : {}),
      links: arr(go.links, `${path}.groups[${i}].links`).map((l, j) =>
        navLink(l, locale, `${path}.groups[${i}].links[${j}]`, warn),
      ),
    }
  })
  let feature: SitePillar['feature']
  if (o.feature) {
    const f = obj(o.feature, `${path}.feature`)
    feature = {
      ...(typeof f.image === 'string' && f.image ? { image: absolute(f.image) } : {}),
      title: loc(f.title, locale, `${path}.feature.title`),
      text: loc(f.text, locale, `${path}.feature.text`),
      cta: loc(f.cta, locale, `${path}.feature.cta`),
      href: absolute(loc(f.href, locale, `${path}.feature.href`)),
    }
  }
  return {
    key: str(o.key, `${path}.key`),
    label: loc(o.label, locale, `${path}.label`),
    heading: loc(o.heading, locale, `${path}.heading`),
    intro: loc(o.intro, locale, `${path}.intro`),
    groups,
    ...(feature ? { feature } : {}),
  }
}

/**
 * Turns the site's payload into the board's shapes for one language. Throws on
 * anything it doesn't recognise, so the caller can fall back as a whole rather
 * than render half a menu.
 */
export function parseSiteChrome(
  payload: Json,
  locale: Locale,
  warn: (message: string) => void = () => {},
): { nav: SiteNav; footer: SiteFooter } {
  const root = obj(payload, 'payload')
  if (root.version !== SITE_CHROME_VERSION) {
    throw new ShapeError(`payload.version is ${String(root.version)}, the board reads ${SITE_CHROME_VERSION}`)
  }

  const nav = obj(root.nav, 'nav')
  const unsure = obj(nav.unsure, 'nav.unsure')
  const pillars = arr(nav.pillars, 'nav.pillars').map((p, i) =>
    pillar(p, locale, `nav.pillars[${i}]`, warn),
  )

  const footer = obj(root.footer, 'footer')
  const org = obj(footer.org, 'footer.org')
  const anbi = obj(org.anbi, 'footer.org.anbi')
  const anbiLink = link(anbi.link, locale, 'footer.org.anbi.link')
  const [postal, registered] = arr(org.addresses, 'footer.org.addresses').map((a, i) => {
    const ao = obj(a, `footer.org.addresses[${i}]`)
    return {
      heading: loc(ao.title, locale, `footer.org.addresses[${i}].title`),
      lines: arr(ao.lines, `footer.org.addresses[${i}].lines`).map((l, j) =>
        str(l, `footer.org.addresses[${i}].lines[${j}]`),
      ),
    }
  })
  if (!registered) throw new ShapeError('footer.org.addresses: expected a postal and a registered address')

  return {
    nav: {
      ...BOARD_NAV[locale],
      pillars,
      unsure: {
        text: loc(unsure.text, locale, 'nav.unsure.text'),
        link: link(unsure.link, locale, 'nav.unsure.link'),
      },
    },
    footer: {
      ...BOARD_FOOTER[locale],
      columns: arr(footer.columns, 'footer.columns').map((c, i) => {
        const co = obj(c, `footer.columns[${i}]`)
        return {
          heading: loc(co.title, locale, `footer.columns[${i}].title`),
          links: arr(co.links, `footer.columns[${i}].links`).map((l, j) =>
            link(l, locale, `footer.columns[${i}].links[${j}]`),
          ),
        }
      }),
      legal: arr(footer.legal, 'footer.legal').map((l, i) => link(l, locale, `footer.legal[${i}]`)),
      anbi: {
        heading: loc(anbi.title, locale, 'footer.org.anbi.title'),
        body: loc(anbi.body, locale, 'footer.org.anbi.body'),
        ids: str(anbi.numbers, 'footer.org.anbi.numbers'),
        link: anbiLink.label,
        href: anbiLink.href,
      },
      postal,
      registered,
    },
  }
}

/** What the site says about cookie consent, against what the board's consent.ts assumes. */
export function consentMismatch(payload: Json): string | null {
  try {
    const c = obj(obj(payload, 'payload').consent, 'consent')
    const problems: string[] = []
    if (c.storageKey !== CONSENT_STORAGE_KEY) {
      problems.push(`storage key: site "${String(c.storageKey)}", board "${CONSENT_STORAGE_KEY}"`)
    }
    if (c.version !== CONSENT_VERSION) {
      problems.push(`version: site ${String(c.version)}, board ${CONSENT_VERSION}`)
    }
    const categories = Array.isArray(c.categories) ? [...c.categories].sort().join(',') : String(c.categories)
    if (categories !== 'analytics,marketing') {
      problems.push(`categories: site [${categories}], board [analytics,marketing]`)
    }
    return problems.length ? problems.join('; ') : null
  } catch (e) {
    return `could not read the site's consent settings (${(e as Error).message})`
  }
}

export async function fetchSiteChromePayload(init?: RequestInit): Promise<Json> {
  const res = await fetch(SITE_CHROME_URL, {
    next: { revalidate: REVALIDATE },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...init,
  } as RequestInit)
  if (!res.ok) throw new Error(`${SITE_CHROME_URL} answered ${res.status}`)
  return res.json()
}

/** The saved snapshot, for when the site can't be reached. Tests keep it parseable. */
export function fallbackChrome(locale: Locale): SiteChrome {
  return { ...parseSiteChrome(snapshot, locale), source: 'fallback' }
}

/** The header and footer for one language: the site's, or the snapshot if that fails. */
export async function loadSiteChrome(locale: Locale): Promise<SiteChrome> {
  const warn = (m: string) => console.warn(`[site-chrome] ${m}`)
  try {
    const payload = await fetchSiteChromePayload()
    const mismatch = consentMismatch(payload)
    if (mismatch) console.error(`[site-chrome] cookie consent differs from the site: ${mismatch}`)
    return { ...parseSiteChrome(payload, locale, warn), source: 'site' }
  } catch (e) {
    warn(`using the saved snapshot: ${(e as Error).message}`)
    return fallbackChrome(locale)
  }
}
