'use client'

/**
 * /review/social, phase 3: the accounts the post goes out from, and what
 * happened on posting day, including the by-hand bundle for EA Nederland's
 * LinkedIn page. Writes through /api/review/social.
 */

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import s from './review.module.css'
import u from './ui.module.css'
import x from './social.module.css'

type ConnectionView = { connected: boolean; accountName: string | null; expiresAt: string | null; error?: string }

async function send(payload: Record<string, unknown>) {
  const res = await fetch('/api/review/social', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong saving that. Try again.')
}

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' })

function useAct() {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function act(key: string, payload: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return false
    setBusy(key)
    setError(null)
    try {
      await send(payload)
      router.refresh()
      return true
    } catch (err) {
      setError((err as Error).message)
      return false
    } finally {
      setBusy(null)
    }
  }
  return { busy, error, act }
}

export function SocialConnections({
  instagram,
  linkedin,
  linkedinConfigured,
  postingEnabled,
  times,
  notice,
}: {
  instagram: ConnectionView
  linkedin: ConnectionView
  linkedinConfigured: boolean
  postingEnabled: boolean
  times: { instagram: string; linkedin: string }
  notice: string | null
}) {
  const { busy, error, act } = useAct()
  const [token, setToken] = useState('')
  const soon = (iso: string | null) => Boolean(iso && new Date(iso).getTime() - Date.now() < 14 * 864e5)

  return (
    <section className={x.section}>
      <h2 className={x.heading}>Accounts</h2>
      {!postingEnabled ? (
        <p className={x.warning}>
          Posting is switched off: nothing goes out until <code>SOCIAL_POSTING=on</code> is set on Vercel. Connect the
          accounts first, then switch it on.
        </p>
      ) : null}
      {notice ? <p className={s.hint}>{notice}</p> : null}

      <ul className={x.picks}>
        <li className={x.account}>
          <div>
            <div className={x.pickTitle}>EA Netherlands on Instagram · Tuesdays {times.instagram}</div>
            <div className={x.pickMeta}>
              {instagram.connected
                ? `Connected as @${instagram.accountName ?? 'unknown'}. The token renews itself on Mondays.`
                : instagram.error
                  ? `Can’t read connections: ${instagram.error}`
                  : 'Not connected. Paste a long-lived access token from the Meta app (Instagram API with Instagram Login).'}
            </div>
          </div>
          {instagram.connected ? (
            <button
              className={`${u.btn} ${u.btnGhost} ${u.btnSmall}`}
              disabled={busy !== null}
              onClick={() => act('ig-off', { action: 'disconnect', channel: 'instagram' }, 'Disconnect Instagram?')}
            >
              Disconnect
            </button>
          ) : null}
        </li>
        {!instagram.connected ? (
          <li>
            <form
              className={s.actions}
              onSubmit={async (e) => {
                e.preventDefault()
                if (await act('ig', { action: 'instagram-token', token })) setToken('')
              }}
            >
              <label className={u.srOnly} htmlFor="ig-token">
                Instagram access token
              </label>
              <input
                id="ig-token"
                className={u.suggestTextarea}
                type="password"
                autoComplete="off"
                placeholder="Instagram access token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={busy !== null}
              />
              <button className={`${u.btn} ${u.btnSolid}`} disabled={busy !== null || !token.trim()}>
                {busy === 'ig' ? 'Checking…' : 'Connect Instagram'}
              </button>
            </form>
          </li>
        ) : null}

        <li className={x.account}>
          <div>
            <div className={x.pickTitle}>James on LinkedIn · Tuesdays {times.linkedin}</div>
            <div className={x.pickMeta}>
              {linkedin.connected
                ? `Connected as ${linkedin.accountName ?? 'you'}${linkedin.expiresAt ? `, until ${day(linkedin.expiresAt)}` : ''}. LinkedIn makes you reconnect every 60 days.`
                : linkedinConfigured
                  ? 'Not connected.'
                  : 'Not set up yet: LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are missing on Vercel.'}
            </div>
          </div>
          {linkedinConfigured ? (
            <a
              className={`${u.btn} ${linkedin.connected && !soon(linkedin.expiresAt) ? u.btnGhost : u.btnSolid} ${u.btnSmall}`}
              href="/api/review/social/linkedin"
            >
              {linkedin.connected ? 'Reconnect' : 'Connect LinkedIn'}
            </a>
          ) : null}
        </li>

        <li className={x.account}>
          <div>
            <div className={x.pickTitle}>EA Netherlands on LinkedIn · Tuesdays {times.linkedin}, by hand</div>
            <div className={x.pickMeta}>
              Posting as the page needs LinkedIn’s Community Management API, granted by application. Until then you get
              a reminder with the slides and caption ready to post.
            </div>
          </div>
        </li>
      </ul>
      {error ? <p className={s.error}>{error}</p> : null}
    </section>
  )
}

type Result = { at: string; id?: string; url?: string | null; error?: string; attempts?: number; manual?: boolean }

export function SocialPostingDay({
  postDate,
  heading,
  rows,
  bundle,
}: {
  postDate: string
  heading: string
  rows: { label: string; time: string; result: Result | null; manual?: boolean }[]
  /** EA Nederland's LinkedIn, by hand: the slides and the caption. */
  bundle: { slides: string[]; caption: string; done: boolean }
}) {
  const { busy, error, act } = useAct()
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState('')

  const status = (r: Result | null, manual?: boolean) =>
    r?.id
      ? r.url
        ? 'Posted'
        : r.id === 'manual'
          ? 'Marked as posted'
          : 'Posted'
      : r?.error
        ? `Failed (${r.attempts ?? 1} of 3): ${r.error}`
        : manual
          ? 'To post by hand'
          : 'Waiting'

  return (
    <section className={x.section}>
      <h2 className={x.heading}>{heading}</h2>
      <ul className={x.picks}>
        {rows.map((row) => (
          <li key={row.label} className={x.account}>
            <div>
              <div className={x.pickTitle}>
                {row.label} · {row.time}
              </div>
              <div className={x.pickMeta}>
                {status(row.result, row.manual)}
                {row.result?.url ? (
                  <>
                    {' '}
                    ·{' '}
                    <a href={row.result.url} target="_blank" rel="noreferrer">
                      View
                    </a>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!bundle.done ? (
        <div className={x.decision}>
          <p className={x.status}>EA Netherlands on LinkedIn, by hand</p>
          <p className={s.hint}>
            On the page, start a post, add these images in order (LinkedIn takes up to 20), and paste the caption.
          </p>
          <div className={s.actions}>
            {bundle.slides.map((src, i) => (
              <a key={src} className={`${u.btn} ${u.btnGhost} ${u.btnSmall}`} href={src} download={`slide-${i + 1}.png`}>
                Slide {i + 1}
              </a>
            ))}
          </div>
          <div className={s.actions}>
            <button
              className={`${u.btn} ${u.btnSubtle}`}
              onClick={async () => {
                await navigator.clipboard.writeText(bundle.caption)
                setCopied(true)
              }}
            >
              {copied ? 'Caption copied' : 'Copy caption'}
            </button>
          </div>
          <form
            className={s.actions}
            onSubmit={(e) => {
              e.preventDefault()
              act('mark', { action: 'mark-posted', postDate, url: url.trim() || undefined })
            }}
          >
            <label className={u.srOnly} htmlFor="li-url">
              Link to the LinkedIn post (optional)
            </label>
            <input
              id="li-url"
              className={u.suggestTextarea}
              placeholder="Link to the post (optional)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button className={`${u.btn} ${u.btnSolid}`} disabled={busy !== null}>
              {busy === 'mark' ? 'Saving…' : 'Mark as posted'}
            </button>
          </form>
          {error ? <p className={s.error}>{error}</p> : null}
        </div>
      ) : null}
    </section>
  )
}
