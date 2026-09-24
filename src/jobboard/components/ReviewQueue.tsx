'use client'

/**
 * The review dashboard's queue: one card per waiting listing, one click to
 * decide.
 *
 * Built around the one thing a curator actually does here, which is read the
 * draft note and judge it. So the note is an editable field at the top of each
 * card rather than something behind an "edit" button: fixing a word and
 * publishing is still one click, and the note stays the product (README, "the
 * editorial note is the product").
 *
 * Rejecting has two speeds. "Reject" is the one-click version for the obvious
 * ones. "Tell us why" opens a reason — a category plus a sentence — and that
 * reason is shown to the classifier on its next run (review/calibration.ts),
 * so the obvious ones stop arriving.
 */

import { useState } from 'react'
import { Icon } from './Icon'
import u from './ui.module.css'
import s from './review.module.css'
import { REJECT_CATEGORIES, type RejectCategory } from '../review/categories'
import type { ReviewItem } from '../review/queue'

const NOTE_MIN = 80
const NOTE_MAX = 600

type Outcome = { kind: 'published'; href: string | null } | { kind: 'rejected'; withReason: boolean }

function formatDate(value: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

async function decide(payload: Record<string, unknown>): Promise<{ ok: true; publishedId?: string }> {
  const res = await fetch('/api/review/decide', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string; publishedId?: string }
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong saving that. Try again.')
  return { ok: true, publishedId: data.publishedId }
}

function ReviewCard({
  item,
  anchor,
  onDecided,
}: {
  item: ReviewItem
  anchor: string
  onDecided: (outcome: Outcome) => void
}) {
  const [note, setNote] = useState(item.note)
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reasonOpen, setReasonOpen] = useState(false)
  const [category, setCategory] = useState<RejectCategory | null>(null)
  const [reason, setReason] = useState('')

  const length = note.trim().length
  const noteOk = length >= NOTE_MIN && length <= NOTE_MAX
  const closes = formatDate(item.deadlineAt)

  async function accept() {
    setBusy('accept')
    setError(null)
    try {
      await decide({ action: 'accept', draftId: item.draftId, note })
      onDecided({ kind: 'published', href: item.slug ? `/vacatures/${item.slug}` : null })
    } catch (err) {
      setError((err as Error).message)
      setBusy(null)
    }
  }

  async function reject(withReason: boolean) {
    setBusy('reject')
    setError(null)
    try {
      await decide({
        action: 'reject',
        draftId: item.draftId,
        ...(withReason ? { category, reason } : {}),
      })
      onDecided({ kind: 'rejected', withReason })
    } catch (err) {
      setError((err as Error).message)
      setBusy(null)
    }
  }

  return (
    <article id={anchor} className={`${u.card} ${s.item}`} aria-busy={busy !== null}>
      <header className={s.itemHead}>
        <h2 className={s.itemTitle}>{item.title}</h2>
        <p className={u.cardMeta}>
          {item.employerName ? (
            <span className={u.cardMetaItem}>
              <Icon name="building" /> {item.employerName}
            </span>
          ) : null}
          {item.location ? (
            <span className={u.cardMetaItem}>
              <Icon name="map-pin" /> {item.location}
            </span>
          ) : null}
          {item.seniority ? (
            <span className={u.cardMetaItem}>
              <Icon name="stairs" /> {item.seniority}
            </span>
          ) : null}
          {item.salary ? (
            <span className={u.cardMetaItem}>
              <Icon name="coin" /> {item.salary}
            </span>
          ) : null}
          {closes ? (
            <span className={u.cardMetaItem}>
              <Icon name="calendar" /> Closes {closes}
            </span>
          ) : null}
        </p>
        <div className={u.cardTags}>
          {item.cause ? <span className={`${u.badge} ${u.badgeCause}`}>{item.cause}</span> : null}
          {item.subArea ? <span className={`${u.badge} ${u.badgeNeutral}`}>{item.subArea}</span> : null}
          {item.skills.map((skill) => (
            <span key={skill} className={`${u.badge} ${u.badgeNeutral}`}>
              {skill}
            </span>
          ))}
          {item.leverage ? <span className={`${u.badge} ${u.badgeOutline}`}>{item.leverage}</span> : null}
          {item.score != null ? (
            <span className={`${u.badge} ${u.badgeOutline}`}>Score {item.score}</span>
          ) : null}
        </div>
      </header>

      <label className={s.noteField}>
        <span className={s.noteLabel}>
          Why this is on the board
          <span className={noteOk ? s.count : s.countBad}>
            {length} / {NOTE_MIN}–{NOTE_MAX}
          </span>
        </span>
        <textarea
          className={`${u.suggestTextarea} ${s.note}`}
          value={note}
          rows={4}
          onChange={(e) => setNote(e.target.value)}
          disabled={busy !== null}
        />
      </label>

      <div className={s.actions}>
        <button
          type="button"
          className={`${u.btn} ${u.btnSolid}`}
          onClick={accept}
          disabled={busy !== null || !noteOk}
        >
          <Icon name="circle-check" />
          {busy === 'accept' ? 'Publishing…' : 'Publish'}
        </button>
        <button
          type="button"
          className={`${u.btn} ${u.btnSubtle}`}
          onClick={() => reject(false)}
          disabled={busy !== null}
        >
          <Icon name="x" />
          {busy === 'reject' && !reasonOpen ? 'Rejecting…' : 'Reject'}
        </button>
        <button
          type="button"
          className={`${u.btn} ${u.btnGhost}`}
          onClick={() => setReasonOpen((open) => !open)}
          aria-expanded={reasonOpen}
          disabled={busy !== null}
        >
          <Icon name="message" />
          Tell us why
        </button>
        {item.applyUrl ? (
          <a className={s.adLink} href={item.applyUrl} target="_blank" rel="noopener noreferrer">
            Read the ad <Icon name="external-link" />
          </a>
        ) : null}
      </div>
      {!noteOk ? (
        <p className={s.hint}>The note needs {NOTE_MIN} to {NOTE_MAX} characters before you can publish.</p>
      ) : null}

      {reasonOpen ? (
        <fieldset className={s.reason}>
          <legend className={s.reasonLegend}>What is wrong with it?</legend>
          <div className={s.chips}>
            {REJECT_CATEGORIES.map((c) => (
              <label key={c.value} className={`${s.chip} ${category === c.value ? s.chipActive : ''}`}>
                <input
                  type="radio"
                  name={`${anchor}-category`}
                  value={c.value}
                  checked={category === c.value}
                  onChange={() => setCategory(c.value)}
                  className={s.chipInput}
                />
                {c.label}
              </label>
            ))}
          </div>
          <label className={u.suggestField}>
            <span className={u.suggestHint}>
              A sentence the classifier can learn from. It sees your recent reasons on every run.
            </span>
            <textarea
              className={u.suggestTextarea}
              rows={2}
              value={reason}
              maxLength={1000}
              placeholder="For example: the leverage is the team's, not this role's"
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div>
            <button
              type="button"
              className={`${u.btn} ${u.btnSubtle}`}
              onClick={() => reject(true)}
              disabled={busy !== null || (!category && !reason.trim())}
            >
              {busy === 'reject' ? 'Rejecting…' : 'Reject and send feedback'}
            </button>
          </div>
        </fieldset>
      ) : null}

      {error ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}

      {item.reasoning || item.excerpt ? (
        <details className={s.details}>
          <summary>Why the classifier passed it</summary>
          {item.reasoning ? <p>{item.reasoning}</p> : null}
          {item.excerpt ? (
            <>
              <h3 className={s.detailsHeading}>From the ad</h3>
              <p>{item.excerpt}</p>
            </>
          ) : null}
          <p>
            <a href={`/studio/intent/edit/id=${item.draftId.replace(/^drafts\./, '')};type=jobListing/`}>
              Open in the Studio
            </a>{' '}
            to change anything else before publishing.
          </p>
        </details>
      ) : null}
    </article>
  )
}

export function ReviewQueue({ items, anchors }: { items: ReviewItem[]; anchors: string[] }) {
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({})
  const remaining = items.filter((i) => !outcomes[i.draftId]).length
  const published = Object.values(outcomes).filter((o) => o.kind === 'published').length
  const rejected = Object.values(outcomes).filter((o) => o.kind === 'rejected').length

  return (
    <>
      <p className={s.tally} aria-live="polite">
        {remaining === 0
          ? `You're done. ${published} published, ${rejected} rejected.`
          : `${remaining} waiting${published || rejected ? ` · ${published} published · ${rejected} rejected` : ''}`}
      </p>
      <ol className={s.list}>
        {items.map((item, index) => {
          const outcome = outcomes[item.draftId]
          if (outcome) {
            return (
              <li key={item.draftId} id={anchors[index]} className={s.done}>
                <Icon name={outcome.kind === 'published' ? 'circle-check' : 'x'} />
                <span className={s.doneTitle}>{item.title}</span>
                <span className={s.doneWhat}>
                  {outcome.kind === 'published' ? (
                    outcome.href ? (
                      <a href={outcome.href} target="_blank" rel="noopener noreferrer">
                        Published — view it on the board
                      </a>
                    ) : (
                      'Published'
                    )
                  ) : outcome.withReason ? (
                    'Rejected. The classifier will see your reason on its next run.'
                  ) : (
                    'Rejected'
                  )}
                </span>
              </li>
            )
          }
          return (
            <li key={item.draftId}>
              <ReviewCard
                item={item}
                anchor={anchors[index]}
                onDecided={(o) => setOutcomes((prev) => ({ ...prev, [item.draftId]: o }))}
              />
            </li>
          )
        })}
      </ol>
    </>
  )
}
