/**
 * Generates the explainer layer — spec §9.5, M5b.
 *
 *   npm run generate-explainers -- --list
 *   npm run generate-explainers -- --page=global-catastrophic-risks
 *   npm run generate-explainers -- --all
 *   npm run generate-explainers -- --all --publish   # write into Sanity
 *
 * The method here is not optional and the order matters. From the spec:
 *
 *   "mirror the existing glossary from /begrippenlijst into the repo as JSON,
 *    including the explicit keep-in-English list; scrape EA NL's other Dutch
 *    pages and distil the style guide; then generate pages one at a time, each
 *    through the adversarial anti-translationese pass until clean; then generate
 *    the English versions separately from the same outlines."
 *
 * Two techniques carry most of the quality, and skipping them undoes most of the
 * benefit:
 *
 *   1. Generate natively in Dutch, never translate into it. Translation is where
 *      the register dies — the English sentence structure survives the vocabulary
 *      swap and the result reads as foreign even when every word is correct.
 *   2. Use the existing human-translated glossary as a hard vocabulary
 *      constraint, including which terms stay in English.
 *
 * The English versions are composed separately from a shared outline rather than
 * translated, because "a one-sentence note survives machine translation, a page
 * of argument does not" (§12).
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { ANTI_TRANSLATIONESE_SYSTEM } from '../jobboard/classify/prompt'
import { CRITIQUE_SCHEMA, type Critique } from '../jobboard/classify/schema'
import {
  glossaryCheckList,
  loadFramework,
  loadGlossary,
  loadGlossaryForPrompt,
  loadStyleGuide,
} from '../jobboard/content/style'
import { PROSE_MODEL, proseCall, structuredCall } from '../jobboard/lib/anthropic'
import { isSanityConfigured, writeClient } from '../jobboard/sanity/client'
import {
  CAUSE_AREA_DEFINITIONS,
  CAUSE_AREAS,
  SUB_AREA_TITLES_NL,
  SUB_AREAS_BY_CAUSE,
  type CauseArea,
} from '../jobboard/taxonomy'
import { t as translationsFor } from '../jobboard/content/i18n'
import { slugify } from '../jobboard/lib/text'
import { log, main, num, parseArgs, printReport } from './_cli'

const OUT_DIR = path.resolve(process.cwd(), 'src/jobboard/content/explainers')

type PageSpec = {
  key: string
  kind: 'method' | 'cause' | 'earning-to-give'
  causeArea?: CauseArea
  titleNl: string
  titleEn: string
  slugNl: string
  slugEn: string
  brief: string
  words: [number, number]
}

/** Dutch-language search terms with real volume and almost no good answer (§9.8). */
const CAUSE_SEARCH_HINTS: Record<CauseArea, string> = {
  'global-health-wellbeing':
    'banen ontwikkelingssamenwerking, mondiale gezondheid werk, global health vacatures Nederland',
  'farmed-animal-welfare':
    'banen eiwittransitie, alt protein careers Nederland, werken aan dierenwelzijn, kweekvlees banen',
  'global-catastrophic-risks':
    'banen AI-beleid, AI safety vacatures Nederland, pandemische paraatheid werk, internationale veiligheid banen Den Haag, non-proliferatie werk',
  'better-futures':
    'AI governance jobs Netherlands, beleidsmedewerker AI, banen digitale grondrechten, toekomstige generaties beleid',
  'movement-building':
    'effectief altruïsme vacatures, banen goede doelen effectief geven, community builder vacature, School for Moral Ambition banen',
}

async function buildSpecs(): Promise<PageSpec[]> {
  const framework = await loadFramework()

  const method: PageSpec = {
    key: 'method',
    kind: 'method',
    titleNl: 'Waarom deze banen?',
    titleEn: 'Why these jobs?',
    slugNl: 'waarom-deze-banen',
    slugEn: 'why-these-jobs',
    words: [700, 900],
    brief: `Explain how a role gets onto this board.

Structure the page on the ${framework.name} exactly as EA NL's own glossary defines it — ${framework.dimensions
      .map((d) => d.nl)
      .join(', ')} — rather than inventing a frame. Then add ${framework.fourth.nl} as the fourth thing this board looks at that the framework alone does not capture: ${framework.fourth.question}

Using the site's established vocabulary does double duty: it explains the board, and it teaches the single most useful idea a newcomer could take away, in words consistent with the rest of the site.

Then cover, concretely:
- that most listings are at employers who would not describe themselves as impact-focused, and why that is the point rather than a compromise
- FIRST, before anything about our own method: that someone genuinely optimising for impact should look at 80,000 Hours, Probably Good and the EA Opportunities board before looking here, because most of the strongest roles are not in the Netherlands. Then that this board is for people who cannot or will not relocate — a partner's job, children in school, caring responsibilities, a residence permit, or simply not wanting to leave — and that this is a reasonable trade-off rather than a lack of commitment. Do not soften this into a marketing line; the reader who can move should be able to act on it and leave.
- why climate is not one of the four problem areas. The reason is neglectedness, not importance: climate already attracts a great deal of Dutch money, talent and political attention, and the problems on this board do not. Say that the question of which climate work is underrated is a good and separate one, and refer the reader to Effective Environmentalism (effectiveenvironmentalism.org). Do not imply the board has a view on which climate charities are effective — it deliberately does not.
- that one category works differently and is gated by an allowlist rather than judgement: earning to give (a named employer list plus a salary floor). Say why: there are thousands of well-paid Amsterdam jobs, and a category that let everything in would drag down trust in the whole board.
- that the board is deliberately small, and that 25 good listings beat 200 mediocre ones
- that a piece of software drafts a first version of each note and a person edits and publishes it
- that the board is curated by people who can be wrong, and how to disagree with a listing (email)

In "uncertainties": be specific and self-critical. Name the real weaknesses — that the framework is a simplification, that leverage is a judgement not a measurement, that a curated board reflects the curator's blind spots, that being on this list is not a claim that no other job matters.`,
  }

  const e2g: PageSpec = {
    key: 'earning-to-give',
    kind: 'earning-to-give',
    titleNl: 'Earning to give',
    titleEn: 'Earning to give',
    slugNl: 'earning-to-give',
    slugEn: 'earning-to-give',
    words: [700, 900],
    brief: `Explain earning to give, and make the Dutch-specific case — no existing EA resource does.

The Dutch case is unusually strong and concrete. Amsterdam is one of Europe's largest proprietary trading hubs: Optiver, IMC, Flow Traders and Da Vinci are all headquartered there, with other quantitative firms holding Amsterdam offices. They are among the highest-paying graduate employers in continental Europe and recruit heavily from Dutch technical universities. A Dutch maths or physics graduate weighing Optiver against a research post is making exactly the decision this idea exists to inform, and right now nothing in the Dutch ecosystem meets them at that moment. Beyond trading: senior software engineering, strategy consulting, corporate law and medicine all clear the bar.

Mention the 30% expat ruling as a factor that raises take-home pay for internationally recruited candidates, note it drops to 27% from 2027 and that conditions and thresholds change regularly, and point people to a tax adviser. Do NOT compute or promise anything — this is the easiest place on the whole board to accidentally give bad financial advice.

State plainly that listing an employer here is not an endorsement of that employer, and that some of these firms do work parts of the community consider net-negative. Treat that as a real disagreement stated openly rather than something to smooth over.

In "uncertainties": this is the honest case AGAINST, and it must be strong. Earning to give is contested within EA. Salary is a weak proxy for how much someone actually gives. The plan quietly fails for many people who adopt it — income rises and giving does not, or the job absorbs the person. High-paying work can do harm that donations do not offset. A newcomer who encounters a one-sided pitch and later discovers the debate will trust nothing else on the site, so do not hedge this section.`,
  }

  // All four areas get a page. There is no longer a pseudo-category to skip.
  const causes: PageSpec[] = CAUSE_AREAS.map((cause) => ({
    key: cause,
    kind: 'cause' as const,
    causeArea: cause,
    titleNl: '',
    titleEn: '',
    slugNl: cause,
    slugEn: cause,
    words: [400, 600],
    brief: `Write the explainer for the problem area \`${cause}\`.

Our internal definition: ${CAUSE_AREA_DEFINITIONS[cause]}

Cover four things:
1. What the problem is, for a reader who has never thought about it.
2. Why this board treats it as important — in the framework's terms, but without naming the framework mechanically.
3. What kinds of Dutch roles bear on it. Be concrete about the *kinds* of employer (a ministry, a regulator, a research institute, a lender, a foundation) rather than naming specific organisations, since the listings themselves change.
4. Honest acknowledgement of what is uncertain or disputed — in the "uncertainties" field.

What falls inside this area: ${SUB_AREAS_BY_CAUSE[cause].map((sub) => SUB_AREA_TITLES_NL[sub]).join('; ')}.

${
      cause === 'global-catastrophic-risks'
        ? 'This area and `better-futures` divide the AI work between them, and the page should make the boundary clear without labouring it: here the concern is a catastrophe — AI escaping human control, or being used to cause mass casualties. Work on who ends up holding power, and which values get entrenched, belongs to better futures.\n\n'
        : ''
    }${
      cause === 'better-futures'
        ? 'This is the least familiar of the four and the page carries the most explanatory load. The core idea: humanity could survive the century and still end up somewhere far worse than it had to be — power concentrated in very few hands, bad values locked in and made permanent by technology that makes them hard to reverse, or vast numbers of beings whose interests nobody counts. Distinguish it from global catastrophic risks explicitly: that area is about whether we make it through, this one is about whether what comes after is any good. Avoid science-fiction register; the Dutch reader most likely to bounce off this page is a serious person who suspects it is speculation.\n\n'
        : ''
    }${
      cause === 'farmed-animal-welfare'
        ? 'Be precise that this is about animals in food production, not nature or biodiversity work. That boundary is what keeps the category meaningful.\n\n'
        : ''
    }This page must be worth reading on its own, independently of the job board. A page that only makes sense as a wrapper around vacancies will neither rank nor deserve to.

For context on search: readers reach pages like this from queries such as "${CAUSE_SEARCH_HINTS[cause]}". Write the page those readers were looking for. Do not stuff keywords.

This page's title is fixed by the site's own taxonomy and appears verbatim in its navigation, filters and breadcrumbs elsewhere on the board — it is not yours to phrase. Use exactly this string as the ===TITLE=== block, in whichever language you are writing this page in: Dutch page → "${translationsFor('nl').causeAreas[cause]}", English page → "${translationsFor('en').causeAreas[cause]}". Follow this even where the style guide's general phrasing preferences (e.g. "wereldwijde" over "mondiale") would suggest otherwise — a page whose own body avoids the exact words its H1 uses reads as broken, not careful.`,
  }))

  return [method, e2g, ...causes]
}

type Generated = {
  title: string
  summary: string
  body: string
  uncertainties: string
  critiquePasses: number
}

/**
 * Generates one page in one language, natively, then runs the adversarial
 * anti-translationese pass until it comes back clean.
 */
async function generate(
  spec: PageSpec,
  language: 'nl' | 'en',
  maxPasses: number,
): Promise<Generated> {
  const [styleGuide, glossary, glossaryPrompt, checks] = await Promise.all([
    loadStyleGuide(),
    loadGlossary(),
    loadGlossaryForPrompt(),
    glossaryCheckList(),
  ])

  const dutch = language === 'nl'

  const system = dutch
    ? `Je schrijft een pagina voor het vacaturebord van Effectief Altruïsme Nederland.

De lezer is intelligent, sceptisch, en heeft nog nooit van effectief altruïsme gehoord. Dat is de echte mediane nieuwkomer — geen leeg blad. Schrijf zo dat die persoon je serieus neemt.

Twee harde eisen:

1. **Neem de tegenargumenten op.** De geloofwaardigheid van een samengesteld bord hangt erop dat de lezer denkt dat de curator eerlijk is. Een pagina die één kant kiest bereikt het tegenovergestelde van wat hij moet doen.

2. **Geen onuitgelegd jargon.** Niet "neglectedness", niet "counterfactual impact" zonder uitleg, niet "x-risk", niet "prioritering van problemen" als losse woordgroep, en "EA" nooit als bijvoeglijk naamwoord. Heb je een begrip nodig, leg het uit waar je het gebruikt of verwijs naar ${glossary.sourceUrl}.

Schrijf direct in het Nederlands. Vertaal niet uit het Engels — dat is precies waar het register sneuvelt.

## Huisstijl

${styleGuide}

## Begrippenlijst — verplichte terminologie

${glossaryPrompt}

## Uitvoerformaat

Antwoord met exact deze vier blokken, in deze volgorde, met deze markeringen en niets erbuiten:

===TITLE===
(één regel)
===SUMMARY===
(twee of drie zinnen, maximaal 400 tekens — wordt de meta-description)
===BODY===
(de pagina in Markdown, ${spec.words[0]}–${spec.words[1]} woorden, met ## kopjes)
===UNCERTAINTIES===
(wat we niet zeker weten — minimaal 80 tekens, en eerlijk)`
    : `You are writing a page for the job board of Effective Altruism Netherlands, for its English-language readers — mostly international people already in or considering the Netherlands.

This is NOT a translation. You are composing independently in English from the same brief. The Dutch version exists and is the source of record for the argument, but the English page must read as if written in English from scratch.

Two hard requirements:

1. **Include the counterarguments.** A page that only argues one side achieves the opposite of what it is for.
2. **No unexplained jargon.** Not "neglectedness", not "counterfactual impact" without explanation, not "x-risk", and never "EA" as an adjective. If you need a concept, explain it where you use it or link to ${glossary.sourceUrl}.

Assume the reader is intelligent, sceptical, and has never heard of any of this.

## Output format

Reply with exactly these four blocks, in this order, with these markers and nothing outside them:

===TITLE===
(one line)
===SUMMARY===
(two or three sentences, max 400 characters)
===BODY===
(the page in Markdown, ${spec.words[0]}–${spec.words[1]} words, with ## headings)
===UNCERTAINTIES===
(what we are not sure about — at least 80 characters, and honest)`

  let text = await proseCall({ model: PROSE_MODEL, system, user: spec.brief, maxTokens: 8000 })
  let parsed = parseBlocks(text)

  // The adversarial pass. Only Dutch: it exists to catch translationese, and the
  // English page is composed natively in English so there is nothing to catch.
  let passes = 0
  if (dutch) {
    for (passes = 0; passes < maxPasses; passes++) {
      const { value: critique } = await structuredCall<Critique>({
        model: PROSE_MODEL,
        system: ANTI_TRANSLATIONESE_SYSTEM,
        user: [
          '## Begrippenlijst',
          glossaryPrompt,
          '',
          '## Extra controle',
          `Deze Engelse termen mogen NIET in de Nederlandse tekst staan (er is een Nederlandse vorm): ${checks.forbidden.join(', ')}`,
          `Deze termen moeten juist in het Engels blijven staan: ${checks.required.join(', ')}`,
          '',
          '## Te beoordelen tekst',
          '',
          `# ${parsed.title}`,
          '',
          parsed.summary,
          '',
          parsed.body,
          '',
          '## Wat we niet zeker weten',
          parsed.uncertainties,
        ].join('\n'),
        schema: CRITIQUE_SCHEMA,
        // Was 4000 — too tight once the critic finds enough issues on a
        // 700-900 word page to fill it (each finding quotes a verbatim
        // fragment plus a problem and a suggested fix). Matches the budget
        // given to the generation and rewrite calls below.
        maxTokens: 8000,
      })

      if (critique.findings.length === 0) {
        log(`  ${spec.key} [nl]: clean after ${passes} revision pass(es)`)
        break
      }
      log(`  ${spec.key} [nl]: pass ${passes + 1} — ${critique.findings.length} finding(s)`)

      text = await proseCall({
        model: PROSE_MODEL,
        system,
        user: [
          spec.brief,
          '',
          '## Je vorige versie',
          '',
          text,
          '',
          '## Bevindingen van de eindredacteur — los deze allemaal op',
          '',
          ...critique.findings.map(
            (f, i) => `${i + 1}. "${f.fragment}" — ${f.problem}\n   Voorstel: ${f.suggestion}`,
          ),
          '',
          'Herschrijf de hele pagina in hetzelfde uitvoerformaat. Los elke bevinding op zonder de argumentatie te veranderen.',
        ].join('\n'),
        maxTokens: 8000,
      })
      parsed = parseBlocks(text)
    }
  }

  return { ...parsed, critiquePasses: passes }
}

function parseBlocks(text: string): Omit<Generated, 'critiquePasses'> {
  const pick = (name: string) =>
    text.match(new RegExp(`===${name}===\\s*([\\s\\S]*?)(?====[A-Z]+===|$)`))?.[1]?.trim() ?? ''
  const out = {
    title: pick('TITLE').replace(/^#+\s*/, ''),
    summary: pick('SUMMARY'),
    body: pick('BODY'),
    uncertainties: pick('UNCERTAINTIES'),
  }
  if (!out.title || !out.body) {
    throw new Error('model did not return the expected ===TITLE===/===BODY=== blocks')
  }
  return out
}

/**
 * Markdown → Portable Text. Deliberately minimal: the explainer schema allows
 * headings, paragraphs, lists, blockquotes and links, and nothing else.
 */
function toPortableText(markdown: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = []
  let listBuffer: { style: 'bullet' | 'number'; text: string }[] = []

  const flushList = () => {
    for (const item of listBuffer) {
      blocks.push(block(item.text, 'normal', item.style))
    }
    listBuffer = []
  }

  const block = (text: string, style: string, listItem?: 'bullet' | 'number') => {
    // Inline links: [label](href). Everything else renders as plain spans.
    const children: Record<string, unknown>[] = []
    const markDefs: Record<string, unknown>[] = []
    let cursor = 0
    let n = 0
    for (const m of text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
      if (m.index! > cursor) {
        children.push({ _type: 'span', _key: `s${n++}`, text: strip(text.slice(cursor, m.index)), marks: [] })
      }
      const key = `l${n}`
      markDefs.push({ _type: 'link', _key: key, href: m[2] })
      children.push({ _type: 'span', _key: `s${n++}`, text: strip(m[1]), marks: [key] })
      cursor = m.index! + m[0].length
    }
    if (cursor < text.length) {
      children.push({ _type: 'span', _key: `s${n++}`, text: strip(text.slice(cursor)), marks: [] })
    }
    return {
      _type: 'block',
      _key: `b${blocks.length}`,
      style,
      markDefs,
      children: children.length ? children : [{ _type: 'span', _key: 's0', text: '', marks: [] }],
      ...(listItem ? { listItem, level: 1 } : {}),
    }
  }

  const strip = (s: string) => s.replace(/\*\*/g, '').replace(/(^|\s)\*(\S)/g, '$1$2').trim()

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trimEnd()
    if (!line.trim()) {
      flushList()
      continue
    }
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (bullet) {
      listBuffer.push({ style: 'bullet', text: bullet[1] })
      continue
    }
    if (numbered) {
      listBuffer.push({ style: 'number', text: numbered[1] })
      continue
    }
    flushList()
    const heading = line.match(/^(#{2,4})\s+(.*)$/)
    if (heading) {
      blocks.push(block(heading[2], heading[1].length === 2 ? 'h2' : 'h3'))
      continue
    }
    const quote = line.match(/^>\s?(.*)$/)
    if (quote) {
      blocks.push(block(quote[1], 'blockquote'))
      continue
    }
    blocks.push(block(line, 'normal'))
  }
  flushList()
  return blocks
}

void main(async () => {
  const args = parseArgs()
  const specs = await buildSpecs()

  if (args.flags.has('list') || (!args.flags.has('all') && !args.values.get('page'))) {
    console.log('\nExplainer pages (spec §9.5, M5b):\n')
    for (const s of specs) {
      console.log(`  ${s.key.padEnd(28)} ${s.kind}  ${s.words[0]}–${s.words[1]} words`)
    }
    console.log(
      '\n  npm run generate-explainers -- --page=<key>\n' +
        '  npm run generate-explainers -- --all\n' +
        '  npm run generate-explainers -- --all --publish     # also write into Sanity\n' +
        '  npm run generate-explainers -- --all --en          # English versions too\n\n' +
        'Run `npm run mirror-glossary` FIRST. The glossary and style corpus are what\n' +
        'make the Dutch publishable; skipping them undoes most of the benefit (§9.5).\n',
    )
    return
  }

  const wanted = args.flags.has('all')
    ? specs
    : specs.filter((s) => s.key === args.values.get('page'))
  if (wanted.length === 0) throw new Error(`unknown page "${args.values.get('page')}"`)

  const languages: ('nl' | 'en')[] = args.flags.has('en') ? ['nl', 'en'] : ['nl']
  const maxPasses = num(args, 'passes', 4)
  const publish = args.flags.has('publish')
  if (publish && !isSanityConfigured) {
    throw new Error('cannot publish: NEXT_PUBLIC_SANITY_PROJECT_ID is not set')
  }
  const client = publish ? writeClient() : null

  await mkdir(OUT_DIR, { recursive: true })
  const written: string[] = []

  for (const spec of wanted) {
    for (const language of languages) {
      log(`generating ${spec.key} [${language}]…`)
      const page = await generate(spec, language, maxPasses)

      // Always write the Markdown to disk, whether or not we publish. It is the
      // reviewable artefact: read the method page aloud before trusting it.
      const file = path.join(OUT_DIR, `${spec.key}.${language}.md`)
      await writeFile(
        file,
        [
          '---',
          `key: ${spec.key}`,
          `kind: ${spec.kind}`,
          spec.causeArea ? `causeArea: ${spec.causeArea}` : null,
          `language: ${language}`,
          `title: ${JSON.stringify(page.title)}`,
          `slug: ${language === 'nl' ? spec.slugNl : spec.slugEn}`,
          `critiquePasses: ${page.critiquePasses}`,
          `generatedWith: ${PROSE_MODEL}`,
          'reviewedByHuman: false',
          '---',
          '',
          `> ${page.summary}`,
          '',
          page.body,
          '',
          `## ${language === 'nl' ? 'Wat we niet zeker weten' : 'What we are not sure about'}`,
          '',
          page.uncertainties,
          '',
        ]
          .filter((l) => l !== null)
          .join('\n'),
        'utf8',
      )
      written.push(path.relative(process.cwd(), file))

      if (client) {
        const docId = `explainer-${spec.key}-${language}`
        await client.createOrReplace({
          _id: docId,
          _type: 'explainerPage',
          language,
          kind: spec.kind,
          causeArea: spec.causeArea,
          title: page.title,
          slug: {
            _type: 'slug',
            current: slugify(language === 'nl' ? spec.slugNl : spec.slugEn),
          },
          summary: page.summary.slice(0, 400),
          body: toPortableText(page.body),
          uncertainties: page.uncertainties,
          reviewedByHuman: false,
          critiquePasses: page.critiquePasses,
        })
        log(`  published ${docId}`)
      }
    }
  }

  printReport('Explainers generated', {
    pages: wanted.length,
    languages: languages.join(', '),
    model: PROSE_MODEL,
    published: publish ? 'yes' : 'no (use --publish)',
    files: written,
  })

  console.log(
    'Residual risk, stated honestly (§9.5): this gets you prose that is clearly\n' +
      'competent and probably not distinctive. If anyone at EA NL who reads Dutch\n' +
      'comfortably ever has twenty minutes, spend it reading the method page aloud.\n' +
      'That is an offer, not a dependency — then set reviewedByHuman in Studio.\n',
  )
})
