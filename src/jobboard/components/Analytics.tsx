/**
 * Consent banner, Google Tag Manager and the apply-click conversion.
 *
 * ## Why the board carries its own copy of the site's tracking
 *
 * The website serves this app at /vacatures and /en/jobs through a rewrite, so
 * a reader sees one site — but the HTML is ours, and none of the website's
 * layout reaches it. Checked in September 2026: the home page had the Consent
 * Mode defaults, the banner and a dataLayer; /en/jobs had none of the three.
 * The board was invisible to the site's analytics, and a Google Ads campaign
 * pointed at it could not record a single conversion.
 *
 * So this mounts the same three things the website's layout does, behaving the
 * same way: GTM loads only after a visitor agrees to analytics or marketing
 * (Consent Mode "basic"), and the choice lives in the same localStorage key.
 * Same origin, so a visitor who answered on the home page is not asked again.
 *
 * ## The conversion
 *
 * `apply_click` is pushed when a reader follows an apply link — the closest
 * thing to an application a link-out board can see. The server-side log in
 * `/api/jobs/[id]/apply` still records every click regardless of consent and
 * of ad blockers; that is the number to check Google's against, not a
 * replacement for it. Nothing is pushed without consent, because without
 * consent GTM is never loaded and the dataLayer has no reader.
 *
 * Rebuilt in plain elements rather than ported from the website's Chakra
 * version: this module deliberately has no UI framework (§6.2a), and at merge
 * time the website's own banner replaces this one.
 *
 * Written in September 2026 but never committed; landed in October 2026 along
 * with the footer's "Cookie settings" button, which needs this banner to open.
 */

'use client'

import Script from 'next/script'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ONWARD_LINKS, t, type Locale } from '../content/i18n'
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_OPEN_EVENT,
  hasAnyConsent,
  readConsent,
  saveConsent,
  type ConsentCategories,
  type ConsentCategory,
} from '../lib/consent'
import { Icon } from './Icon'
import c from './consent.module.css'
import u from './ui.module.css'

// The website's container, by default in production builds: an unset env var
// used to mean a board that silently reported nothing. Not in development, so
// localhost traffic never reaches the live analytics — set a dummy ID locally
// to watch the consent-gated loader work.
const GTM_ID =
  process.env.NEXT_PUBLIC_GTM_CONTAINER_ID ||
  (process.env.NODE_ENV === 'production' ? 'GTM-NJK5ZXD' : undefined)

const NONE: ConsentCategories = { analytics: false, marketing: false }
const ALL: ConsentCategories = { analytics: true, marketing: true }
const OPTIONAL_CATEGORIES: ConsentCategory[] = ['analytics', 'marketing']

/** Everything the board needs for measurement, in one mount point. */
export function Analytics({ locale }: { locale: Locale }) {
  return (
    <>
      <CookieConsent locale={locale} />
      {GTM_ID ? <GoogleTagManager gtmId={GTM_ID} /> : null}
      <ApplyClickTracker />
    </>
  )
}

function GoogleTagManager({ gtmId }: { gtmId: string }) {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const update = () => setAllowed(hasAnyConsent(readConsent()))
    update()
    window.addEventListener(CONSENT_CHANGE_EVENT, update)
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, update)
  }, [])

  if (!allowed) return null

  return (
    <Script id="gtm-init" strategy="afterInteractive">
      {`
      (function(w,d,s,l,i){
        w[l]=w[l]||[];
        w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
        var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),
            dl=l!='dataLayer'?'&l='+l:'';
        j.async=true;
        j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
        f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${gtmId}');
      `}
    </Script>
  )
}

/**
 * One delegated listener rather than an onClick on the apply button, so any
 * apply link the board renders now or later is counted without remembering to
 * wire it up. Links opt in with `data-apply-listing`.
 */
function ApplyClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[data-apply-listing]')
      if (!link || !hasAnyConsent(readConsent())) return
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push({
        event: 'apply_click',
        listing_id: link.getAttribute('data-apply-listing'),
        employer: link.getAttribute('data-apply-employer') ?? undefined,
      })
    }
    // Capture phase, so the push lands before the navigation starts.
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])
  return null
}

function CookieConsent({ locale }: { locale: Locale }) {
  const copy = t(locale).cookie
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [bannerOpen, setBannerOpen] = useState(false)
  const [draft, setDraft] = useState<ConsentCategories>(NONE)

  useEffect(() => {
    if (!readConsent()) setBannerOpen(true)
  }, [])

  const openPreferences = useCallback(() => {
    setDraft(readConsent() ?? NONE)
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    window.addEventListener(CONSENT_OPEN_EVENT, openPreferences)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, openPreferences)
  }, [openPreferences])

  const commit = (categories: ConsentCategories) => {
    const withdrawn = saveConsent(categories)
    setBannerOpen(false)
    dialogRef.current?.close()
    // Tags that already ran can't be unloaded, so start the page fresh
    if (withdrawn) window.location.reload()
  }

  const privacyHref = locale === 'en' ? ONWARD_LINKS.privacyPolicyEn : ONWARD_LINKS.privacyPolicyNl

  return (
    <>
      {bannerOpen ? (
        <div role="region" aria-labelledby="cookie-banner-title" className={c.banner}>
          <div className={c.bannerPanel}>
            <div className={c.bannerText}>
              <span className={c.bannerIcon} aria-hidden="true">
                <Icon name="cookie" />
              </span>
              <div>
                <h2 id="cookie-banner-title" className={c.bannerTitle}>
                  {copy.title}
                </h2>
                <p className={c.bannerBody}>
                  {copy.description} <a href={privacyHref}>{copy.privacyLink}</a>
                </p>
              </div>
            </div>
            <div className={c.bannerActions}>
              <button type="button" className={`${u.btn} ${u.btnGhost}`} onClick={openPreferences}>
                {copy.customise}
              </button>
              <button type="button" className={`${u.btn} ${u.btnSubtle}`} onClick={() => commit(NONE)}>
                {copy.rejectAll}
              </button>
              <button type="button" className={`${u.btn} ${u.btnSolid}`} onClick={() => commit(ALL)}>
                {copy.acceptAll}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <dialog ref={dialogRef} className={c.dialog} aria-labelledby="cookie-prefs-title">
        <div className={c.dialogHeader}>
          <h2 id="cookie-prefs-title" className={c.dialogTitle}>
            {copy.prefsTitle}
          </h2>
          <p className={c.dialogDescription}>{copy.prefsDescription}</p>
          <button
            type="button"
            className={c.dialogClose}
            aria-label={copy.close}
            onClick={() => dialogRef.current?.close()}
          >
            <Icon name="x" />
          </button>
        </div>

        <div className={c.dialogBody}>
          <CategoryRow
            id="necessary"
            title={copy.necessaryTitle}
            description={copy.necessaryDescription}
            badge={copy.alwaysOn}
            checked
            disabled
          />
          {OPTIONAL_CATEGORIES.map((category) => (
            <CategoryRow
              key={category}
              id={category}
              title={category === 'analytics' ? copy.analyticsTitle : copy.marketingTitle}
              description={
                category === 'analytics' ? copy.analyticsDescription : copy.marketingDescription
              }
              checked={draft[category]}
              onChange={(checked) => setDraft((d) => ({ ...d, [category]: checked }))}
            />
          ))}
        </div>

        <div className={c.dialogFooter}>
          <button type="button" className={`${u.btn} ${u.btnSubtle}`} onClick={() => commit(NONE)}>
            {copy.rejectAll}
          </button>
          <button type="button" className={`${u.btn} ${u.btnSubtle}`} onClick={() => commit(draft)}>
            {copy.save}
          </button>
          <button type="button" className={`${u.btn} ${u.btnSolid}`} onClick={() => commit(ALL)}>
            {copy.acceptAll}
          </button>
        </div>
      </dialog>
    </>
  )
}

function CategoryRow({
  id,
  title,
  description,
  checked,
  badge,
  disabled,
  onChange,
}: {
  id: string
  title: string
  description: string
  checked: boolean
  badge?: string
  disabled?: boolean
  onChange?: (checked: boolean) => void
}) {
  return (
    <div className={c.row}>
      <div className={c.rowText}>
        <p className={c.rowTitle}>
          <label htmlFor={`consent-${id}`}>{title}</label>
          {badge ? <span className={c.rowBadge}>{badge}</span> : null}
        </p>
        <p className={c.rowDescription}>{description}</p>
      </div>
      <input
        id={`consent-${id}`}
        type="checkbox"
        role="switch"
        className={c.switch}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
    </div>
  )
}

/**
 * Reopens the preferences dialog. Lives in the footer's legal row, like the
 * website's; the label comes from there too (site-chrome.ts).
 */
export function CookieSettingsLink({ label, className }: { label: string; className?: string }) {
  return (
    <button
      type="button"
      className={`${c.settingsLink}${className ? ` ${className}` : ''}`}
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
    >
      {label}
    </button>
  )
}
