'use client'

/**
 * The editable half of /review/social: the three captions, removing a role,
 * and the decision (approve, skip, reopen, redraft). Writes through
 * /api/review/social and refreshes the server page after each change.
 */

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import s from './review.module.css'
import u from './ui.module.css'
import x from './social.module.css'

type Channel = 'instagram' | 'linkedinOrg' | 'linkedinPersonal'

export type EditorPost = {
  theme: string
  status: 'draft' | 'approved' | 'skipped' | 'posted'
  captions: Record<Channel, string> | null
  error: string | null
  roles: { id: string; title: string; employer: string }[]
}

const CHANNELS: { key: Channel; label: string; limit: number }[] = [
  { key: 'instagram', label: 'EA Netherlands on Instagram', limit: 2200 },
  { key: 'linkedinOrg', label: 'EA Netherlands on LinkedIn', limit: 3000 },
  { key: 'linkedinPersonal', label: 'James on LinkedIn', limit: 3000 },
]

async function send(payload: Record<string, unknown>) {
  const res = await fetch('/api/review/social', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong saving that. Try again.')
}

export function SocialEditor({
  post,
  minRoles,
  themes,
}: {
  post: EditorPost | null
  minRoles: number
  /** The themes a week can switch to. */
  themes: { key: string; label: string }[]
}) {
  const router = useRouter()
  const [captions, setCaptions] = useState<Record<Channel, string> | null>(post?.captions ?? null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState(post?.theme ?? 'mixed')
  const editable = post?.status === 'draft'
  const dirty = Boolean(post?.captions && captions && CHANNELS.some((c) => captions[c.key] !== post.captions![c.key]))

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
          Nothing drafted for this week yet. The Monday cron does this at 11:30; you can also do it now. It picks the
          roles shown below and writes the captions, which takes about a minute.
        </p>
        <div className={s.actions}>
          <button className={`${u.btn} ${u.btnSolid}`} disabled={busy !== null} onClick={() => act('draft')}>
            {busy === 'draft' ? 'Drafting…' : 'Draft this week’s post'}
          </button>
        </div>
        {error ? <p className={s.error}>{error}</p> : null}
      </div>
    )
  }

  const tooFew = post.roles.length < minRoles

  return (
    <>
      <div className={x.decision}>
        <p className={x.status}>
          {post.status === 'draft'
            ? 'Draft: waiting for you'
            : post.status === 'approved'
              ? 'Approved: this will go out on Tuesday'
              : post.status === 'skipped'
                ? 'Skipped this week'
                : 'Posted'}
        </p>
        {post.error ? <p className={s.error}>{post.error}</p> : null}
        {tooFew ? (
          <p className={s.hint}>
            {post.roles.length} roles, fewer than the {minRoles} a post needs, so it can’t be approved. Skip this week,
            or add roles to the board and redraft.
          </p>
        ) : null}
        <div className={s.actions}>
          {editable ? (
            <>
              <button
                className={`${u.btn} ${u.btnSolid}`}
                disabled={busy !== null || tooFew || !post.captions || dirty}
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
                disabled={busy !== null}
                onClick={() =>
                  act(
                    'draft',
                    { theme: post.theme },
                    'Pick the roles again and rewrite all three captions? Your edits will be lost.',
                  )
                }
              >
                {busy === 'draft' ? 'Redrafting…' : 'Redraft'}
              </button>
            </>
          ) : post.status !== 'posted' ? (
            <button className={`${u.btn} ${u.btnSubtle}`} disabled={busy !== null} onClick={() => act('reopen')}>
              Reopen to edit
            </button>
          ) : null}
        </div>
        {editable && themes.length ? (
          <div className={x.themeSwitch}>
            <label className={s.noteLabel} htmlFor="social-theme">
              Theme this week
            </label>
            <div className={s.actions}>
              <select
                id="social-theme"
                className={u.select}
                value={theme}
                disabled={busy !== null}
                onChange={(e) => setTheme(e.target.value)}
              >
                {themes.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                className={`${u.btn} ${u.btnSubtle}`}
                disabled={busy !== null || theme === post.theme}
                onClick={() =>
                  act('draft', { theme }, 'Switch the theme? This picks new roles and rewrites the captions.')
                }
              >
                {busy === 'draft' ? 'Switching…' : 'Switch theme'}
              </button>
            </div>
          </div>
        ) : null}
        {error ? <p className={s.error}>{error}</p> : null}
      </div>

      <section className={x.section}>
        <h2 className={x.heading}>Roles</h2>
        <ol className={x.picks}>
          {post.roles.map((role, i) => (
            <li key={role.id} className={x.pick}>
              <span className={x.pickNumber}>{i + 1}</span>
              <div className={x.roleRow}>
                <div>
                  <div className={x.pickTitle}>{role.title}</div>
                  <div className={x.pickMeta}>{role.employer}</div>
                </div>
                {editable ? (
                  <button
                    className={`${u.btn} ${u.btnGhost} ${u.btnSmall}`}
                    disabled={busy !== null}
                    onClick={() =>
                      act(
                        'remove',
                        { listingId: role.id },
                        dirty || post.captions
                          ? `Remove “${role.title}”? The job lists in the captions are rebuilt, which undoes any edits to the captions.`
                          : undefined,
                      )
                    }
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {captions ? (
        <section className={x.section}>
          <h2 className={x.heading}>Captions</h2>
          {CHANNELS.map((c) => {
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
                  rows={14}
                  readOnly={!editable}
                  onChange={(e) => setCaptions({ ...captions, [c.key]: e.target.value })}
                  disabled={busy !== null}
                />
              </label>
            )
          })}
          {editable ? (
            <div className={s.actions}>
              <button
                className={`${u.btn} ${u.btnSolid}`}
                disabled={busy !== null || !dirty}
                onClick={() => act('save', { captions })}
              >
                {busy === 'save' ? 'Saving…' : 'Save captions'}
              </button>
              {dirty ? (
                <button
                  className={`${u.btn} ${u.btnGhost}`}
                  disabled={busy !== null}
                  onClick={() => setCaptions(post.captions)}
                >
                  Undo edits
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  )
}
