'use client'

/**
 * The editable half of /review/social/explainer: the slide text in English and
 * Dutch side by side, both captions, the source (with other suggestions to
 * swap to) and the decision. Writes through /api/review/social/explainer and
 * refreshes the server page after each change.
 */

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import s from './review.module.css'
import u from './ui.module.css'
import x from './social.module.css'

type Lang = 'en' | 'nl'
type SlideText = {
  cover: { headline: string; marked: string; sub: string }
  points: { heading: string; body: string }[]
}
type Captions = { linkedinPersonal: string; instagram: string }
type SourceView = { key: string; kind: 'forum' | 'instagram'; title: string; author: string; url: string }

export type ExplainerEditorPost = {
  status: 'draft' | 'approved' | 'skipped' | 'posted'
  source: SourceView | null
  topic: string | null
  suggestions: (SourceView & { reason: string })[]
  slides: Record<Lang, SlideText> | null
  captions: Captions | null
  flags: string[]
  error: string | null
}

const LANG_LABEL: Record<Lang, string> = { en: 'English, for your LinkedIn', nl: 'Dutch, for Instagram' }
const CAPTIONS: { key: keyof Captions; label: string; limit: number }[] = [
  { key: 'linkedinPersonal', label: 'James on LinkedIn, in English', limit: 3000 },
  { key: 'instagram', label: 'EA Netherlands on Instagram, in Dutch', limit: 2200 },
]
const LIMIT = { headline: 80, sub: 160, heading: 70, body: 300 }

async function send(payload: Record<string, unknown>) {
  const res = await fetch('/api/review/social/explainer', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong saving that. Try again.')
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

export function ExplainerEditor({ post, day }: { post: ExplainerEditorPost | null; day: string }) {
  const router = useRouter()
  const [slides, setSlides] = useState(post?.slides ?? null)
  const [captions, setCaptions] = useState(post?.captions ?? null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const editable = post?.status === 'draft'
  const dirty =
    JSON.stringify(slides) !== JSON.stringify(post?.slides ?? null) ||
    JSON.stringify(captions) !== JSON.stringify(post?.captions ?? null)

  async function act(action: string, extra: Record<string, unknown> = {}, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(action)
    setError(null)
    try {
      await send({ action, ...extra })
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  if (!post) {
    return (
      <div className={x.decision}>
        <p className={s.hint}>
          Nothing drafted for {day} yet. The Wednesday cron does this at 11:30; you can also do it now. It picks a source
          and writes both languages, which takes a minute or two.
        </p>
        <div className={s.actions}>
          <button className={`${u.btn} ${u.btnSolid}`} disabled={busy !== null} onClick={() => act('draft')}>
            {busy === 'draft' ? 'Drafting…' : 'Draft this week’s explainer'}
          </button>
        </div>
        {error ? <p className={s.error}>{error}</p> : null}
      </div>
    )
  }

  const setCover = (lang: Lang, field: keyof SlideText['cover'], value: string) =>
    slides && setSlides({ ...slides, [lang]: { ...slides[lang], cover: { ...slides[lang].cover, [field]: value } } })
  const setPoint = (lang: Lang, i: number, field: 'heading' | 'body', value: string) =>
    slides &&
    setSlides({
      ...slides,
      [lang]: {
        ...slides[lang],
        points: slides[lang].points.map((p, j) => (j === i ? { ...p, [field]: value } : p)),
      },
    })
  const removePoint = (i: number) =>
    slides &&
    setSlides({
      en: { ...slides.en, points: slides.en.points.filter((_, j) => j !== i) },
      nl: { ...slides.nl, points: slides.nl.points.filter((_, j) => j !== i) },
    })
  const pointCount = slides ? Math.max(slides.en.points.length, slides.nl.points.length) : 0
  const swapWarning = 'Draft from this source instead? The current slides and captions, and your edits, will be replaced.'

  return (
    <>
      <div className={x.decision}>
        <p className={x.status}>
          {post.status === 'draft'
            ? 'Draft: waiting for you'
            : post.status === 'approved'
              ? 'Approved: it goes out on Thursday'
              : post.status === 'skipped'
                ? 'Skipped this week'
                : 'Posted'}
        </p>
        {post.source ? (
          <p>
            From{' '}
            <a href={post.source.url} target="_blank" rel="noreferrer">
              {post.source.title}
            </a>{' '}
            <span className={x.pickMeta}>
              ({sourceLine(post.source)}
              {post.topic ? ` · ${post.topic}` : ''})
            </span>
          </p>
        ) : null}
        {post.error ? <p className={s.error}>{post.error}</p> : null}
        {post.flags.length ? (
          <div>
            <p className={s.noteLabel}>Check before approving</p>
            <ul className={x.flags}>
              {post.flags.map((f) => (
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
                disabled={busy !== null || !post.slides || dirty}
                title={dirty ? 'Save your edits first' : undefined}
                onClick={() => act('approve')}
              >
                {busy === 'approve' ? 'Approving…' : 'Approve'}
              </button>
              <button className={`${u.btn} ${u.btnSubtle}`} disabled={busy !== null} onClick={() => act('skip')}>
                Skip this week
              </button>
              <button
                className={`${u.btn} ${u.btnGhost}`}
                disabled={busy !== null || !post.source}
                onClick={() =>
                  act('draft', { source: post.source?.key }, 'Rewrite the slides and captions from the same source? Your edits will be lost.')
                }
              >
                {busy === 'draft' ? 'Working…' : 'Redraft'}
              </button>
              <button
                className={`${u.btn} ${u.btnGhost}`}
                disabled={busy !== null}
                onClick={() =>
                  act('draft', { pass: true }, 'Drop this source for good and pick a new one? This takes a minute or two.')
                }
              >
                Not this one
              </button>
            </>
          ) : post.status !== 'posted' ? (
            <button className={`${u.btn} ${u.btnSubtle}`} disabled={busy !== null} onClick={() => act('reopen')}>
              Reopen to edit
            </button>
          ) : null}
        </div>
        {error ? <p className={s.error}>{error}</p> : null}
      </div>

      {editable && post.suggestions.length ? (
        <section className={x.section}>
          <h2 className={x.heading}>Other suggestions</h2>
          <ul className={x.picks}>
            {post.suggestions.map((sug) => (
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
                  onClick={() => act('draft', { source: sug.key }, swapWarning)}
                >
                  Use this one
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {slides ? (
        <section className={x.section}>
          <h2 className={x.heading}>Slide text</h2>
          <p className={s.hint}>
            The last slide, with the credit and the monthly email, is added for you. Save, then check the slides below.
          </p>
          <div className={x.pair}>
            <div className={x.pairHead}>Cover</div>
            {(['en', 'nl'] as const).map((lang) => (
              <div key={lang} className={x.lang}>
                <span className={s.noteLabel}>{LANG_LABEL[lang]}</span>
                <Field
                  label="Headline"
                  value={slides[lang].cover.headline}
                  limit={LIMIT.headline}
                  readOnly={!editable}
                  onChange={(v) => setCover(lang, 'headline', v)}
                />
                <Field
                  label="Highlighted end of the headline"
                  value={slides[lang].cover.marked}
                  limit={40}
                  readOnly={!editable}
                  onChange={(v) => setCover(lang, 'marked', v)}
                />
                <Field
                  label="Line below"
                  value={slides[lang].cover.sub}
                  limit={LIMIT.sub}
                  rows={3}
                  readOnly={!editable}
                  onChange={(v) => setCover(lang, 'sub', v)}
                />
              </div>
            ))}
          </div>
          {Array.from({ length: pointCount }, (_, i) => (
            <div key={i} className={x.pair}>
              <div className={x.pairHead}>
                Slide {i + 2}
                {editable && pointCount > 3 ? (
                  <button
                    className={`${u.btn} ${u.btnGhost} ${u.btnSmall}`}
                    disabled={busy !== null}
                    onClick={() => removePoint(i)}
                  >
                    Remove slide
                  </button>
                ) : null}
              </div>
              {(['en', 'nl'] as const).map((lang) => {
                const point = slides[lang].points[i] ?? { heading: '', body: '' }
                return (
                  <div key={lang} className={x.lang}>
                    <span className={s.noteLabel}>{LANG_LABEL[lang]}</span>
                    <Field
                      label="Heading"
                      value={point.heading}
                      limit={LIMIT.heading}
                      readOnly={!editable}
                      onChange={(v) => setPoint(lang, i, 'heading', v)}
                    />
                    <Field
                      label="Text"
                      value={point.body}
                      limit={LIMIT.body}
                      rows={5}
                      readOnly={!editable}
                      onChange={(v) => setPoint(lang, i, 'body', v)}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </section>
      ) : null}

      {captions ? (
        <section className={x.section}>
          <h2 className={x.heading}>Captions</h2>
          {CAPTIONS.map((c) => {
            const n = captions[c.key].length
            return (
              <label key={c.key} className={s.noteField}>
                <span className={s.noteLabel}>
                  {c.label}
                  <span className={n > c.limit ? s.countBad : s.count}>
                    {n} / {c.limit}
                  </span>
                </span>
                <textarea
                  className={`${u.suggestTextarea} ${x.caption}`}
                  value={captions[c.key]}
                  rows={12}
                  readOnly={!editable}
                  onChange={(e) => setCaptions({ ...captions, [c.key]: e.target.value })}
                  disabled={busy !== null}
                />
              </label>
            )
          })}
        </section>
      ) : null}

      {editable && slides && captions ? (
        <div className={s.actions}>
          <button
            className={`${u.btn} ${u.btnSolid}`}
            disabled={busy !== null || !dirty}
            onClick={() => act('save', { slides, captions })}
          >
            {busy === 'save' ? 'Saving…' : 'Save edits'}
          </button>
          {dirty ? (
            <button
              className={`${u.btn} ${u.btnGhost}`}
              disabled={busy !== null}
              onClick={() => {
                setSlides(post.slides)
                setCaptions(post.captions)
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
