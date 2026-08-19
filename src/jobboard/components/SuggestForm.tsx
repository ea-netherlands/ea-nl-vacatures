/**
 * The suggestion form.
 *
 * Four fields and a submit button. Every additional field is a reason for
 * someone to close the tab, and the only one that genuinely matters is the
 * link — a curator can find the rest from it. The email is optional and says
 * so in its label rather than in small print underneath.
 *
 * It posts JSON rather than a form submission because the honeypot and timing
 * checks want to travel with the payload, and because the reader should get an
 * answer without losing the page they were on.
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { t, type Locale } from '../content/i18n'
import { Icon } from './Icon'
import u from './ui.module.css'

type State = 'idle' | 'sending' | 'sent' | 'error'

export function SuggestForm({ locale }: { locale: Locale }) {
  const copy = t(locale)
  const [state, setState] = useState<State>('idle')
  const [kind, setKind] = useState<'listing' | 'employer'>('listing')

  // When the form was rendered, so the endpoint can reject a submission that
  // arrived faster than a person could have typed it. A ref rather than state:
  // it must not reset when the reader picks a different radio button.
  const openedAt = useRef<number>(0)
  useEffect(() => {
    openedAt.current = Date.now()
  }, [])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState('sending')
    const form = new FormData(event.currentTarget)

    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind,
          url: form.get('url'),
          organisation: form.get('organisation'),
          why: form.get('why'),
          submitterEmail: form.get('submitterEmail'),
          website: form.get('website'), // honeypot
          elapsedMs: Date.now() - openedAt.current,
        }),
      })
      setState(res.ok ? 'sent' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <div className={u.introBand}>
        <h2 className={u.onwardHeading}>{copy.suggestThanksHeading}</h2>
        <p className={u.introBody}>{copy.suggestThanksBody}</p>
      </div>
    )
  }

  return (
    <form className={u.suggestForm} onSubmit={onSubmit}>
      <fieldset className={u.suggestFieldset}>
        <legend className={u.filterLabel}>{copy.suggestKindLabel}</legend>
        <div className={u.suggestRadios}>
          {(['listing', 'employer'] as const).map((value) => (
            <label key={value} className={u.suggestRadio}>
              <input
                type="radio"
                name="kind"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
              />
              {value === 'listing' ? copy.suggestKindListing : copy.suggestKindEmployer}
            </label>
          ))}
        </div>
      </fieldset>

      <label className={u.suggestField}>
        <span className={u.filterLabel}>
          {kind === 'listing' ? copy.suggestUrlListing : copy.suggestUrlEmployer}
        </span>
        <input
          className={u.suggestInput}
          type="url"
          name="url"
          required
          placeholder="https://"
          autoComplete="off"
        />
      </label>

      <label className={u.suggestField}>
        <span className={u.filterLabel}>{copy.suggestOrgLabel}</span>
        <input
          className={u.suggestInput}
          type="text"
          name="organisation"
          required
          maxLength={120}
          autoComplete="off"
        />
      </label>

      <label className={u.suggestField}>
        <span className={u.filterLabel}>{copy.suggestWhyLabel}</span>
        <span className={u.suggestHint}>{copy.suggestWhyHint}</span>
        <textarea className={u.suggestTextarea} name="why" rows={4} maxLength={2000} />
      </label>

      <label className={u.suggestField}>
        <span className={u.filterLabel}>{copy.suggestEmailLabel}</span>
        <span className={u.suggestHint}>{copy.suggestEmailHint}</span>
        <input
          className={u.suggestInput}
          type="email"
          name="submitterEmail"
          maxLength={200}
          autoComplete="email"
        />
      </label>

      {/*
        The honeypot. Hidden from people with CSS rather than `type="hidden"`,
        which scripts know to skip, and marked aria-hidden with tabIndex -1 so a
        screen reader and the keyboard both pass it by.
      */}
      <div className={u.honeypot} aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className={u.suggestActions}>
        <button className={u.suggestSubmit} type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? copy.suggestSending : copy.suggestSubmit}
          <Icon name="arrow-right" />
        </button>
        {state === 'error' ? <p className={u.suggestError}>{copy.suggestError}</p> : null}
      </div>
    </form>
  )
}
