/**
 * Fills the English side of every editorial field that has one.
 *
 * ## Why this exists
 *
 * The schema has carried `whyThisMattersEn` since M0, described as
 * "machine-translated from the Dutch on publish". Nothing ever did the
 * translating. `noteFor` falls back to the Dutch when the English field is
 * missing, and that fallback is honest and correct — but with the field empty
 * on every document it stopped being a fallback and became the behaviour, so
 * the English board showed seventy Dutch editorial notes, a Dutch paragraph
 * under "About the role" on every Dutch-sourced listing, and Dutch employer
 * notes on the organisation pages. A reader who switched to English got an
 * English frame around Dutch content, which reads as a broken page rather than
 * as a bilingual one.
 *
 * Dutch stays the source language for everything (§9.5). This never writes a
 * Dutch field, and it is not a curation step: there is still exactly one note
 * for a curator to write and it is the Dutch one.
 *
 * ## Why it runs on a cron rather than at promotion time
 *
 * The pipeline promotes listings as drafts with the classifier's *draft* note,
 * which a curator then rewrites before publishing (§8.3, §6.5). Translating at
 * promotion time would therefore translate a sentence nobody has approved and
 * leave the translation stale the moment the curator edits it. Running after
 * the fact, over whatever is currently on the board, is both cheaper and
 * always in step with what a reader sees — at the cost of a window between
 * publication and the next run, which the Dutch fallback covers.
 *
 * ## What it will not do
 *
 * It will not translate the explainer pages. Those are generated natively in
 * Dutch precisely because "a one-sentence note survives machine translation, a
 * page does not" — see `scripts/generate-explainers.ts`, which takes the same
 * view from the other direction. English explainers are a generation job, not a
 * translation job.
 */

import { DRAFTING_MODEL, structuredCall } from '../lib/anthropic'
import { sha256 } from '../lib/text'
import { writeClient } from './client'

/**
 * Short hash of a Dutch source text, stored beside the English it produced.
 *
 * "Translate only when the English is empty" meant the classifier's draft note
 * was translated within hours of promotion, and when a curator then rewrote
 * the Dutch the English never followed: /en showed a sentence nobody approved.
 * A field is now stale when its recorded source no longer matches the Dutch.
 * A field with English but no recorded source predates this and is treated as
 * stale once, which is the only way to catch the ones that already drifted.
 */
export function sourceHash(text: string): string {
  return sha256(text.trim()).slice(0, 16)
}

export function needsTranslation(
  dutch: string | null | undefined,
  english: string | null | undefined,
  recorded: string | null | undefined,
  force: boolean,
): dutch is string {
  if (!dutch?.trim()) return false
  if (force || !english?.trim()) return true
  return recorded !== sourceHash(dutch)
}

/** How many fields go into one model call. */
const DEFAULT_BATCH = 8

type Kind = 'note' | 'excerpt' | 'employer-note'

type Job = {
  docId: string
  field: string
  text: string
  kind: Kind
  label: string
  hash: string
}

export type TranslationReport = {
  listingsScanned: number
  employersScanned: number
  pending: number
  translated: number
  documentsPatched: number
  dryRun: boolean
  errors: string[]
  /** What would be written, for a dry run. */
  preview: { docId: string; field: string; label: string }[]
}

const SYSTEM = `You translate Dutch editorial copy into English for the job board run by Effectief Altruïsme Nederland.

The Dutch is the source of truth and a person wrote it. Translate it. Do not improve it, do not expand it, do not add a claim it does not make, and do not soften a judgement it does make. If a sentence is blunt in Dutch it stays blunt in English. Match the length of the original closely — a translation that runs half again as long has added something.

House style, which the English side of the site already follows:
- British English. "organisation", "programme", "specialised", "-ise" throughout.
- Plain, warm, second person. Sentence case. No exclamation marks, no emoji.
- Never use "impactful", "meaningful" or "make a difference". The Dutch avoids their equivalents on purpose; reaching for them in English undoes that.
- No marketing register. This board tells readers to look at other job boards first, and copy that sells undermines it.

Proper nouns and Dutch institutions:
- Keep the Dutch name of an organisation, ministry, regulator or scheme as its own name: Nederlandse Voedsel- en Warenautoriteit, De Nederlandsche Bank, Rijksoverheid, VOG, de 30%-regeling. Do not invent an English name for a body that does not use one.
- Where the Dutch name alone would leave an English reader with no idea what the body does, add a short gloss in the same sentence — "the Nederlandse Voedsel- en Warenautoriteit, the Dutch food and product safety regulator" — but only once, and only where it is genuinely needed.
- Job titles inside a sentence follow the same rule: keep the title as advertised, gloss only if opaque.
- Keep numbers, currency and dates exactly as written.

Return only the translations, keyed by the id you were given.`

const SCHEMA = {
  type: 'object',
  properties: {
    translations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          english: { type: 'string' },
        },
        required: ['id', 'english'],
        additionalProperties: false,
      },
    },
  },
  required: ['translations'],
  additionalProperties: false,
}

const KIND_BRIEF: Record<Kind, string> = {
  note: "The board's editorial note on one vacancy — our own argument for why the role is listed. One or two sentences. This is the single field readers come for, so it carries the most weight.",
  excerpt:
    "A short neutral summary of what the role is, taken from the employer's own ad. Factual, not persuasive. Keep it factual in English too — do not let it drift into a pitch.",
  'employer-note':
    'A durable note about an organisation, not about any one vacancy. Present tense, describes what the organisation does and where its leverage sits.',
}

function buildUser(batch: Job[]): string {
  const parts = batch.map((job, i) =>
    [
      `--- id: ${i} ---`,
      `Type: ${KIND_BRIEF[job.kind]}`,
      `Context: ${job.label}`,
      `Dutch:`,
      job.text,
    ].join('\n'),
  )
  return `Translate each of the following into English.\n\n${parts.join('\n\n')}`
}

async function translateBatch(batch: Job[]): Promise<Map<string, string>> {
  const { value } = await structuredCall<{ translations: { id: string; english: string }[] }>({
    model: DRAFTING_MODEL,
    system: SYSTEM,
    user: buildUser(batch),
    schema: SCHEMA as unknown as Record<string, unknown>,
    // Every note is short, but a batch of eight plus adaptive thinking needs
    // real headroom — hitting max_tokens throws rather than truncating.
    maxTokens: 8192,
    cacheSystem: true,
  })

  const out = new Map<string, string>()
  for (const row of value.translations) {
    const job = batch[Number(row.id)]
    if (!job) continue
    const english = row.english.trim()
    if (english) out.set(`${job.docId}:${job.field}`, english)
  }
  return out
}

type ListingRow = {
  _id: string
  title?: string | null
  employerName?: string | null
  whyThisMattersNl?: string | null
  whyThisMattersEn?: string | null
  excerpt?: string | null
  excerptEn?: string | null
  translatedFrom?: { whyThisMattersEn?: string; excerptEn?: string } | null
}

type EmployerRow = {
  _id: string
  name?: string | null
  leverageNoteNl?: string | null
  leverageNoteEn?: string | null
  translatedFrom?: { leverageNoteEn?: string } | null
}

export async function runTranslation(
  options: {
    dryRun?: boolean
    /** Re-translate fields that already have an English value. */
    force?: boolean
    limit?: number
    batchSize?: number
    /**
     * Wall-clock budget. Up to fifteen sequential Opus batches can outrun a
     * 300s function, and the job used to write everything at the end — so a
     * killed run paid for every translation and saved none, then did it again
     * three hours later. It now writes after each batch and stops when the
     * budget is spent; the rest is picked up next run.
     */
    budgetMs?: number
    onLog?: (line: string) => void
  } = {},
): Promise<TranslationReport> {
  const log = (line: string) => options.onLog?.(line)
  const force = options.force ?? false
  const limit = options.limit ?? Infinity
  const batchSize = options.batchSize ?? DEFAULT_BATCH
  const deadline = Date.now() + (options.budgetMs ?? Infinity)
  const client = writeClient()

  // Drafts included on purpose: a curator reviewing an unpublished listing in
  // the Studio should see what the English page will actually say.
  const listings = await client.fetch<ListingRow[]>(
    `*[_type == "jobListing"]{
       _id, title, "employerName": employer->name,
       whyThisMattersNl, whyThisMattersEn, excerpt, excerptEn, translatedFrom
     }`,
  )
  const employers = await client.fetch<EmployerRow[]>(
    `*[_type == "employer" && defined(leverageNoteNl)]{ _id, name, leverageNoteNl, leverageNoteEn, translatedFrom }`,
  )

  const jobs: Job[] = []

  for (const l of listings) {
    const where = [l.title, l.employerName].filter(Boolean).join(' at ') || l._id
    if (
      needsTranslation(
        l.whyThisMattersNl,
        l.whyThisMattersEn,
        l.translatedFrom?.whyThisMattersEn,
        force,
      )
    ) {
      jobs.push({
        docId: l._id,
        field: 'whyThisMattersEn',
        text: l.whyThisMattersNl.trim(),
        kind: 'note',
        label: where,
        hash: sourceHash(l.whyThisMattersNl),
      })
    }
    if (needsTranslation(l.excerpt, l.excerptEn, l.translatedFrom?.excerptEn, force)) {
      jobs.push({
        docId: l._id,
        field: 'excerptEn',
        text: l.excerpt.trim(),
        kind: 'excerpt',
        label: where,
        hash: sourceHash(l.excerpt),
      })
    }
  }

  for (const e of employers) {
    if (needsTranslation(e.leverageNoteNl, e.leverageNoteEn, e.translatedFrom?.leverageNoteEn, force)) {
      jobs.push({
        docId: e._id,
        field: 'leverageNoteEn',
        text: e.leverageNoteNl.trim(),
        kind: 'employer-note',
        label: e.name ?? e._id,
        hash: sourceHash(e.leverageNoteNl),
      })
    }
  }

  const selected = Number.isFinite(limit) ? jobs.slice(0, limit) : jobs

  const base: TranslationReport = {
    listingsScanned: listings.length,
    employersScanned: employers.length,
    pending: selected.length,
    translated: 0,
    documentsPatched: 0,
    dryRun: options.dryRun ?? false,
    errors: [],
    preview: [],
  }

  if (options.dryRun) {
    return {
      ...base,
      preview: selected.map((j) => ({ docId: j.docId, field: j.field, label: j.label })),
    }
  }
  if (!selected.length) return base

  const errors: string[] = []
  let translated = 0
  const patched = new Set<string>()

  for (let i = 0; i < selected.length; i += batchSize) {
    if (Date.now() >= deadline) {
      log(`out of time after ${translated} fields; the rest go next run`)
      break
    }
    const batch = selected.slice(i, i + batchSize)
    log(`translating ${i + 1}–${i + batch.length} of ${selected.length}…`)
    let results: Map<string, string>
    try {
      results = await translateBatch(batch)
    } catch (err) {
      errors.push(`batch ${i}: ${(err as Error).message}`)
      continue
    }

    // Grouped per document so a listing whose note and excerpt are both new is
    // written once, and written now — not at the end of the run.
    const patches = new Map<string, Record<string, string>>()
    for (const job of batch) {
      const english = results.get(`${job.docId}:${job.field}`)
      if (!english) {
        errors.push(`${job.docId} ${job.field}: model returned nothing`)
        continue
      }
      const fields = patches.get(job.docId) ?? {}
      fields[job.field] = english
      fields[`translatedFrom.${job.field}`] = job.hash
      patches.set(job.docId, fields)
    }
    for (const [docId, fields] of patches) {
      try {
        await client
          .patch(docId)
          .setIfMissing({ translatedFrom: {} })
          .set(fields)
          .commit()
        patched.add(docId)
        translated += Object.keys(fields).filter((k) => !k.startsWith('translatedFrom.')).length
      } catch (err) {
        errors.push(`${docId}: ${(err as Error).message}`)
      }
    }
  }

  return { ...base, translated, documentsPatched: patched.size, errors }
}
