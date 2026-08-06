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

export const dynamic = 'force-dynamic'
/** Vercel's cron maximum on Pro. Adapters budget against this, minus a margin. */
export const maxDuration = 300

const JOBS = ['ingest', 'classify', 'promote', 'expire', 'linkcheck'] as const
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
    }
  } catch (err) {
    console.error(`[cron:${job}]`, err)
    return NextResponse.json(
      { job, error: (err as Error).message, logs },
      { status: 500 },
    )
  }
}
