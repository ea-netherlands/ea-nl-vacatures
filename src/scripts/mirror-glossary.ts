/**
 * Mirrors EA NL's Dutch glossary and distils the style corpus — spec §9.5.
 *
 *   npm run mirror-glossary
 *
 * Two jobs, in the order the spec insists on:
 *
 *  1. Re-read https://effectiefaltruisme.nl/begrippenlijst and refresh
 *     glossary.json. The glossary is human-translated and authoritative — we
 *     never generate one. It removes the largest quality risk in the whole
 *     Dutch-generation problem, because it is exactly the artefact that needed a
 *     native speaker.
 *
 *  2. Scrape EA NL's other Dutch pages and distil a style guide. "This is the
 *     highest-leverage step and it's mostly mechanical… Do this before writing
 *     any page."
 *
 * The keep-in-English list is preserved across refreshes rather than re-derived:
 * it is a set of house-style judgements someone already made, and no heuristic
 * over the rendered page can reconstruct them reliably.
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fetchText } from '../jobboard/lib/http'
import { htmlToText } from '../jobboard/lib/text'
import { PROSE_MODEL, proseCall } from '../jobboard/lib/anthropic'
import type { Glossary } from '../jobboard/content/style'
import { log, main, parseArgs, printReport } from './_cli'

const CONTENT_DIR = path.resolve(process.cwd(), 'src/jobboard/content')
const GLOSSARY_PATH = path.join(CONTENT_DIR, 'glossary.json')
const STYLE_PATH = path.join(CONTENT_DIR, 'style-guide.md')

/** The style corpus, in the spec's order of usefulness. */
const CORPUS_URLS = [
  'https://effectiefaltruisme.nl/begrippenlijst',
  'https://effectiefaltruisme.nl',
  'https://effectiefaltruisme.nl/introductiecursus',
  'https://effectiefaltruisme.nl/loopbaan',
  'https://effectiefaltruisme.nl/doneren',
  'https://effectiefaltruisme.nl/dierenwelzijn',
]

/**
 * Extracts term pairs from the rendered glossary page. Kept structural rather
 * than clever: definition lists, headings followed by a paragraph, and table
 * rows cover every shape the page has used.
 */
function extractTerms(html: string): { term: string; definition: string }[] {
  const out: { term: string; definition: string }[] = []

  for (const m of html.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi)) {
    out.push({ term: htmlToText(m[1]), definition: htmlToText(m[2]) })
  }
  for (const m of html.matchAll(
    /<h[2-4][^>]*>([\s\S]{2,120}?)<\/h[2-4]>\s*(?:<p[^>]*>([\s\S]*?)<\/p>)?/gi,
  )) {
    const term = htmlToText(m[1])
    if (term && term.length < 90) out.push({ term, definition: htmlToText(m[2] ?? '') })
  }
  for (const m of html.matchAll(
    /<tr[^>]*>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>\s*<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi,
  )) {
    out.push({ term: htmlToText(m[1]), definition: htmlToText(m[2]) })
  }

  const seen = new Set<string>()
  return out.filter((t) => {
    const key = t.term.toLowerCase()
    if (!t.term || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

void main(async () => {
  const args = parseArgs()
  const skipStyle = args.flags.has('skip-style')

  // ---- 1. Glossary --------------------------------------------------------
  const existing = JSON.parse(await readFile(GLOSSARY_PATH, 'utf8')) as Glossary &
    Record<string, unknown>

  let scraped: { term: string; definition: string }[] = []
  try {
    const html = await fetchText(existing.sourceUrl)
    scraped = extractTerms(html)
    log(`glossary page: ${scraped.length} candidate terms found`)
  } catch (err) {
    log(`could not read ${existing.sourceUrl}: ${(err as Error).message}`)
    log('keeping the existing mirror — it is still authoritative for terminology.')
  }

  if (scraped.length > 0) {
    // The keep-in-English list is a human judgement; a scrape cannot infer it.
    // So we preserve it and only extend the term list with pairs we can see.
    const keep = new Set(existing.keepInEnglish.map((k) => k.toLowerCase()))
    const known = new Set(existing.terms.map((t) => t.nl.toLowerCase()))
    let added = 0

    for (const { term, definition } of scraped) {
      const clean = term.replace(/\s*\([^)]*\)\s*$/, '').trim()
      if (!clean || clean.length > 80 || known.has(clean.toLowerCase())) continue
      // Only accept things that look like glossary entries, not page furniture.
      if (!definition || definition.length < 25) continue
      existing.terms.push({
        en: clean,
        nl: term.trim(),
        translate: !keep.has(clean.toLowerCase()),
        note: `van de begrippenlijst: ${definition.slice(0, 160)}`,
      })
      known.add(clean.toLowerCase())
      added++
    }

    existing.lastMirrored = new Date().toISOString()
    existing.mirroredFrom = existing.sourceUrl
    await writeFile(GLOSSARY_PATH, `${JSON.stringify(existing, null, 2)}\n`, 'utf8')
    printReport('Glossary mirrored', {
      source: existing.sourceUrl,
      'terms total': existing.terms.length,
      'terms added': added,
      'keep-in-English (preserved)': existing.keepInEnglish.length,
    })
  }

  if (skipStyle) return

  // ---- 2. Style corpus → style guide --------------------------------------
  const corpus: string[] = []
  for (const url of CORPUS_URLS) {
    try {
      const text = htmlToText(await fetchText(url))
      if (text.length > 400) {
        corpus.push(`### ${url}\n\n${text.slice(0, 12_000)}`)
        log(`corpus: ${url} (${text.length} chars)`)
      }
    } catch (err) {
      log(`corpus: skipped ${url} — ${(err as Error).message}`)
    }
  }

  if (corpus.length === 0) {
    log('no corpus pages readable; leaving the existing style guide in place.')
    return
  }

  const current = await readFile(STYLE_PATH, 'utf8')

  // The strongest available model, deliberately: this guide shapes every Dutch
  // page the board will ever generate, so it is the wrong place to economise.
  const revised = await proseCall({
    model: PROSE_MODEL,
    system: `Je bent een Nederlandse eindredacteur. Je krijgt bestaande Nederlandse pagina's van effectiefaltruisme.nl, en een bestaande huisstijlgids voor een vacaturebord van dezelfde organisatie.

Werk de huisstijlgids bij op basis van wat je in de echte pagina's ziet. Beschrijf het register dat er al is; verzin geen nieuw register.

Let specifiek op en leg vast:
- de aanspreekvorm ("je" of "u") — kies wat de bestaande pagina's doen en zeg dat het nooit mag wisselen
- gemiddelde zinslengte en hoeveel variatie er is
- hoeveel voorbehoud en nuance normaal is
- hoe de bestaande pagina's EA-begrippen introduceren
- welke woorden en constructies de bestaande pagina's juist vermijden
- concrete voor/na-paren voor anglicismen die je in het echte materiaal ziet

Behoud de structuur en de kopjes van de bestaande gids, en behoud alle regels die er al staan tenzij het echte materiaal ze tegenspreekt. Voeg toe wat je in het corpus leert; verwijder niets zonder aanleiding.

Antwoord met de volledige bijgewerkte Markdown-gids en niets anders. Geen inleiding, geen toelichting.`,
    user: [
      '## Bestaande huisstijlgids',
      '',
      current,
      '',
      '## Corpus: echte Nederlandse pagina’s van effectiefaltruisme.nl',
      '',
      ...corpus,
    ].join('\n'),
    maxTokens: 12_000,
  })

  if (revised.length < 800) {
    log('revised guide looked too short to trust; keeping the existing one.')
    return
  }

  await writeFile(STYLE_PATH, `${revised.trim()}\n`, 'utf8')
  printReport('Style guide distilled', {
    'corpus pages': corpus.length,
    'guide length': `${revised.length} chars`,
    model: PROSE_MODEL,
    file: STYLE_PATH,
  })
  console.log(
    'Read the diff before committing. This guide is prepended to every Dutch\n' +
      'generation prompt, so a bad edit here degrades every page at once.\n',
  )
})
