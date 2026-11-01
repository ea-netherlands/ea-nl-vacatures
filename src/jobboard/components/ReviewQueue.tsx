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
 * Above the note: what the role is and why it is here, in English, and where it
 * will appear on the board — which band, which problem and topic pages, which
 * filters — with the reason for each. "Change listing" opens the same fields as
 * controls; the explanation follows the edit, and publishing applies it and
 * tells the classifier what it got wrong.
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
import { explainPlacement, type ListingPlacement } from '../review/placement'
import { t } from '../content/i18n'
import {
  CAUSE_AREAS,
  LANGUAGE_REQUIREMENTS,
  LEVERAGE_TYPES,
  LISTING_KINDS,
  LOCATION_MODES,
  MAX_SKILLS_PER_LISTING,
  SENIORITIES,
  SKILLS,
  SUB_AREAS_BY_CAUSE,
  type CauseArea,
} from '../taxonomy'

const en = t('en')
const KIND_LABELS = { job: 'Job', programme: 'Programme (fellowship, residency, bootcamp)' } as const

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

function samePlacement(a: ListingPlacement, b: ListingPlacement): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function Select<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
  empty,
  hint,
}: {
  label: string
  value: T | null
  options: readonly T[]
  labels: Record<T, string>
  onChange: (value: T | null) => void
  /** Offer "none" as a choice, labelled with this. */
  empty?: string
  hint?: string
}) {
  return (
    <label className={u.filterField}>
      <span className={u.filterLabel}>{label}</span>
      <select
        className={u.select}
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value || null) as T | null)}
      >
        {empty !== undefined ? <option value="">{empty}</option> : null}
        {options.map((o) => (
          <option key={o} value={o}>
            {labels[o]}
          </option>
        ))}
      </select>
      {hint ? <span className={s.fieldHint}>{hint}</span> : null}
    </label>
  )
}

/** The listing's fields as controls. Every change re-runs the explanation above. */
function PlacementEditor({
  value,
  onChange,
}: {
  value: ListingPlacement
  onChange: (next: ListingPlacement) => void
}) {
  const set = <K extends keyof ListingPlacement>(key: K, v: ListingPlacement[K]) => onChange({ ...value, [key]: v })
  const subAreas = value.primaryCause ? SUB_AREAS_BY_CAUSE[value.primaryCause] : []
  const toggle = <T extends string>(list: T[], item: T) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item]

  return (
    <div className={s.editor}>
      <div className={s.editorGrid}>
        <Select
          label="Problem area"
          value={value.primaryCause}
          options={CAUSE_AREAS}
          labels={en.causeAreas}
          onChange={(c) =>
            onChange({
              ...value,
              primaryCause: c,
              // A sub-area from the old problem area would be invalid.
              subArea: null,
              secondaryCauses: value.secondaryCauses.filter((x) => x !== c),
            })
          }
        />
        <Select
          label="Topic"
          value={value.subArea}
          options={subAreas}
          labels={en.subAreas}
          onChange={(v) => set('subArea', v)}
          empty="None (cross-cutting)"
        />
        <Select
          label="Leverage"
          value={value.leverage}
          options={LEVERAGE_TYPES}
          labels={en.leverage}
          onChange={(v) => set('leverage', v)}
          hint="Not shown to readers, but it decides the section."
        />
        <Select
          label="Kind"
          value={value.listingKind}
          options={LISTING_KINDS}
          labels={KIND_LABELS}
          onChange={(v) => set('listingKind', v ?? 'job')}
        />
        <Select
          label="Seniority"
          value={value.seniority}
          options={SENIORITIES}
          labels={en.seniorities}
          onChange={(v) => set('seniority', v)}
          empty="Not stated"
        />
        <Select
          label="Location"
          value={value.locationMode}
          options={LOCATION_MODES}
          labels={en.locationModes}
          onChange={(v) => set('locationMode', v)}
          empty="Not stated"
        />
        <Select
          label="Language"
          value={value.languageRequirement}
          options={LANGUAGE_REQUIREMENTS}
          labels={en.languageRequirements}
          onChange={(v) => set('languageRequirement', v)}
          empty="Not stated"
        />
      </div>

      <fieldset className={s.editorSet}>
        <legend className={u.filterLabel}>
          Skills <span className={s.count}>pick 1 or {MAX_SKILLS_PER_LISTING}</span>
        </legend>
        <div className={s.chips}>
          {SKILLS.map((k) => {
            const on = value.skills.includes(k)
            return (
              <label key={k} className={`${s.chip} ${on ? s.chipActive : ''}`}>
                <input
                  type="checkbox"
                  className={s.chipInput}
                  checked={on}
                  disabled={!on && value.skills.length >= MAX_SKILLS_PER_LISTING}
                  onChange={() => set('skills', toggle(value.skills, k))}
                />
                {en.skills[k]}
              </label>
            )
          })}
        </div>
      </fieldset>

      <fieldset className={s.editorSet}>
        <legend className={u.filterLabel}>Also under</legend>
        <div className={s.chips}>
          {CAUSE_AREAS.filter((c) => c !== value.primaryCause).map((c) => {
            const on = value.secondaryCauses.includes(c)
            return (
              <label key={c} className={`${s.chip} ${on ? s.chipActive : ''}`}>
                <input
                  type="checkbox"
                  className={s.chipInput}
                  checked={on}
                  onChange={() => set('secondaryCauses', toggle<CauseArea>(value.secondaryCauses, c))}
                />
                {en.causeAreas[c]}
              </label>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}

function ReviewCard({
  item,
  anchor,
  boardOrigin,
  onDecided,
}: {
  item: ReviewItem
  anchor: string
  boardOrigin: string
  onDecided: (outcome: Outcome) => void
}) {
  const [note, setNote] = useState(item.note)
  const [placement, setPlacement] = useState<ListingPlacement>(item.placement)
  const [editing, setEditing] = useState(false)
  const [dutchOpen, setDutchOpen] = useState(!item.noteEn)
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reasonOpen, setReasonOpen] = useState(false)
  const [category, setCategory] = useState<RejectCategory | null>(null)
  const [reason, setReason] = useState('')

  const length = note.trim().length
  const noteOk = length >= NOTE_MIN && length <= NOTE_MAX
  const closes = formatDate(item.deadlineAt)
  const relisted = !samePlacement(placement, item.placement)
  const placementOk =
    placement.primaryCause != null &&
    placement.leverage != null &&
    placement.skills.length >= 1 &&
    placement.skills.length <= MAX_SKILLS_PER_LISTING
  const rows = explainPlacement(
    item.title,
    placement,
    item.employerName ? { name: item.employerName, slug: item.employerSlug } : null,
    boardOrigin,
  )
  const noteEdited = note.trim() !== item.note.trim()
  const about = item.excerptEn ?? item.excerpt

  async function accept() {
    setBusy('accept')
    setError(null)
    try {
      await decide({
        action: 'accept',
        draftId: item.draftId,
        note,
        ...(relisted ? { listing: placement } : {}),
      })
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
        {item.score != null ? (
          <div className={u.cardTags}>
            <span className={`${u.badge} ${u.badgeOutline}`}>Score {item.score}</span>
          </div>
        ) : null}
      </header>

      {about ? (
        <section className={s.block}>
          <h3 className={s.blockHeading}>What the role is</h3>
          <p className={s.prose}>{about}</p>
          {!item.excerptEn ? <p className={s.fieldHint}>In Dutch: there is no English translation yet.</p> : null}
        </section>
      ) : null}

      <section className={s.block}>
        <h3 className={s.blockHeading}>
          Why it is on the board
          <span className={noteOk ? s.count : s.countBad}>
            {length} / {NOTE_MIN}–{NOTE_MAX}
          </span>
        </h3>
        {item.noteEn && !noteEdited ? (
          <p className={`${s.prose} ${s.note}`}>{item.noteEn}</p>
        ) : item.noteEn ? (
          <p className={s.fieldHint}>
            You have edited the Dutch, so the English above it is out of date. It is translated again after you
            publish.
          </p>
        ) : null}
        {dutchOpen ? (
          <label className={s.noteField}>
            <span className={s.noteLabel}>
              {item.noteEn ? 'The Dutch note, which is what gets published' : 'In Dutch: there is no English translation yet'}
            </span>
            <textarea
              className={`${u.suggestTextarea} ${s.note}`}
              value={note}
              rows={4}
              lang="nl"
              onChange={(e) => setNote(e.target.value)}
              disabled={busy !== null}
            />
          </label>
        ) : (
          <button type="button" className={s.textButton} onClick={() => setDutchOpen(true)}>
            Edit the Dutch note
          </button>
        )}
      </section>

      <section className={s.block}>
        <h3 className={s.blockHeading}>
          Where it will be listed
          {relisted ? <span className={s.changed}>Changed</span> : null}
        </h3>
        <dl className={s.placement}>
          {rows.map((row, i) => (
            <div key={`${row.where}-${i}`} className={s.placementRow}>
              <dt>{row.where}</dt>
              <dd>
                {row.href ? (
                  <a href={row.href} target="_blank" rel="noopener noreferrer">
                    {row.value}
                  </a>
                ) : (
                  <strong>{row.value}</strong>
                )}
                {row.why ? <span className={s.placementWhy}>{row.why}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
        <div className={s.placementActions}>
          <button
            type="button"
            className={`${u.btn} ${u.btnGhost} ${u.btnSmall}`}
            onClick={() => setEditing((open) => !open)}
            aria-expanded={editing}
            disabled={busy !== null}
          >
            <Icon name="filter" />
            {editing ? 'Done changing' : 'Change listing'}
          </button>
          {relisted ? (
            <button
              type="button"
              className={`${u.btn} ${u.btnGhost} ${u.btnSmall}`}
              onClick={() => setPlacement(item.placement)}
              disabled={busy !== null}
            >
              <Icon name="x" />
              Undo changes
            </button>
          ) : null}
        </div>
        {editing ? <PlacementEditor value={placement} onChange={setPlacement} /> : null}
        {relisted ? (
          <p className={s.hint}>
            Publishing lists it as shown above, and the classifier sees what you changed on its next run.
          </p>
        ) : null}
        {!placementOk ? (
          <p className={s.hint}>Pick a problem area, a leverage type and one or two skills before you publish.</p>
        ) : null}
      </section>

      <div className={s.actions}>
        <button
          type="button"
          className={`${u.btn} ${u.btnSolid}`}
          onClick={accept}
          disabled={busy !== null || !noteOk || !placementOk}
        >
          <Icon name="circle-check" />
          {busy === 'accept' ? 'Publishing…' : relisted ? 'Publish with changes' : 'Publish'}
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

      {item.reasoning ? (
        <details className={s.details}>
          <summary>Why the classifier passed it</summary>
          <p>{item.reasoning}</p>
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

export function ReviewQueue({
  items,
  anchors,
  boardOrigin,
}: {
  items: ReviewItem[]
  anchors: string[]
  /** Where the public board lives, for the "where it will be listed" links. */
  boardOrigin: string
}) {
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
                boardOrigin={boardOrigin}
                onDecided={(o) => setOutcomes((prev) => ({ ...prev, [item.draftId]: o }))}
              />
            </li>
          )
        })}
      </ol>
    </>
  )
}
