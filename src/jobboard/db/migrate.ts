/**
 * Schema migration. Deliberately a separate module from client.ts.
 *
 * This is the only part of the data layer that touches the filesystem, and it
 * only ever runs from the CLI. Keeping it out of client.ts keeps that dynamic
 * `readFile` out of the app's import graph — otherwise the bundler traces the
 * whole project into every serverless function that talks to the database,
 * which bloats deployments and can trip size limits.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Db } from './client'

/** Applies schema.sql. Idempotent — every statement is `if not exists`. */
export async function migrate(db: Db): Promise<void> {
  const sql = await readFile(path.join(process.cwd(), 'src/jobboard/db/schema.sql'), 'utf8')
  // PGlite's query() takes one statement at a time, so the file is split rather
  // than executed wholesale.
  for (const statement of splitStatements(sql)) {
    await db.query(statement)
  }
}

/**
 * Splits a SQL file into individual statements, ignoring semicolons inside
 * string literals and line comments — both of which appear in schema.sql
 * (`default '{}'`, and the commentary on each gate column).
 */
export function splitStatements(sql: string): string[] {
  const out: string[] = []
  let buf = ''
  let inString = false
  let inLineComment = false

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    const next = sql[i + 1]

    if (inLineComment) {
      if (ch === '\n') inLineComment = false
      buf += ch
      continue
    }
    if (!inString && ch === '-' && next === '-') {
      inLineComment = true
      buf += ch
      continue
    }
    if (ch === "'") {
      // '' inside a string is an escaped quote, not a terminator.
      if (inString && next === "'") {
        buf += "''"
        i++
        continue
      }
      inString = !inString
      buf += ch
      continue
    }
    if (ch === ';' && !inString) {
      if (stripComments(buf)) out.push(buf.trim())
      buf = ''
      continue
    }
    buf += ch
  }

  if (stripComments(buf)) out.push(buf.trim())
  return out
}

function stripComments(s: string): string {
  return s
    .split('\n')
    .map((line) => line.replace(/--.*$/, '').trim())
    .join(' ')
    .trim()
}
