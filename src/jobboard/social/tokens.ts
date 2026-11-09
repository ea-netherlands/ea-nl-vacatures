/**
 * Access tokens for the accounts the weekly post goes out from.
 *
 * In Postgres, encrypted, and never in Sanity: the board's Sanity dataset is
 * publicly readable, so anything written there can be fetched by anyone who
 * knows the project id. Each token is sealed with AES-256-GCM under
 * SOCIAL_TOKEN_KEY (or, if unset, a key derived from REVIEW_SECRET/CRON_SECRET),
 * so a database dump alone doesn't hand out the accounts.
 *
 * The table is created on first use as well as in schema.sql: production's
 * database is migrated by hand, and posting shouldn't wait on someone
 * remembering to.
 */

import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto'
import { getDb } from '../db/client'

export type TokenChannel = 'instagram' | 'linkedinPersonal'

export type StoredToken = {
  channel: TokenChannel
  accessToken: string
  expiresAt: Date | null
  /** The account the token posts as: Instagram user id, LinkedIn person URN. */
  accountId: string
  accountName: string | null
  updatedAt: Date
}

function key(): Buffer {
  const own = process.env.SOCIAL_TOKEN_KEY
  if (own) return createHash('sha256').update(own).digest()
  const base = process.env.REVIEW_SECRET ?? process.env.CRON_SECRET
  if (!base) {
    if (process.env.VERCEL === '1') throw new Error('Set SOCIAL_TOKEN_KEY (or REVIEW_SECRET) to store social tokens')
    return createHash('sha256').update('local-development-only').digest()
  }
  return Buffer.from(hkdfSync('sha256', base, 'ean-social', 'social-token-key', 32))
}

export function seal(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString('base64url')).join('.')
}

export function unseal(sealed: string): string {
  const [iv, tag, body] = sealed.split('.').map((p) => Buffer.from(p, 'base64url'))
  const decipher = createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8')
}

let ready: Promise<void> | null = null
async function table() {
  ready ??= getDb().then(async (db) => {
    await db.query(`create table if not exists social_token (
      channel      text primary key,
      token_sealed text not null,
      expires_at   timestamptz,
      account_id   text not null,
      account_name text,
      updated_at   timestamptz not null default now()
    )`)
  })
  return ready
}

type Row = {
  channel: TokenChannel
  token_sealed: string
  expires_at: string | Date | null
  account_id: string
  account_name: string | null
  updated_at: string | Date
}

export async function getToken(channel: TokenChannel): Promise<StoredToken | null> {
  await table()
  const db = await getDb()
  const { rows } = await db.query<Row>(`select * from social_token where channel = $1`, [channel])
  const row = rows[0]
  if (!row) return null
  return {
    channel: row.channel,
    accessToken: unseal(row.token_sealed),
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    accountId: row.account_id,
    accountName: row.account_name,
    updatedAt: new Date(row.updated_at),
  }
}

export async function saveToken(t: Omit<StoredToken, 'updatedAt'>): Promise<void> {
  await table()
  const db = await getDb()
  await db.query(
    `insert into social_token (channel, token_sealed, expires_at, account_id, account_name, updated_at)
     values ($1, $2, $3, $4, $5, now())
     on conflict (channel) do update set token_sealed = excluded.token_sealed, expires_at = excluded.expires_at,
       account_id = excluded.account_id, account_name = excluded.account_name, updated_at = now()`,
    [t.channel, seal(t.accessToken), t.expiresAt?.toISOString() ?? null, t.accountId, t.accountName],
  )
}

export async function deleteToken(channel: TokenChannel): Promise<void> {
  await table()
  const db = await getDb()
  await db.query(`delete from social_token where channel = $1`, [channel])
}

/** What the page shows about a connection, without the token itself. */
export type Connection = { connected: boolean; accountName: string | null; expiresAt: string | null; error?: string }

export async function connectionInfo(channel: TokenChannel): Promise<Connection> {
  try {
    const t = await getToken(channel)
    return t
      ? { connected: true, accountName: t.accountName, expiresAt: t.expiresAt?.toISOString() ?? null }
      : { connected: false, accountName: null, expiresAt: null }
  } catch (err) {
    return { connected: false, accountName: null, expiresAt: null, error: (err as Error).message }
  }
}

/**
 * Monday upkeep: refresh the Instagram token when it is within a month of
 * expiring (Instagram allows it once a token is a day old), and say what
 * needs James: an account not connected, or LinkedIn's 60-day token running
 * out within two weeks (LinkedIn doesn't let this app refresh it).
 */
export async function maintainConnections(
  refreshInstagram: (token: string) => Promise<{ token: string; expiresAt: Date }>,
  now = new Date(),
): Promise<string[]> {
  const notes: string[] = []
  const days = (d: Date) => Math.floor((d.getTime() - now.getTime()) / 864e5)

  const ig = await getToken('instagram')
  if (!ig) notes.push("Instagram isn't connected, so Tuesday's post won't go out there. Connect it on the page.")
  // Only Instagram-login tokens (IG…) expire and refresh; system-user tokens don't.
  else if (ig.accessToken.startsWith('IG') && ig.expiresAt && days(ig.expiresAt) < 30 && now.getTime() - ig.updatedAt.getTime() > 864e5) {
    try {
      const fresh = await refreshInstagram(ig.accessToken)
      await saveToken({ ...ig, accessToken: fresh.token, expiresAt: fresh.expiresAt })
    } catch (err) {
      notes.push(`Couldn't refresh the Instagram token (${(err as Error).message}). Paste a new one on the page.`)
    }
  }

  const li = await getToken('linkedinPersonal')
  if (!li) notes.push("Your LinkedIn isn't connected, so Tuesday's post won't go out there. Connect it on the page.")
  else if (li.expiresAt && days(li.expiresAt) < 14) {
    notes.push(
      days(li.expiresAt) < 0
        ? 'Your LinkedIn connection has expired. Reconnect it on the page.'
        : `Your LinkedIn connection expires in ${days(li.expiresAt)} days. Reconnect it on the page (one click).`,
    )
  }
  return notes
}
