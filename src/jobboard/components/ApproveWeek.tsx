'use client'

/** The weekly review's one button (/review/social/week). */

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import s from './review.module.css'
import u from './ui.module.css'

export function ApproveWeek({ count }: { count: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function approve() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/review/social/week', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'approve-all' }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Try again.')
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={s.actions}>
      <button type="button" className={`${u.btn} ${u.btnSolid}`} onClick={approve} disabled={busy || count === 0}>
        {busy ? 'Approving…' : count === 1 ? 'Approve 1 post' : `Approve all ${count} posts`}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  )
}
