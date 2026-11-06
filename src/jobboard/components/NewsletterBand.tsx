/**
 * Sign-up for EA Netherlands' monthly email, on the board.
 *
 * The email (November 2026) lists new roles and programmes from this board,
 * plus the next six weeks of events and the best of the EA Forum, on the first
 * Tuesday of every month. Job seekers come back to the board again and again,
 * so this is where a monthly reminder is most useful.
 *
 * It posts to the website's /api/newsletter, not one of the board's own. The
 * board is served from effectiefaltruisme.nl (multi-zones), and /api/newsletter
 * is not one of the paths forwarded to it, so the website answers. On the
 * board's own subdomain or localhost that route does not exist, and the form
 * shows its error.
 *
 * Readers pick the language they want the email in; Mailchimp stores it and
 * the website's digest sends the Dutch edition to "nl" and English to everyone
 * else. New subscribers get a confirmation email first (double opt-in).
 */

'use client'

import { track } from '@vercel/analytics'
import { useId, useState } from 'react'
import type { Locale } from '../content/i18n'
import { readConsent } from '../lib/consent'
import { Icon } from './Icon'
import u from './ui.module.css'

// GA4 property "EAN website", as in Analytics.tsx
const GA4_MEASUREMENT_ID = 'G-KWJ584SDNL'

const COPY = {
  nl: {
    heading: 'Nieuwe vacatures in je inbox',
    body: 'Elke eerste dinsdag van de maand: nieuwe vacatures en programma’s van dit bord, plus evenementen in de komende zes weken en het beste van het EA Forum.',
    languageLegend: 'In welke taal?',
    emailLabel: 'E-mailadres',
    placeholder: 'jij@voorbeeld.nl',
    submit: 'Aanmelden',
    sending: 'Bezig…',
    fine: 'Je krijgt eerst een mail om je aanmelding te bevestigen. Afmelden kan altijd.',
    pending: 'Bijna klaar. Kijk in je inbox en klik op de link om je aanmelding te bevestigen.',
    subscribed: (l: Locale) =>
      `Je bent al aangemeld. Vanaf nu krijg je de ${l === 'nl' ? 'Nederlandse' : 'Engelse'} versie.`,
    errors: {
      invalid: 'Dat e-mailadres lijkt niet te kloppen. Controleer het en probeer het opnieuw.',
      blocked: 'We kunnen dit adres hier niet aanmelden. Mail info@effectiefaltruisme.nl, dan regelen we het.',
      failed: 'Er ging iets mis. Probeer het opnieuw, of mail info@effectiefaltruisme.nl.',
    },
  },
  en: {
    heading: 'New roles in your inbox',
    body: 'On the first Tuesday of every month: new jobs and programmes from this board, plus events in the next six weeks and the best of the EA Forum.',
    languageLegend: 'Which language?',
    emailLabel: 'Email address',
    placeholder: 'you@example.com',
    submit: 'Sign up',
    sending: 'Signing up…',
    fine: 'We’ll email you a link to confirm first. Unsubscribe any time.',
    pending: 'Almost done. Check your inbox and click the link to confirm.',
    subscribed: (l: Locale) =>
      `You’re already subscribed. You’ll get the ${l === 'nl' ? 'Dutch' : 'English'} edition from now on.`,
    errors: {
      invalid: 'That email address doesn’t look right. Check it and try again.',
      blocked: 'We can’t sign up this address from here. Email info@effectiefaltruisme.nl and we’ll sort it out.',
      failed: 'Something went wrong. Try again, or email info@effectiefaltruisme.nl.',
    },
  },
} as const

const LANGUAGES: { value: Locale; label: string }[] = [
  { value: 'nl', label: 'Nederlands' },
  { value: 'en', label: 'English' },
]

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'done'; status: 'pending' | 'subscribed'; edition: Locale }
  | { kind: 'error'; error: 'invalid' | 'blocked' | 'failed' }

export function NewsletterBand({ locale }: { locale: Locale }) {
  const copy = COPY[locale]
  const id = useId()
  const [edition, setEdition] = useState<Locale>(locale)
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState({ kind: 'sending' })
    const form = new FormData(event.currentTarget)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          edition,
          website: form.get('website'), // honeypot
        }),
      })
      const data = (await res.json()) as
        | { ok: true; status: 'pending' | 'subscribed' }
        | { ok: false; error: string }
      if (!('error' in data)) {
        setState({ kind: 'done', status: data.status, edition })
        // Cookieless, so it counts every sign-up; two properties, the Pro limit
        track('newsletter_signup', { placement: 'jobs', edition })
        if (readConsent()?.analytics) {
          window.gtag?.('event', 'newsletter_signup', {
            placement: 'jobs',
            edition,
            site_language: locale,
            send_to: GA4_MEASUREMENT_ID,
          })
        }
      } else {
        setState({
          kind: 'error',
          error: data.error === 'invalid' || data.error === 'blocked' ? data.error : 'failed',
        })
      }
    } catch {
      setState({ kind: 'error', error: 'failed' })
    }
  }

  return (
    <div className={u.feedbackBand}>
      <span className={u.feedbackBandIcon} aria-hidden="true">
        <Icon name="mail" />
      </span>
      <div className={u.feedbackBandMain}>
        <h2 className={u.feedbackBandHeading}>{copy.heading}</h2>
        <p className={u.feedbackBandBody}>{copy.body}</p>

        {state.kind === 'done' ? (
          <p className={u.newsletterDone} role="status">
            <Icon name="circle-check" />
            {state.status === 'subscribed' ? copy.subscribed(state.edition) : copy.pending}
          </p>
        ) : (
          <form className={u.newsletterForm} onSubmit={onSubmit}>
            <fieldset className={u.newsletterLanguages}>
              <legend>{copy.languageLegend}</legend>
              {LANGUAGES.map((l) => (
                <label key={l.value}>
                  <input
                    type="radio"
                    name="edition"
                    value={l.value}
                    checked={edition === l.value}
                    onChange={() => setEdition(l.value)}
                  />
                  {l.label}
                </label>
              ))}
            </fieldset>

            <div className={u.newsletterRow}>
              <label htmlFor={`${id}-email`} className={u.srOnly}>
                {copy.emailLabel}
              </label>
              <input
                id={`${id}-email`}
                className={u.suggestInput}
                type="email"
                name="email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder={copy.placeholder}
                disabled={state.kind === 'sending'}
              />
              <button className={u.suggestSubmit} type="submit" disabled={state.kind === 'sending'}>
                {state.kind === 'sending' ? copy.sending : copy.submit}
              </button>
            </div>

            {/* Hidden from people; bots fill it in. See SuggestForm. */}
            <div className={u.honeypot} aria-hidden="true">
              <label>
                Website
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            {state.kind === 'error' ? (
              <p className={u.suggestError} role="alert">
                {copy.errors[state.error]}
              </p>
            ) : (
              <p className={u.newsletterFine}>{copy.fine}</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
