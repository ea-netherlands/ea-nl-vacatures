/**
 * Ambitious Impact (AIM, formerly Charity Entrepreneurship) — careers page.
 *
 * AIM hires remotely and is exactly the kind of employer the board exists to
 * surface, but it publishes no feed and no JobPosting markup. The careers page
 * is a Squarespace list section: each item is a title, a "View job
 * description" link to a PDF on Google Drive, and an "Apply here" link to a
 * Tally form. One item ("Various Research Roles") links a Drive *folder*
 * instead, holding one PDF per role. All of it was checked in October 2026.
 *
 * The page renders the list from a JSON blob in the section's
 * `data-current-context` attribute, which is far steadier than its markup, so
 * that is what this reads. The PDFs are public: Drive's `uc?export=download`
 * endpoint returns the file itself with no sign-in. The folder page lists its
 * files as rows carrying `data-id`, which is enough to fetch each one.
 *
 * The ad text — title, location, pay — comes from the PDF, not the page: the
 * page's titles are abbreviated ("Special Projects (Strategy)") and say
 * nothing about where the work can be done.
 */

import { fetchText, httpFetch } from '../../lib/http'
import { decodeEntities, mentions30PercentRuling, parseSalaryText } from '../../lib/text'
import type { NormalisedListing, SourceAdapter } from '../types'

const DEFAULT_CAREERS_URL = 'https://www.ambitiousimpact.com/careers'
const PDF_MAX_BYTES = 5_000_000
/** A Drive PDF is re-read at most this often; AIM edits them rarely. */
const PDF_TTL_MS = 3 * 24 * 60 * 60 * 1000

export type AimCareerItem = {
  title: string
  applyUrl: string | null
  /** Drive file ids linked directly from this item. */
  fileIds: string[]
  /** Drive folder ids linked from this item, each holding one PDF per role. */
  folderIds: string[]
}

/** The list items on the careers page, read from Squarespace's section JSON. */
export function aimCareerItems(html: string): AimCareerItem[] {
  const items: AimCareerItem[] = []
  for (const m of html.matchAll(/data-current-context="([^"]*)"/g)) {
    let context: { userItems?: unknown }
    try {
      context = JSON.parse(decodeEntities(m[1]))
    } catch {
      continue
    }
    if (!Array.isArray(context.userItems)) continue
    for (const raw of context.userItems as Record<string, any>[]) {
      const description = String(raw?.description ?? '')
      const fileIds = [...description.matchAll(/drive\.google\.com\/file\/d\/([\w-]{20,})/g)].map(
        (f) => f[1],
      )
      const folderIds = [
        ...description.matchAll(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]{20,})/g),
      ].map((f) => f[1])
      if (!fileIds.length && !folderIds.length) continue
      const link = raw?.button?.buttonLink
      items.push({
        title: decodeEntities(String(raw?.title ?? '')).trim(),
        applyUrl: typeof link === 'string' && /^https?:\/\//.test(link) ? link : null,
        fileIds,
        folderIds,
      })
    }
  }
  return items
}

/** File ids in a public Drive folder page — each row is `data-id="…" … data-target="doc"`. */
export function driveFolderFileIds(html: string): string[] {
  const ids = new Set<string>()
  for (const m of html.matchAll(/data-id="([\w-]{20,})"[^>]{0,200}?data-target="doc"/g)) {
    ids.add(m[1])
  }
  return [...ids]
}

/**
 * Title, location and pay from a PDF's text.
 *
 * The title is the first line, joined to the next when a long title wraps
 * ("Visiting Research Fellow, Global Health &" / "Development"). The rest come
 * from the "Key Details" block, whose values also wrap, so a value runs until
 * the next `Label:` line.
 */
export function aimPdfFacts(text: string): {
  title: string | null
  location: string | null
  compensation: string | null
} {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  let title = lines[0] ?? null
  if (title && /(&|,|-|–|\band|\bof|\bfor)$/i.test(title) && lines[1]) {
    title = `${title} ${lines[1]}`
  }

  const detail = (label: string): string | null => {
    const start = lines.findIndex((l) => l.toLowerCase().startsWith(`${label.toLowerCase()}:`))
    if (start < 0) return null
    const parts = [lines[start].slice(label.length + 1).trim()]
    for (const next of lines.slice(start + 1, start + 4)) {
      if (/^[A-Z][A-Za-z ]{2,30}:/.test(next)) break
      parts.push(next)
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim() || null
  }

  return { title, location: detail('Location'), compensation: detail('Compensation') }
}

async function drivePdfText(fileId: string): Promise<string> {
  const res = await httpFetch(`https://drive.google.com/uc?export=download&id=${fileId}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  if (bytes.byteLength > PDF_MAX_BYTES) throw new Error(`PDF too large (${bytes.byteLength} bytes)`)
  // Drive answers a file it will not serve with an HTML interstitial, not a 4xx.
  if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw new Error('not a PDF')
  const { extractText } = await import('unpdf')
  const { text } = await extractText(bytes, { mergePages: true })
  return text.trim()
}

type AimPayload = {
  fileId: string
  text: string
  applyUrl: string | null
  pageTitle: string
}

export const aimCareers: SourceAdapter = {
  id: 'aim-careers',
  async *fetch(config, ctx) {
    const careersUrl = (config.careersUrl as string | undefined) ?? DEFAULT_CAREERS_URL
    const items = aimCareerItems(await fetchText(careersUrl))
    if (!items.length) {
      // A page that lists nothing is far likelier to be a redesign than a
      // hiring freeze. Do not let closure detection read it as the latter.
      ctx.markIncomplete('aim: no list items found on the careers page — layout changed?')
      return
    }

    // One entry per PDF. A file linked directly from an item keeps that item's
    // apply link; files reached only through a folder take the folder item's.
    const roles = new Map<string, { applyUrl: string | null; pageTitle: string }>()
    for (const item of items) {
      for (const id of item.fileIds) roles.set(id, { applyUrl: item.applyUrl, pageTitle: item.title })
    }
    for (const item of items) {
      for (const folderId of item.folderIds) {
        try {
          const ids = driveFolderFileIds(
            await fetchText(`https://drive.google.com/drive/folders/${folderId}`),
          )
          if (!ids.length) ctx.markIncomplete(`aim: Drive folder ${folderId} listed no files`)
          for (const id of ids) {
            if (!roles.has(id)) roles.set(id, { applyUrl: item.applyUrl, pageTitle: item.title })
          }
        } catch (err) {
          ctx.log(`aim: could not list folder ${folderId}: ${(err as Error).message}`)
          ctx.markIncomplete(`aim: folder ${folderId} failed to load`)
        }
      }
    }
    ctx.log(`aim: ${items.length} items on the page, ${roles.size} role PDFs`)

    for (const [fileId, role] of roles) {
      if (Date.now() >= ctx.deadline) {
        ctx.markIncomplete('aim: deadline reached before every PDF was read')
        return
      }
      const cacheKey = `aim:pdf:${fileId}`
      const cached = await ctx.cache.get<{ text: string; fetchedAt: number }>(cacheKey)
      let text = cached && Date.now() - cached.fetchedAt < PDF_TTL_MS ? cached.text : null
      if (!text) {
        try {
          text = await drivePdfText(fileId)
          await ctx.cache.set(cacheKey, { text, fetchedAt: Date.now() })
        } catch (err) {
          ctx.log(`aim: could not read PDF ${fileId}: ${(err as Error).message}`)
          ctx.markIncomplete(`aim: PDF ${fileId} failed to read`)
          text = cached?.text ?? null
        }
      }
      if (!text) continue
      yield {
        externalId: fileId,
        payload: { fileId, text, ...role } satisfies AimPayload,
      }
    }
  },
  normalise(raw, config): NormalisedListing | null {
    const p = raw.payload as AimPayload
    const facts = aimPdfFacts(p.text)
    const pay = parseSalaryText(facts.compensation)
    const title = facts.title ?? p.pageTitle
    if (!title) return null
    return {
      externalId: raw.externalId,
      employerId: (config.employerId as string | undefined) ?? 'ambitious-impact',
      employerName: (config.employerName as string | undefined) ?? 'Ambitious Impact',
      title,
      // The Tally form is where you apply, but it says nothing about the role;
      // the PDF is the ad. Send readers to the ad, which links the form.
      applyUrl: `https://drive.google.com/file/d/${p.fileId}/view`,
      description: p.applyUrl ? `${p.text}\n\nApply: ${p.applyUrl}` : p.text,
      descriptionHtml: null,
      locationRaw: facts.location,
      country: null,
      postedAt: null,
      deadlineAt: null,
      salaryMin: pay.min,
      salaryMax: pay.max,
      salaryCurrency: pay.currency,
      // "Most of our salaries fall between £45,000–£90,000" names no period;
      // nobody is paid that per month.
      salaryPeriod: pay.period ?? ((pay.min ?? 0) >= 10_000 ? 'year' : null),
      mentions30PercentRuling: mentions30PercentRuling(p.text),
    }
  },
}
