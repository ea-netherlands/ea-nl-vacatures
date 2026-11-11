'use client'

/**
 * The editable parts of /review/social/explainer, one per account: the source
 * (with other suggestions to swap to), the slide text, the caption and the
 * decision. Writes through /api/review/social/explainer and refreshes the
 * server page after each change.
 */

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import s from './review.module.css'
import u from './ui.module.css'
import x from './social.module.css'

type Channel = 'linkedinPersonal' | 'instagram'
type SlideText = {
  cover: { headline: string; marked: string; sub: string }
  points: { heading: string; body: string }[]
}
type SourceView = { key: string; kind: 'forum' | 'instagram'; title: string; author: string; url: string }

export type ExplainerItemView = {
  status: 'draft' | 'approved' | 'skipped' | 'posted'
  source: SourceView | null
  topic: string | null
  suggestions: (SourceView & { reason: string })[]
  slides: SlideText | null
  caption: string | null
  flags: string[]
  error: string | null
}

const LIMIT = { headline: 80, sub: 160, heading: 70, body: 300 }
const CAPTION_LIMIT: Record<Channel, number> = { linkedinPersonal: 3000, instagram: 2200 }

async function send(payload: Record<string, unknown>) {
  const res = await fetch('/api/review/social/explainer', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong saving that. Try again.')
}

function useAct() {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function act(key: string, payload: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(key)
    setError(null)
    try {
      await send(payload)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }
  return { busy, error, act }
}

const sourceLine = (src: SourceView) =>
  src.kind === 'forum' ? `EA Forum, by ${src.author}` : 'Centre for Effective Altruism on Instagram'

function Field({
  label,
  value,
  limit,
  rows = 1,
  readOnly,
  onChange,
}: {
  label: string
  value: string
  limit: number
  rows?: number
  readOnly: boolean
  onChange: (v: string) => void
}) {
  return (
    <label className={s.noteField}>
      <span className={s.noteLabel}>
        {label}
        <span className={value.length > limit ? s.countBad : s.count}>
          {value.length} / {limit}
        </span>
      </span>
      {rows > 1 ? (
        <textarea
          className={u.suggestTextarea}
          rows={rows}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input className={u.suggestTextarea} value={value} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  )
}

/** Before anything is drafted for the week. */
export function ExplainerFirstDraft({ day }: { day: string }) {
  const { busy, error, act } = useAct()
  return (
    <div className={x.decision}>
      <p className={s.hint}>
        Nothing drafted for {day} yet. The Wednesday cron does this at 11:30; you can also do it now. It picks a source
        for each account and writes both explainers, which takes a minute or two.
      </p>
      <div className={s.actions}>
        <button className={`${u.btn} ${u.btnSolid}`} disabled={busy !== null} onClick={() => act('draft', { action: 'draft' })}>
          {busy === 'draft' ? 'Drafting…' : 'Draft this week’s explainers'}
        </button>
      </div>
      {error ? <p className={s.error}>{error}</p> : null}
    </div>
  )
}

export function ExplainerEditor({
  channel,
  item,
  postingTime,
}: {
  channel: Channel
  item: ExplainerItemView | null
  postingTime: string
}) {
  const { busy, error, act } = useAct()
  const [slides, setSlides] = useState(item?.slides ?? null)
  const [caption, setCaption] = useState(item?.caption ?? null)
  const editable = item?.status === 'draft'
  const dirty =
    JSON.stringify(slides) !== JSON.stringify(item?.slides ?? null) || caption !== (item?.caption ?? null)
  const send = (action: string, extra: Record<string, unknown> = {}, confirmText?: string) =>
    act(action, { action, channel, ...extra }, confirmText)

  if (!item) {
    return (
      <div className={x.decision}>
        <p className={s.hint}>Nothing drafted for this account yet.</p>
        <div className={s.actions}>
          <button className={`${u.btn} ${u.btnSolid}`} disabled={busy !== null} onClick={() => send('draft')}>
            {busy === 'draft' ? 'Drafting…' : 'Draft it'}
          </button>
        </div>
        {error ? <p className={s.error}>{error}</p> : null}
      </div>
    )
  }

  const setCover = (field: keyof SlideText['cover'], value: string) =>
    slides && setSlides({ ...slides, cover: { ...slides.cover, [field]: value } })
  const setPoint = (i: number, field: 'heading' | 'body', value: string) =>
    slides && setSlides({ ...slides, points: slides.points.map((p, j) => (j === i ? { ...p, [field]: value } : p)) })
  const swapWarning = 'Draft this account’s explainer from this source instead? The current slides and caption, and your edits, will be replaced.'

  return (
    <>
      <div className={x.decision}>
        <p className={x.status}>
          {item.status === 'draft'
            ? 'Draft: waiting for you'
            : item.status === 'approved'
              ? `Approved: it goes out ${postingTime}`
              : item.status === 'skipped'
                ? 'Skipped this week'
                : 'Posted'}
        </p>
        {item.source ? (
          <p>
            From{' '}
            <a href={item.source.url} target="_blank" rel="noreferrer">
              {item.source.title}
            </a>{' '}
            <span className={x.pickMeta}>
              ({sourceLine(item.source)}
              {item.topic ? ` · ${item.topic}` : ''})
            </span>
          </p>
        ) : null}
        {item.error ? <p className={s.error}>{item.error}</p> : null}
        {item.flags.length ? (
          <div>
            <p className={s.noteLabel}>Check before approving</p>
            <ul className={x.flags}>
              {item.flags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className={s.actions}>
          {editable ? (
            <>
              <button
                className={`${u.btn} ${u.btnSolid}`}
                disabled={busy !== null || !item.slides || dirty}
                title={dirty ? 'Save your edits first' : undefined}
                onClick={() => send('approve')}
              >
                {busy === 'approve' ? 'Approving…' : 'Approve'}
              </button>
              <button className={`${u.btn} ${u.btnSubtle}`} disabled={busy !== null} onClick={() => send('skip')}>
                Skip this week
              </button>
              <button
                className={`${u.btn} ${u.btnGhost}`}
                disabled={busy !== null || !item.source}
                onClick={() =>
                  send('draft', { source: item.source?.key }, 'Rewrite the slides and caption from the same source? Your edits will be lost.')
                }
              >
                {busy === 'draft' ? 'Working…' : 'Redraft'}
              </button>
              <button
                className={`${u.btn} ${u.btnGhost}`}
                disabled={busy !== null}
                onClick={() =>
                  send('draft', { pass: true }, 'Drop this source for good and pick a new one? This takes a minute or two.')
                }
              >
                Not this one
              </button>
            </>
          ) : item.status !== 'posted' ? (
            <button className={`${u.btn} ${u.btnSubtle}`} disabled={busy !== null} onClick={() => send('reopen')}>
              Reopen to edit
            </button>
          ) : null}
        </div>
        {error ? <p className={s.error}>{error}</p> : null}
      </div>

      {editable && item.suggestions.length ? (
        <details className={x.more}>
          <summary>Other suggestions for this account</summary>
          <ul className={x.picks}>
            {item.suggestions.map((sug) => (
              <li key={sug.key} className={x.account}>
                <div>
                  <a className={x.pickTitle} href={sug.url} target="_blank" rel="noreferrer">
                    {sug.title}
                  </a>
                  <div className={x.pickMeta}>
                    {sourceLine(sug)}. {sug.reason}
                  </div>
                </div>
                <button
                  className={`${u.btn} ${u.btnGhost} ${u.btnSmall}`}
                  disabled={busy !== null}
                  onClick={() => send('draft', { source: sug.key }, swapWarning)}
                >
                  Use this one
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {slides ? (
        <details className={x.more} open={editable}>
          <summary>Slide text</summary>
          <p className={s.hint}>The last slide, with the credit and the monthly email, is added for you.</p>
          <div className={x.lang}>
            <span className={x.pairHead}>Cover</span>
            <Field label="Headline" value={slides.cover.headline} limit={LIMIT.headline} readOnly={!editable} onChange={(v) => setCover('headline', v)} />
            <Field
              label="Highlighted end of the headline"
              value={slides.cover.marked}
              limit={40}
              readOnly={!editable}
              onChange={(v) => setCover('marked', v)}
            />
            <Field label="Line below" value={slides.cover.sub} limit={LIMIT.sub} rows={3} readOnly={!editable} onChange={(v) => setCover('sub', v)} />
          </div>
          {slides.points.map((point, i) => (
            <div key={i} className={x.lang}>
              <span className={x.pairHead}>
                Slide {i + 2}
                {editable && slides.points.length > 3 ? (
                  <button
                    className={`${u.btn} ${u.btnGhost} ${u.btnSmall}`}
                    disabled={busy !== null}
                    onClick={() => setSlides({ ...slides, points: slides.points.filter((_, j) => j !== i) })}
                  >
                    Remove slide
                  </button>
                ) : null}
              </span>
              <Field label="Heading" value={point.heading} limit={LIMIT.heading} readOnly={!editable} onChange={(v) => setPoint(i, 'heading', v)} />
              <Field label="Text" value={point.body} limit={LIMIT.body} rows={5} readOnly={!editable} onChange={(v) => setPoint(i, 'body', v)} />
            </div>
          ))}
        </details>
      ) : null}

      {caption !== null ? (
        <label className={s.noteField}>
          <span className={s.noteLabel}>
            Caption
            <span className={caption.length > CAPTION_LIMIT[channel] ? s.countBad : s.count}>
              {caption.length} / {CAPTION_LIMIT[channel]}
            </span>
          </span>
          <textarea
            className={`${u.suggestTextarea} ${x.caption}`}
            value={caption}
            rows={12}
            readOnly={!editable}
            onChange={(e) => setCaption(e.target.value)}
            disabled={busy !== null}
          />
        </label>
      ) : null}

      {editable && slides && caption !== null ? (
        <div className={s.actions}>
          <button
            className={`${u.btn} ${u.btnSolid}`}
            disabled={busy !== null || !dirty}
            onClick={() => send('save', { slides, caption })}
          >
            {busy === 'save' ? 'Saving…' : 'Save edits'}
          </button>
          {dirty ? (
            <button
              className={`${u.btn} ${u.btnGhost}`}
              disabled={busy !== null}
              onClick={() => {
                setSlides(item.slides)
                setCaption(item.caption)
              }}
            >
              Undo edits
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
