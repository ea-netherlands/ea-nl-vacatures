/**
 * Outbound mail, via Resend over plain `fetch`.
 *
 * No SDK: it is one POST, and this codebase avoids dependencies it does not
 * need. Callers check `isMailConfigured()` first and log a setup gap rather
 * than throwing — a missing key should not turn a cron into a red deployment
 * (see the feedback digest in sanity/notify.ts, which set that convention).
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/**
 * Must be a domain verified in Resend. Defaults to the board's own subdomain
 * rather than a generic sender so a reply lands somewhere a person reads.
 */
export const MAIL_FROM =
  process.env.FEEDBACK_DIGEST_FROM ?? 'Vacaturebord <vacatures@effectiefaltruisme.nl>'

export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

export async function sendMail(message: {
  to: string[]
  subject: string
  text: string
  html?: string
  from?: string
}): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: message.from ?? MAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Resend returned ${res.status}: ${detail.slice(0, 300)}`)
  }
}
