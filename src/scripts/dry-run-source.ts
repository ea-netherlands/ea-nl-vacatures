/**
 * Runs one adapter against the live source and stage one against what it
 * returns, writing nothing anywhere.
 *
 * For checking a new or changed adapter before it touches the pipeline's
 * database: what would be ingested, and what stage one would make of it. With
 * --triage it also sends the matching listings to the triage model and applies
 * the same programme rule as classify/run.ts, still without writing — so it
 * needs ANTHROPIC_API_KEY, and nothing else from the environment.
 *
 *   npx tsx src/scripts/dry-run-source.ts --adapter=ea-opportunities
 *   npx tsx src/scripts/dry-run-source.ts --adapter=probablygood --match=generator
 *   npx tsx --env-file=.env.local src/scripts/dry-run-source.ts --adapter=ea-opportunities --match=generator --triage
 *
 * The seed's config for the source is used when one exists, so the run sees
 * what production would.
 */

import { stage1 } from '../jobboard/classify/stage1'
import { mergeTerms, shortProgrammeVerdict } from '../jobboard/classify/programme'
import { buildTriageUserPrompt, TRIAGE_SYSTEM_PROMPT } from '../jobboard/classify/prompt'
import { TRIAGE_SCHEMA, type TriageResult } from '../jobboard/classify/schema'
import { getAdapter } from '../jobboard/ingest/registry'
import type { AdapterContext, NormalisedListing } from '../jobboard/ingest/types'
import { structuredCall, TRIAGE_MODEL } from '../jobboard/lib/anthropic'
import { truncateWords } from '../jobboard/lib/text'
import { SEED_SOURCES } from '../jobboard/seed/employers'
import { log, main, num, parseArgs, printReport } from './_cli'

main(async () => {
  const args = parseArgs()
  const adapterId = args.values.get('adapter')
  if (!adapterId) throw new Error('--adapter=<id> is required, e.g. --adapter=ea-opportunities')
  const match = args.values.get('match')?.toLowerCase()
  const adapter = getAdapter(adapterId)
  const seeded = SEED_SOURCES.find((s) => s.adapter === adapterId)
  const config = seeded?.config ?? {}

  const memory = new Map<string, unknown>()
  const incomplete: string[] = []
  const ctx: AdapterContext = {
    source: {
      id: seeded?.id ?? adapterId,
      kind: seeded?.kind ?? 'ea-board',
      adapter: adapterId,
      config,
      employer_id: seeded?.employerId ?? null,
      employer_name: null,
      enabled: true,
      returns_complete_set: seeded?.returnsCompleteSet ?? false,
      last_run_at: null,
    },
    log,
    deadline: Date.now() + num(args, 'budget', 600) * 1000,
    cache: {
      get: async <T>(key: string) => (memory.get(key) as T) ?? null,
      set: async (key, value) => void memory.set(key, value),
    },
    markIncomplete: (reason) => void incomplete.push(reason),
  }

  const listings: NormalisedListing[] = []
  for await (const raw of adapter.fetch(config, ctx)) {
    const n = adapter.normalise(raw, config)
    if (n) listings.push(n)
  }

  const reasons = new Map<string, number>()
  let passed = 0
  const shown: { listing: NormalisedListing; verdict: ReturnType<typeof stage1> }[] = []
  for (const [i, n] of listings.entries()) {
    const verdict = stage1({
      id: i,
      title: n.title,
      employer_name: n.employerName,
      location_raw: n.locationRaw,
      country: n.country,
      description: n.description,
      salary_max: n.salaryMax,
      salary_currency: n.salaryCurrency,
      employer: null,
      listing_kind: n.listingKind ?? 'job',
    })
    if (verdict.pass) passed++
    const key = verdict.pass ? `pass: ${verdict.nlReason.replace(/\d+ weeks/, 'N weeks')}` : `drop: ${verdict.reason}`
    reasons.set(key, (reasons.get(key) ?? 0) + 1)
    if (match && `${n.title} ${n.employerName}`.toLowerCase().includes(match)) shown.push({ listing: n, verdict })
  }

  printReport(`${adapterId} — dry run, nothing written`, {
    normalised: listings.length,
    programmes: listings.filter((l) => l.listingKind === 'programme').length,
    passStage1: passed,
    incomplete: incomplete.length ? incomplete : undefined,
  })
  console.log('Stage one, by reason:')
  for (const [reason, count] of [...reasons].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${reason}`)
  }

  for (const { listing, verdict } of shown) {
    console.log(`\n── ${listing.title} @ ${listing.employerName}`)
    console.log(
      JSON.stringify(
        {
          listingKind: listing.listingKind,
          applyUrl: listing.applyUrl,
          locationRaw: listing.locationRaw,
          country: listing.country,
          deadlineAt: listing.deadlineAt,
          salary: [listing.salaryMin, listing.salaryMax, listing.salaryCurrency, listing.salaryPeriod],
          descriptionChars: listing.description?.length ?? 0,
          stage1: verdict,
        },
        null,
        2,
      ),
    )

    if (args.flags.has('triage') && verdict.pass) {
      const { value: raw } = await structuredCall<TriageResult>({
        model: TRIAGE_MODEL,
        system: TRIAGE_SYSTEM_PROMPT,
        user: buildTriageUserPrompt({
          title: listing.title,
          employerName: listing.employerName,
          employerNote: null,
          locationRaw: listing.locationRaw,
          country: listing.country,
          salaryText: listing.salaryMin
            ? `${listing.salaryMin}–${listing.salaryMax ?? '?'} ${listing.salaryCurrency ?? ''} per ${listing.salaryPeriod ?? 'jaar'}`
            : null,
          description: truncateWords(listing.description ?? '', 1500),
          allowedCauses: verdict.allowedCauses,
          allowedLeverage: verdict.allowedLeverage,
          listingKind: listing.listingKind,
        }),
        schema: TRIAGE_SCHEMA,
        maxTokens: 3000,
      })
      // The same decision classify/run.ts makes.
      const programme = verdict.programme
        ? mergeTerms(verdict.programme, {
            weeks: raw.programmeWeeks,
            paid: raw.programmePaid,
            travelCovered: raw.programmeTravelCovered,
          })
        : null
      const finalVerdict = programme ? shortProgrammeVerdict(programme) : null
      console.log(
        JSON.stringify(
          {
            model: TRIAGE_MODEL,
            listingKind: raw.listingKind,
            modelFacts: [raw.programmeWeeks, raw.programmePaid, raw.programmeTravelCovered],
            modelNlEligible: raw.nlEligible,
            finalNlEligible: finalVerdict ? finalVerdict.eligible === true : raw.nlEligible,
            finalReason: finalVerdict?.reason ?? null,
            primaryCause: raw.primaryCause,
            subArea: raw.subArea,
            causeScore: raw.causeScore,
            leverageScore: raw.leverageScore,
            leverage: raw.leverage,
            seniority: raw.seniority,
            reasoning: raw.reasoning,
          },
          null,
          2,
        ),
      )
    }
  }
})
