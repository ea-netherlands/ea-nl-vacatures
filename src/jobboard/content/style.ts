/**
 * Loaders for the style corpus and the glossary — spec §9.5.
 *
 * Both are prepended to every Dutch generation prompt. The glossary is a HARD
 * vocabulary constraint, not a suggestion: any term with a glossary entry must
 * use the glossary rendering, and the adversarial pass flags a page that uses a
 * synonym instead.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'

const CONTENT_DIR = path.resolve(process.cwd(), 'src/jobboard/content')

export type GlossaryTerm = {
  en: string
  nl: string
  translate: boolean
  note?: string
}

export type Glossary = {
  sourceUrl: string
  lastMirrored: string | null
  keepInEnglish: string[]
  terms: GlossaryTerm[]
  framework: {
    name: string
    /*
      The English twin of every reader-facing string in this block.

      `question` is Dutch, and was written that way deliberately: it started as
      prompt input for the explainer generator, which composes natively in Dutch
      and never translates into it. The method page then began rendering these
      to readers, at which point the English page was showing four Dutch
      sentences under four English headings. Hence the `*En` fields — the Dutch
      keeps its job as generator input, and the page has something to display.

      Edit the pair together; nothing enforces that they agree.
    */
    nameEn: string
    note: string
    dimensions: { nl: string; en: string; question: string; questionEn: string }[]
    fourth: { nl: string; en: string; question: string; questionEn: string; note: string }
  }
  organisations: { name: string; abbr?: string; note?: string }[]
}

let cachedGlossary: Glossary | null = null
let cachedStyleGuide: string | null = null

export async function loadGlossary(): Promise<Glossary> {
  if (cachedGlossary) return cachedGlossary
  const raw = await readFile(path.join(CONTENT_DIR, 'glossary.json'), 'utf8')
  cachedGlossary = JSON.parse(raw) as Glossary
  return cachedGlossary
}

export async function loadStyleGuide(): Promise<string> {
  if (cachedStyleGuide) return cachedStyleGuide
  cachedStyleGuide = await readFile(path.join(CONTENT_DIR, 'style-guide.md'), 'utf8')
  return cachedStyleGuide
}

/**
 * Renders the glossary as a prompt block. Both lists are explicit, because
 * there is no rule a model could infer about which terms stay in English.
 */
export async function loadGlossaryForPrompt(): Promise<string> {
  const g = await loadGlossary()
  const translated = g.terms.filter((t) => t.translate)
  const kept = g.terms.filter((t) => !t.translate)

  return [
    '### Verplicht in het Nederlands',
    ...translated.map(
      (t) => `- "${t.en}" → **${t.nl}**${t.note ? ` (${t.note})` : ''}`,
    ),
    '',
    '### Verplicht in het Engels — vertaal deze NIET',
    ...kept.map((t) => `- **${t.nl}**${t.note ? ` (${t.note})` : ''}`),
    '',
    `Verzin geen Nederlands voor de tweede lijst. Link bij het eerste gebruik van`,
    `elke term naar ${g.sourceUrl}.`,
  ].join('\n')
}

/** The ITN framework, for the method page. */
export async function loadFramework(): Promise<Glossary['framework']> {
  return (await loadGlossary()).framework
}

/** Terms to check a generated page against, for the adversarial pass. */
export async function glossaryCheckList(): Promise<{ required: string[]; forbidden: string[] }> {
  const g = await loadGlossary()
  return {
    // If the English form of a translated term appears in Dutch prose, that is
    // a finding.
    forbidden: g.terms.filter((t) => t.translate).map((t) => t.en),
    // If a keep-in-English term has been translated, that is also a finding —
    // but it can only be detected by absence, so the checker looks for the
    // required form.
    required: g.keepInEnglish,
  }
}
