/**
 * One-off backfill for the browse rebuild — August 2026.
 *
 * The index now browses by sub-area and by skill, and neither field existed
 * when the listings currently on the board were classified. It also collapsed
 * `locationMode` from four values to three. Until every published listing
 * carries the new fields, the cause tiles show sub-area chips reading "nothing
 * open" over a board that is in fact full, which is worse than not shipping the
 * grid at all.
 *
 * So this script walks every jobListing in Sanity and, for each one:
 *
 *   1. maps `locationMode` forward through LEGACY_LOCATION_MODE_MAP — pure
 *      data, no model involved;
 *   2. asks the triage model for a `subArea` and one or two `skills`, given
 *      only what the published document already says;
 *   3. patches the document.
 *
 * It is deliberately narrow. It does not re-run the full classifier, does not
 * touch scores, and does not rewrite the editorial note — those are curated
 * judgements and a backfill has no business revising them. The single exception
 * is `movement-building`: that cause area did not exist when these listings
 * were classified, so no existing listing could have been assigned it however
 * obviously it belongs there. The model may therefore move a listing *into*
 * that area and nowhere else, and every such move is printed for review.
 *
 * Idempotent: run it as often as you like. `--force` re-does listings that
 * already have the new fields; `--dry` prints without writing.
 *
 *   npx tsx src/scripts/backfill-browse.ts --dry
 *   npx tsx src/scripts/backfill-browse.ts
 */

import { structuredCall, TRIAGE_MODEL } from '../jobboard/lib/anthropic'
import { isSanityConfigured, writeClient } from '../jobboard/sanity/client'
import {
  CAUSE_AREA_DEFINITIONS,
  LEGACY_LOCATION_MODE_MAP,
  LOCATION_MODES,
  MAX_SKILLS_PER_LISTING,
  SKILL_DEFINITIONS,
  SKILLS,
  SUB_AREA_DEFINITIONS,
  SUB_AREAS,
  SUB_AREAS_BY_CAUSE,
  type CauseArea,
  type LocationMode,
  type Skill,
  type SubArea,
} from '../jobboard/taxonomy'
import { log, main, parseArgs, printReport } from './_cli'

type Doc = {
  _id: string
  title: string
  employerName?: string | null
  employerCauseAreas?: CauseArea[] | null
  excerpt?: string | null
  whyThisMattersNl?: string | null
  primaryCause: CauseArea | null
  secondaryCauses?: CauseArea[] | null
  subArea?: string | null
  skills?: string[] | null
  locationMode?: string | null
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['subArea', 'skills', 'movementBuilding', 'reasoning'],
  properties: {
    subArea: {
      anyOf: [{ type: 'string', enum: [...SUB_AREAS] }, { type: 'null' }],
      description:
        'The one sub-area this role belongs to, or null if it genuinely sits above all of them. Normally a sub-area of the cause area given below — but if you are setting movementBuilding to true, pick from movement-building\u2019s own sub-areas instead (community-building or effective-giving), because that is the area the listing is moving to.',
    },
    skills: {
      type: 'array',
      items: { type: 'string', enum: [...SKILLS] },
      description: `One or two skills, most central first, at most ${MAX_SKILLS_PER_LISTING}.`,
    },
    movementBuilding: {
      type: 'boolean',
      description:
        'True ONLY if this role is community building or public-facing effective giving and therefore belongs in the new movement-building cause area. False for everything else, including research or programme roles at organisations that happen to be part of the community.',
    },
    reasoning: { type: 'string', description: 'One sentence. Never published.' },
  },
} as const

type Result = {
  subArea: string | null
  skills: string[]
  movementBuilding: boolean
  reasoning: string
}

const SYSTEM = `You are labelling roles that are already published on a curated Dutch job board. They have been through a full classifier once; you are adding two fields that did not exist at the time.

Answer only from what the document says. Do not speculate about the employer beyond what is written.

## Cause areas

${(Object.entries(CAUSE_AREA_DEFINITIONS) as [CauseArea, string][])
  .map(([key, def]) => `- \`${key}\` — ${def}`)
  .join('\n')}

## Sub-areas

Pick exactly one, and it must belong to the listing's cause area — with one exception: if you set \`movementBuilding\` to true, pick from movement-building's own sub-areas (\`community-building\` or \`effective-giving\`), because that is where the listing is going.

This is the label a reader browses by, so getting it wrong hides the listing from the people most likely to want it. Return null only when the role genuinely sits above every sub-area in its area — a cause-prioritisation post, or a ministry management role spanning several briefs — rather than whenever none feels perfect.

${(Object.entries(SUB_AREA_DEFINITIONS) as [SubArea, string][])
  .map(([key, def]) => `- \`${key}\` (${SUB_AREA_CAUSE_LABEL(key)}) — ${def}`)
  .join('\n')}

## Skills

One or two, most central first. Answer the question the *candidate* would answer — "what do you do?" — not "what does this organisation work on". A ministry policy officer whose brief is AI is \`policy\`, not \`research\`. \`engineering\` is physical, biological and chemical engineering, never software.

${(Object.entries(SKILL_DEFINITIONS) as [Skill, string][])
  .map(([key, def]) => `- \`${key}\` — ${def}`)
  .join('\n')}

## The movement-building exception

This cause area is new, so no listing in front of you was ever able to be assigned it. Set \`movementBuilding\` true only for two kinds of work:

- **Community building** — growing and supporting the population of people who work on these problems. Local and university groups, conferences, fellowships, talent pipelines, careers advice. The Centre for Effective Altruism, the School for Moral Ambition, national groups, Kairos.
- **Public-facing effective giving** — persuading the general public to donate and directing those donations well. Giving What We Can, Doneer Effectief, the Tien Procent Club, pledge and platform work.

It is false for everything else, including work that sounds adjacent:

- A research, programme or operations role at a charity an evaluator recommends is filed under the problem the charity serves. A researcher at GiveWell works on global health.
- Fundraising, partnerships, advocacy or communications **for a single operating charity's own programme** is that charity's problem area, not movement building. The test is whether the role grows effective giving in general or raises money for one organisation in particular.
- **Field building aimed at one problem belongs to that problem.** An AI-safety fellowship, talent pipeline, or research incubator — Kairos, MATS, and the like — is \`global-catastrophic-risks\` work with the sub-area \`ai-safety\`, because the field it grows is AI safety, not the movement as a whole. The same goes for a biosecurity fellowship. Only cause-general community building, serving every problem on the board at once, lands in movement-building.

When in doubt, false.`

function SUB_AREA_CAUSE_LABEL(sub: SubArea): CauseArea {
  const entry = (Object.entries(SUB_AREAS_BY_CAUSE) as [CauseArea, readonly SubArea[]][]).find(
    ([, subs]) => subs.includes(sub),
  )
  return entry![0]
}

async function backfill() {
  const args = parseArgs()
  const dry = args.flags.has('dry')
  const force = args.flags.has('force')
  /*
    `--employer=Kairos` re-does one organisation's listings. A rule change
    usually affects a handful of documents, and `--force` over the whole board
    would re-roll every sub-area and skill through a non-deterministic model —
    churning labels that were already reviewed in order to fix three that
    weren't.
  */
  const onlyEmployer = args.values.get('employer')?.toLowerCase()

  if (!isSanityConfigured) throw new Error('Sanity is not configured; nothing to backfill.')
  const client = writeClient()

  const docs = await client.fetch<Doc[]>(
    `*[_type == "jobListing"] | order(_createdAt desc) {
       _id, title, "employerName": employer->name,
       "employerCauseAreas": coalesce(employer->causeAreas, []),
       excerpt, whyThisMattersNl,
       primaryCause, "secondaryCauses": coalesce(secondaryCauses, []),
       subArea, skills, locationMode
     }`,
  )

  const report = {
    documents: docs.length,
    skipped: 0,
    locationRemapped: 0,
    labelled: 0,
    movedToMovementBuilding: [] as string[],
    movedOutOfMovementBuilding: [] as string[],
    blockedByEmployerSeed: [] as string[],
    clearedStaleSubArea: [] as string[],
    noSubArea: [] as string[],
    unresolved: [] as string[],
    failed: [] as string[],
  }

  for (const doc of docs) {
    if (onlyEmployer && !(doc.employerName ?? '').toLowerCase().includes(onlyEmployer)) {
      report.skipped++
      continue
    }
    const patch: Record<string, unknown> = {}

    // --- 1. Location, mechanically ------------------------------------------
    const current = doc.locationMode ?? null
    const alreadyNew = current !== null && (LOCATION_MODES as readonly string[]).includes(current)
    if (current && !alreadyNew) {
      const mapped = LEGACY_LOCATION_MODE_MAP[current] as LocationMode | undefined
      if (mapped) {
        patch.locationMode = mapped
        report.locationRemapped++
      }
    }

    // --- 2. Sub-area and skills, from the model -----------------------------
    const needsLabels = force || !doc.subArea || !doc.skills?.length
    if (needsLabels) {
      if (!doc.primaryCause) {
        report.unresolved.push(`${doc.title} — no primary cause, cannot pick a sub-area`)
      } else {
        try {
          const { value } = await structuredCall<Result>({
            model: TRIAGE_MODEL,
            system: SYSTEM,
            cacheSystem: true,
            schema: SCHEMA,
            user: [
              `**Functie:** ${doc.title}`,
              doc.employerName ? `**Werkgever:** ${doc.employerName}` : null,
              `**Toegewezen probleemgebied:** ${doc.primaryCause}`,
              doc.whyThisMattersNl ? `**Waarom dit op het bord staat:** ${doc.whyThisMattersNl}` : null,
              doc.excerpt ? `**Samenvatting:** ${doc.excerpt}` : null,
            ]
              .filter(Boolean)
              .join('\n\n'),
          })

          /*
            The move can now go both ways.

            Into movement-building because the area is new. Back *out* of it
            because the boundary tightened: field building aimed at one problem
            belongs to that problem, so an AI-safety talent pipeline that the
            first pass filed under movement-building has to return to
            global-catastrophic-risks. The destination comes from the
            employer's own seeded cause areas rather than from the model —
            that is a curated fact, and it is the one the classifier overrode
            in the first place.
          */
          /*
            The employer's seeded cause areas outrank the model.

            Kairos is seeded `global-catastrophic-risks` and is a field-building
            organisation for AI safety — the field it grows is AI safety, not
            the movement. The model agreed on two of its three listings and not
            the third, which is exactly the kind of coin-flip a curated fact
            should settle. So an employer with a non-empty seed that omits
            `movement-building` cannot have its listings moved there at all.

            An empty seed means "we have not decided", not "no", so CEA and
            80,000 Hours stay eligible.
          */
          const seeded = doc.employerCauseAreas ?? []
          const employerAllowsMovementBuilding =
            seeded.length === 0 || seeded.includes('movement-building')
          const movementBuilding = value.movementBuilding && employerAllowsMovementBuilding
          if (value.movementBuilding && !employerAllowsMovementBuilding) {
            report.blockedByEmployerSeed.push(
              `${doc.title} (${doc.employerName ?? '?'}) — model said movement-building; employer is seeded ${seeded.join(', ')}`,
            )
          }

          const leavingMovementBuilding =
            doc.primaryCause === 'movement-building' && !movementBuilding
          const fallbackCause = seeded.find((c) => c !== 'movement-building') ?? null

          const cause: CauseArea = movementBuilding
            ? 'movement-building'
            : leavingMovementBuilding && fallbackCause
              ? fallbackCause
              : doc.primaryCause

          // A sub-area from the primary cause, or from a secondary one. The
          // second allowance matters because the AI split across
          // global-catastrophic-risks and better-futures is a genuine judgement
          // call: a listing already carrying both causes should be allowed the
          // chip that actually describes it rather than falling through to no
          // chip at all. A sub-area from a cause the listing does not carry is
          // still dropped — that is the model disagreeing with the curator, and
          // a backfill does not get to settle that.
          const permitted = new Set(
            [cause, ...(doc.secondaryCauses ?? [])].flatMap(
              (c) => (SUB_AREAS_BY_CAUSE[c] ?? []) as readonly string[],
            ),
          )
          const subArea =
            value.subArea && permitted.has(value.subArea) ? (value.subArea as SubArea) : null
          const skills = (value.skills ?? [])
            .filter((s): s is Skill => (SKILLS as readonly string[]).includes(s))
            .slice(0, MAX_SKILLS_PER_LISTING)

          if (skills.length === 0) {
            report.unresolved.push(`${doc.title} — no usable skill`)
          } else {
            if (subArea) {
              patch.subArea = subArea
            } else {
              // Reported, not treated as a failure: some roles genuinely sit
              // above every sub-area. They still appear under their cause tile,
              // just not under a chip.
              report.noSubArea.push(
                `${doc.title} — model said ${value.subArea ?? 'null'}: ${value.reasoning}`,
              )
              // But a sub-area left over from a previous pass has to go if the
              // cause moved out from under it. A Kairos role that returns to
              // global-catastrophic-risks while still carrying
              // `community-building` would sit under the catastrophic-risks
              // tile wearing a chip from a different area — and appear in the
              // count for a chip that does not lead to it.
              if (
                doc.subArea &&
                !(SUB_AREAS_BY_CAUSE[cause] as readonly string[]).includes(doc.subArea)
              ) {
                patch.subArea = null
                report.clearedStaleSubArea.push(`${doc.title} — dropped ${doc.subArea} (now ${cause})`)
              }
            }
            patch.skills = skills
            if (movementBuilding && doc.primaryCause !== 'movement-building') {
              patch.primaryCause = 'movement-building'
              report.movedToMovementBuilding.push(
                `${doc.title} (${doc.employerName ?? '?'}) — was ${doc.primaryCause}: ${value.reasoning}`,
              )
            } else if (leavingMovementBuilding) {
              if (fallbackCause) {
                patch.primaryCause = fallbackCause
                report.movedOutOfMovementBuilding.push(
                  `${doc.title} (${doc.employerName ?? '?'}) → ${fallbackCause}: ${value.reasoning}`,
                )
              } else {
                report.unresolved.push(
                  `${doc.title} — no longer movement-building, but the employer has no seeded cause area to return it to`,
                )
              }
            }
            report.labelled++
          }
        } catch (error) {
          report.failed.push(`${doc.title} — ${(error as Error).message}`)
        }
      }
    }

    if (Object.keys(patch).length === 0) {
      report.skipped++
      continue
    }
    log(`${dry ? 'would patch' : 'patching'} ${doc.title} → ${JSON.stringify(patch)}`)
    if (!dry) await client.patch(doc._id).set(patch).commit()
  }

  printReport(dry ? 'Backfill (dry run)' : 'Backfill', report)
}

main(backfill)
