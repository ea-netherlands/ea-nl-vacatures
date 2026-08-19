/**
 * Seeds the employer watchlist and the source list from Appendix A.
 *
 *   npm run seed
 *   npm run seed -- --reset      # replace existing rows rather than filling gaps
 *
 * Re-running is safe: by default it only fills gaps, so curator edits to the
 * watchlist survive. The watchlist is the asset, not the code — never clobber it.
 */

import { getDb } from '../jobboard/db/client'
import { CORRECTIONS, SEED_EMPLOYERS, SEED_SOURCES } from '../jobboard/seed/employers'
import { main, parseArgs, printReport } from './_cli'

void main(async () => {
  const args = parseArgs()
  const reset = args.flags.has('reset')
  const db = await getDb()

  let employers = 0
  for (const e of SEED_EMPLOYERS) {
    await db.query(
      `insert into employer (
         id, name, website, careers_url, city, ats, ats_token, cause_areas,
         leverage_note, e2g_allowlisted, e2g_salary_presumed, recommender_allowlisted,
         watchlist_tier, active, notes
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       on conflict (id) do update set
         name                = excluded.name,
         city                = ${reset ? 'excluded.city' : 'coalesce(employer.city, excluded.city)'},
         website             = ${reset ? 'excluded.website' : 'coalesce(employer.website, excluded.website)'},
         careers_url         = ${reset ? 'excluded.careers_url' : 'coalesce(employer.careers_url, excluded.careers_url)'},
         ats                 = ${reset ? 'excluded.ats' : 'coalesce(employer.ats, excluded.ats)'},
         ats_token           = ${reset ? 'excluded.ats_token' : 'coalesce(employer.ats_token, excluded.ats_token)'},
         cause_areas         = ${reset ? 'excluded.cause_areas' : 'employer.cause_areas'},
         leverage_note       = ${reset ? 'excluded.leverage_note' : 'coalesce(employer.leverage_note, excluded.leverage_note)'},
         -- The gates are pipeline-managed, so they always follow the seed:
         -- an allowlist nobody refreshes becomes a wrong allowlist.
         e2g_allowlisted         = excluded.e2g_allowlisted,
         e2g_salary_presumed     = excluded.e2g_salary_presumed,
         recommender_allowlisted = excluded.recommender_allowlisted,
         watchlist_tier      = ${reset ? 'excluded.watchlist_tier' : 'employer.watchlist_tier'},
         notes               = coalesce(employer.notes, excluded.notes)`,
      [
        e.id,
        e.name,
        e.website ?? null,
        e.careersUrl ?? null,
        e.city ?? null,
        e.ats ?? null,
        e.atsToken ?? null,
        e.causeAreas,
        e.leverageNote ?? null,
        e.e2gAllowlisted ?? false,
        e.e2gSalaryPresumed ?? false,
        e.recommenderAllowlisted ?? false,
        e.watchlistTier ?? 2,
        e.active ?? true,
        [e.notes, e.verify ? 'VERIFY before going live.' : null].filter(Boolean).join(' ') || null,
      ],
    )
    employers++
  }

  let sources = 0
  for (const s of SEED_SOURCES) {
    await db.query(
      `insert into source (id, kind, adapter, config, employer_id, enabled, returns_complete_set)
       values ($1,$2,$3,$4::jsonb,$5,$6,$7)
       on conflict (id) do update set
         kind    = excluded.kind,
         adapter = excluded.adapter,
         -- Take the new config, but carry the adapter's own cache key across:
         -- that holds crawl cursors, and losing it would make the next
         -- AcademicTransfer run re-fetch pages it already has.
         config  = excluded.config
                   || jsonb_build_object('__cache', coalesce(source.config -> '__cache', '{}'::jsonb)),
         employer_id = excluded.employer_id,
         returns_complete_set = excluded.returns_complete_set`,
      [
        s.id,
        s.kind,
        s.adapter,
        JSON.stringify(s.config ?? {}),
        s.employerId ?? null,
        s.enabled ?? true,
        s.returnsCompleteSet,
      ],
    )
    sources++
  }

  const { rows: verify } = await db.query<{ id: string; notes: string }>(
    `select id, notes from employer where notes like '%VERIFY%' order by id`,
  )

  printReport('Seeded', {
    employers,
    sources,
    'needs verification': verify.length,
  })

  console.log('Corrections carried from Appendix A — apply these first:')
  for (const c of CORRECTIONS) console.log(`  • ${c}`)
  console.log('\nEmployers flagged for verification before going live:')
  for (const v of verify) console.log(`  • ${v.id}: ${v.notes}`)
  console.log('')

  await db.close()
})
