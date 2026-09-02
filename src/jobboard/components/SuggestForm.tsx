/**
 * The feedback form.
 *
 * ## What changed, September 2026
 *
 * This was a tip form: pick "a vacancy" or "an organisation", paste a link,
 * send. That is still the highest-value thing anyone can send us — coverage is
 * the board's binding constraint, and most Dutch employers cannot be followed
 * automatically — so those two remain the first two options.
 *
 * But they were the *only* two, and a form that accepts nothing else tells a
 * reader with different feedback that there is nowhere to put it. While the
 * board is in beta the other cases are worth at least as much: a listing that
 * should not be here, a whole field we are blind to, a page nobody could
 * navigate. Those readers previously got an email address in the footer, which
 * asks them to compose a message from a blank page.
 *
 * So there are six kinds now, and the form reshapes itself around the one
 * picked. The pointer kinds keep their required link and organisation, because
 * for those the link *is* the suggestion. The other four drop both to optional
 * and promote the message to required — for a correction or a gap, the
 * sentences are the whole content, and demanding a URL first would turn
 * someone away who has something to say about the board as a whole.
 *
 * It posts JSON rather than a form submission because the honeypot and timing
 * checks want to travel with the payload, and because the reader should get an
 * answer without losing the page they were on.
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import {
  FEEDBACK_KINDS,
  POINTER_KINDS,
  t,
  type FeedbackKind,
  type Locale,
} from '../content/i18n'
import { Icon } from './Icon'
import u from './ui.module.css'

type State = 'idle' | 'sending' | 'sent' | 'error'

export function SuggestForm({ locale }: { locale: Locale }) {
  const copy = t(locale)
  const [state, setState] = useState<State>('idle')
  const [kind, setKind] = useState<FeedbackKind>('listing')

  /*
    Whether this kind points at a specific thing on the web.

    Everything conditional in the form hangs off this one question rather than
    off a per-kind table, so a seventh kind added later gets sensible defaults
    instead of silently falling through every branch.
  */
  const pointer = POINTER_KINDS.includes(kind)

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
        {/*
          A stacked list of labelled options rather than a row of bare radios.
          Six kinds is more than a row can carry, and the hint under each label
          is doing real work: "something here is wrong" means nothing until it
          says that a closed vacancy and a reason you disagree with both count.
        */}
        <div className={u.suggestKindList}>
          {FEEDBACK_KINDS.map((value) => (
            <label
              key={value}
              className={`${u.suggestKind} ${kind === value ? u.suggestKindActive : ''}`}
            >
              <input
                type="radio"
                name="kind"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
              />
              <span className={u.suggestKindText}>
                <span className={u.suggestKindLabelText}>{copy.feedbackKinds[value].label}</span>
                <span className={u.suggestKindHint}>{copy.feedbackKinds[value].hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className={u.suggestField}>
        <span className={u.filterLabel}>
          {kind === 'listing'
            ? copy.suggestUrlListing
            : kind === 'employer'
              ? copy.suggestUrlEmployer
              : copy.feedbackUrlOptional}
        </span>
        <input
          className={u.suggestInput}
          type="url"
          name="url"
          required={pointer}
          placeholder="https://"
          autoComplete="off"
        />
      </label>

      {/*
        The organisation field disappears entirely for the two kinds that are
        about the site rather than about an employer. Leaving it visible but
        optional would ask someone reporting a broken filter to work out
        whether it applies to them.
      */}
      {kind !== 'site' && kind !== 'other' ? (
        <label className={u.suggestField}>
          <span className={u.filterLabel}>
            {pointer ? copy.suggestOrgLabel : copy.feedbackOrgOptional}
          </span>
          <input
            className={u.suggestInput}
            type="text"
            name="organisation"
            required={pointer}
            maxLength={120}
            autoComplete="off"
          />
        </label>
      ) : null}

      <label className={u.suggestField}>
        <span className={u.filterLabel}>
          {pointer ? copy.suggestWhyLabel : copy.feedbackMessageLabel}
        </span>
        <span className={u.suggestHint}>
          {pointer ? copy.suggestWhyHint : copy.feedbackMessageHint}
        </span>
        <textarea
          className={u.suggestTextarea}
          name="why"
          rows={pointer ? 4 : 6}
          required={!pointer}
          maxLength={2000}
        />
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
