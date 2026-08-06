/**
 * Database client — spec §6.2.
 *
 * Dual-mode on purpose:
 *
 *   • DATABASE_URL set  → node-postgres against Neon/Supabase. Production.
 *   • DATABASE_URL unset → PGlite, real Postgres compiled to WASM, stored
 *     under .pgdata/. Lets the whole pipeline run and be tested on a laptop
 *     with no server to install.
 *
 * Both speak the same SQL, so schema.sql and every query in queries.ts run
 * unchanged against either. The only thing that differs is the driver.
 */

export type QueryResult<R> = { rows: R[]; rowCount: number }

export interface Db {
  query<R = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<R>>
  /** Runs `fn` inside a transaction, rolling back if it throws. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>
  close(): Promise<void>
  readonly driver: 'pg' | 'pglite'
}

const PGLITE_DIR = process.env.PGLITE_DIR ?? '.pgdata'

let singleton: Promise<Db> | null = null

/** Shared connection. Route handlers and scripts both go through this. */
export function getDb(): Promise<Db> {
  singleton ??= connect()
  return singleton
}

async function connect(): Promise<Db> {
  return process.env.DATABASE_URL ? connectPg(process.env.DATABASE_URL) : connectPglite()
}

async function connectPg(connectionString: string): Promise<Db> {
  const { Pool } = await import('pg')
  const pool = new Pool({
    connectionString,
    // Neon and Supabase both terminate idle connections; keep the pool small
    // and let it recycle rather than holding sockets open across cron runs.
    max: Number(process.env.PGPOOL_MAX ?? 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    ssl: /localhost|127\.0\.0\.1/.test(connectionString)
      ? undefined
      : { rejectUnauthorized: false },
  })

  const wrap = (exec: (sql: string, params?: unknown[]) => Promise<QueryResult<never>>): Db => ({
    driver: 'pg',
    query: exec as Db['query'],
    async transaction(fn) {
      const client = await pool.connect()
      try {
        await client.query('begin')
        const tx = wrap(((sql: string, params?: unknown[]) =>
          client.query(sql, params as never[])) as never)
        const out = await fn({ ...tx, transaction: (inner) => inner(tx), close: async () => {} })
        await client.query('commit')
        return out
      } catch (err) {
        await client.query('rollback').catch(() => {})
        throw err
      } finally {
        client.release()
      }
    },
    async close() {
      await pool.end()
    },
  })

  return wrap(((sql: string, params?: unknown[]) => pool.query(sql, params as never[])) as never)
}

async function connectPglite(): Promise<Db> {
  // Local development only — production always has DATABASE_URL. The bundler
  // hint keeps this dev-only path from being traced into the deployed function.
  const { PGlite } = await import('@electric-sql/pglite')
  const pg = await PGlite.create(/* turbopackIgnore: true */ PGLITE_DIR)

  const self: Db = {
    driver: 'pglite',
    async query<R>(sql: string, params: unknown[] = []) {
      const res = await pg.query<R>(sql, params as never[])
      return { rows: res.rows as R[], rowCount: res.rows.length }
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      // PGlite is single-connection, so a nested BEGIN/COMMIT on the same
      // handle is the transaction. Savepoints would be needed for nesting,
      // which the pipeline does not do.
      await pg.exec('begin')
      try {
        const out = await fn(self)
        await pg.exec('commit')
        return out
      } catch (err) {
        await pg.exec('rollback').catch(() => {})
        throw err
      }
    },
    async close() {
      await pg.close()
    },
  }
  return self
}
