/**
 * The ingestion worker, as Next.js route handlers on a cron.
 *
 * Spec §6.2a leaves this as a [DECISION NEEDED] with a recommendation:
 * "start with Next.js route handlers plus Vercel Cron, and split out only if
 * scrape duration becomes a problem." That is what this is.
 *
 * The AcademicTransfer crawl was flagged as the one that will exceed serverless
 * timeouts. Rather than moving it out pre-emptively, every adapter takes a
 * wall-clock deadline and a per-run fetch budget, and resumes from its cursor on
 * the next run. If that stops being enough, the same `runIngest` function runs
 * unchanged in a standalone worker — nothing here is coupled to the request.
 */

import { NextResponse } from 'next/server'
import { runClassification } from '@jobboard/classify/run'
import { checkDeadLinks, runIngest } from '@jobboard/ingest/run'
import { runExpiry, runPromotion } from '@jobboard/sanity/promote'
import { runSuggestionDigest } from '@jobboard/sanity/notify'
import { runTranslation } from '@jobboard/sanity/translate'

export const dynamic = 'force-dynamic'
/** Vercel's cron maximum on Pro. Adapters budget against this, minus a margin. */
export const maxDuration = 300

const JOBS = ['ingest', 'classify', 'promote', 'expire', 'linkcheck', 'translate', 'notify'] as const
type Job = (typeof JOBS)[number]

/**
 * Vercel sets an Authorization bearer with CRON_SECRET on cron invocations.
 * Without this check the pipeline is a public endpoint anyone can spin, which
 * would burn the classifier's budget and Probably Good's search quota.
 */
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // Local development with no secret configured: allow, but only off Vercel.
    return process.env.VERCEL !== '1'
  }
  const header = request.headers.get('authorization')
  return header === `Bearer ${secret}`
}

export async function GET(request: Request, { params }: { params: Promise<{ job: string }> }) {
  const { job } = await params
  if (!JOBS.includes(job as Job)) {
    return NextResponse.json({ error: `unknown job "${job}"`, known: JOBS }, { status: 404 })
  }
  if (!authorised(request)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 })
  }

  const url = new URL(request.url)
  const logs: string[] = []
  const onLog = (line: string) => {
    logs.push(line)
    console.log(line)
  }
  // Leave headroom so the handler can still write its own response.
  const budgetMs = Math.max(30_000, (maxDuration - 30) * 1000)

  try {
    switch (job as Job) {
      case 'ingest': {
        const sourceIds = url.searchParams.getAll('source')
        const report = await runIngest({
          sourceIds: sourceIds.length ? sourceIds : undefined,
          budgetMs,
          discover: url.searchParams.get('discover') === '1',
          onLog,
        })
        return NextResponse.json({ job, report, logs })
      }
      case 'classify': {
        const report = await runClassification({
          limit: Number(url.searchParams.get('limit') ?? 200),
          skipNotes: url.searchParams.get('skipNotes') === '1',
          budgetMs,
          onLog,
        })
        return NextResponse.json({ job, report, logs })
      }
      case 'promote': {
        const report = await runPromotion({
          limit: Number(url.searchParams.get('limit') ?? 50),
          dryRun: url.searchParams.get('dryRun') === '1',
          onLog,
        })
        return NextResponse.json({ job, report, logs })
      }
      case 'expire': {
        const report = await runExpiry({
          dryRun: url.searchParams.get('dryRun') === '1',
          onLog,
        })
        return NextResponse.json({ job, report, logs })
      }
      case 'linkcheck': {
        const report = await checkDeadLinks(Number(url.searchParams.get('limit') ?? 100))
        return NextResponse.json({ job, report, logs })
      }
      /*
        Fills whyThisMattersEn, excerptEn and leverageNoteEn for anything a
        curator has published since the last run.

        Runs after `promote` and `expire` rather than inside the pipeline: the
        pipeline writes the classifier's *draft* note, which the curator then
        rewrites before publishing, so translating at promotion time would
        translate a sentence nobody approved. `force=1` re-does everything,
        which is the switch to reach for after editing Dutch copy in bulk.
      */
      /*
        Mails whoever is triaging a digest of untriaged feedback, weekly.

        The only cron here that is not about listings. It exists because the
        feedback form had no notification at all: submissions landed in Sanity
        and waited for someone to remember to look, which stopped being viable
        when the beta started asking every reader for feedback.
      */
      case 'notify': {
        const report = await runSuggestionDigest({
          dryRun: url.searchParams.get('dryRun') === '1',
          onLog,
        })
        return NextResponse.json({ job, report, logs })
      }
      case 'translate': {
        const report = await runTranslation({
          dryRun: url.searchParams.get('dryRun') === '1',
          force: url.searchParams.get('force') === '1',
          limit: Number(url.searchParams.get('limit') ?? 120),
          onLog,
        })
        return NextResponse.json({ job, report, logs })
      }
    }
  } catch (err) {
    console.error(`[cron:${job}]`, err)
    return NextResponse.json(
      { job, error: (err as Error).message, logs },
      { status: 500 },
    )
  }
}
