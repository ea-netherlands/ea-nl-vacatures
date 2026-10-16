/**
 * Cookie consent, shared with the main site.
 *
 * The board is served at effectiefaltruisme.nl/vacatures and /en/jobs through
 * a rewrite in the website repo, so it is the same origin as the rest of the
 * site — but the HTML is this app's, and the website's layout (its Consent Mode
 * defaults, its banner, its Tag Manager) never reaches it. Until September 2026
 * that meant the board was invisible to the site's analytics, and an ad landing
 * here could not record a conversion.
 *
 * This is a port of the website's `src/lib/consent.ts`, kept deliberately
 * byte-compatible with it: same storage key, same version, same stored shape,
 * same event names. Same origin means same localStorage, so a visitor who
 * accepted on the home page is already covered here and is never asked twice.
 * If the website bumps CONSENT_VERSION or changes the categories, this file has
 * to change with it — otherwise the two halves of one site disagree about what
 * a visitor agreed to.
 */

export const CONSENT_STORAGE_KEY = 'ean-consent'
export const CONSENT_VERSION = 1

// Fired on window after a visitor saves a choice (detail: ConsentCategories)
export const CONSENT_CHANGE_EVENT = 'ean:consent-change'
// Fire on window to reopen the preferences dialog, e.g. from the footer
export const CONSENT_OPEN_EVENT = 'ean:consent-open'

export type ConsentCategory = 'analytics' | 'marketing'
export type ConsentCategories = Record<ConsentCategory, boolean>

interface StoredConsent {
  v: number
  ts: string
  categories: ConsentCategories
}

// Cookies set by tags in GTM, per category. Cleared when consent is withdrawn.
const CATEGORY_COOKIES: Record<ConsentCategory, RegExp> = {
  analytics: /^(_ga|_gid|_gat|_clck|_clsk)/,
  marketing: /^(_gcl_|_fbp|_fbc)/,
}

export function readConsent(): ConsentCategories | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as StoredConsent
    if (stored?.v !== CONSENT_VERSION || !stored.categories) return null
    return {
      analytics: Boolean(stored.categories.analytics),
      marketing: Boolean(stored.categories.marketing),
    }
  } catch {
    return null
  }
}

export function hasAnyConsent(categories: ConsentCategories | null): boolean {
  return Boolean(categories && (categories.analytics || categories.marketing))
}

export function toGoogleConsent(categories: ConsentCategories) {
  const analytics = categories.analytics ? 'granted' : 'denied'
  const marketing = categories.marketing ? 'granted' : 'denied'
  return {
    analytics_storage: analytics,
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
  }
}

function clearCookies(pattern: RegExp) {
  const host = window.location.hostname
  const domains = ['', host, `.${host}`, `.${host.replace(/^www\./, '')}`]
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim()
    if (!pattern.test(name)) continue
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`
    }
  }
}

/**
 * Save the visitor's choice, update Google Consent Mode and notify listeners.
 * Returns true when a previously granted category was withdrawn, in which case
 * the caller should reload so already-loaded tags stop running.
 */
export function saveConsent(categories: ConsentCategories): boolean {
  const previous = readConsent()
  const stored: StoredConsent = {
    v: CONSENT_VERSION,
    ts: new Date().toISOString(),
    categories,
  }

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Storage blocked: the choice still applies for this page view
  }

  window.gtag?.('consent', 'update', toGoogleConsent(categories))

  let withdrawn = false
  for (const category of Object.keys(CATEGORY_COOKIES) as ConsentCategory[]) {
    if (!categories[category]) {
      clearCookies(CATEGORY_COOKIES[category])
      if (previous?.[category]) withdrawn = true
    }
  }

  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: categories }))

  return withdrawn
}

/**
 * Inline script for <head>: sets Consent Mode defaults before any Google tag
 * can load. Everything is denied unless the visitor already agreed.
 */
export const consentDefaultsScript = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
(function () {
  var c = null;
  try {
    var s = JSON.parse(localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)}));
    if (s && s.v === ${CONSENT_VERSION} && s.categories) c = s.categories;
  } catch (e) {}
  var a = c && c.analytics ? "granted" : "denied";
  var m = c && c.marketing ? "granted" : "denied";
  gtag("consent", "default", {
    analytics_storage: a,
    ad_storage: m,
    ad_user_data: m,
    ad_personalization: m,
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500
  });
  gtag("set", "ads_data_redaction", true);
})();
`

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}
