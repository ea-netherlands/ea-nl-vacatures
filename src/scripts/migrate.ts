/**
 * Applies the Postgres schema. Idempotent.
 *
 *   npm run migrate          # DATABASE_URL if set, else local PGlite
 */

import { getDb } from '../jobboard/db/client'
import { migrate } from '../jobboard/db/migrate'
import { main, printReport } from './_cli'

void main(async () => {
  const db = await getDb()
  console.log(`driver: ${db.driver}${db.driver === 'pglite' ? ' (local .pgdata — set DATABASE_URL for Neon/Supabase)' : ''}`)
  await migrate(db)

  const { rows } = await db.query<{ table_name: string }>(
    `select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`,
  )
  printReport('Schema applied', { tables: rows.map((r) => r.table_name) })
  await db.close()
})
