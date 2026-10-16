/**
 * Short programmes abroad — added October 2026.
 *
 * The board exists for people who cannot or will not move. A twelve-week paid
 * residency in Berkeley does not ask anyone to move: you go, you come back, and
 * the Dutch flat, partner and job search are all still there. Before this rule
 * the location gate treated it like a permanent Berkeley job and dropped it, so
 * the career-transition programmes that are often the best next step for a
 * Dutch reader never reached the board at all.
 *
 * The rule, deliberately mechanical so it cannot drift into a judgement call:
 *
 *   a programme counts as NL-eligible wherever it is held when it runs for
 *   six months or less and it is paid (a stipend or salary).
 *
 * Six months is roughly where "going away for a bit" becomes "moving", with a
 * lease to break and a tax residence to think about. Pay is what makes it
 * possible for someone who is not already well off: an unpaid three months in
 * California is a programme for people with savings, and the board should not
 * quietly present it as open to everyone.
 *
 * Travel cover was part of the first draft and was dropped at James's call
 * (16 October 2026): a stipend usually covers a flight, and requiring the ad to
 * say so would drop good programmes over a sentence their page left out. It is
 * still read and stored — a curator, and later a reader, will want to know —
 * but it no longer decides anything.
 *
 * The facts are read from the ad text by pattern first. Where the text does not
 * say, stage one lets the listing through and the classifier reads the same
 * facts; `run.ts` then applies this same function to the merged facts, so the
 * model extracts and the code decides. Anything still unknown after both is not
 * eligible — the same round-down the scoring prompt asks for.
 */

/** 26 weeks, i.e. six months. */
export const MAX_PROGRAMME_WEEKS = 26

export type ProgrammeTerms = {
  /** The longest duration the ad states, in weeks; null when it states none. */
  weeks: number | null
  /** True for a stated stipend or salary, false for an explicitly unpaid one. */
  paid: boolean | null
  /** True when travel (or housing) is said to be covered, false when it is said not to be. Recorded, not decisive. */
  travelCovered: boolean | null
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  a: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fourteen: 14,
  sixteen: 16,
  eighteen: 18,
  twenty: 20,
}

const UNIT_WEEKS: Record<string, number> = { week: 1, month: 52 / 12, year: 52 }

/** Words that make a stated duration the length of the programme, not of something else. */
const PROGRAMME_CONTEXT =
  /\b(residency|programme|program|fellowship|course|bootcamp|boot camp|placement|internship|traineeship|cohort|sprint|summer school|retreat|incubat\w*|accelerator|duration|runs|lasts|full[- ]time for|fixed[- ]term)\b/i

const DURATION =
  /(?:~|about |approximately |around )?\b(\d{1,2}(?:\.\d)?|one|a|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen|sixteen|eighteen|twenty)(?:\s+|-)(week|month|year)s?\b/gi

/**
 * How long the programme runs, in weeks — when the text is unambiguous.
 *
 * A programme's own page mentions many durations: the programme, an optional
 * extension, last year's cohort, how long alumni stayed on, an age limit. So
 * the text only decides when every duration it gives lands on the same side of
 * the six-month line. All short → the longest of them (the whole programme,
 * not its orientation week). All long → the shortest, which is still long.
 * Mixed → null, and the classifier reads it instead. Pivotal's fellowship,
 * October 2026, is why: "15-week" in the summary and "15 months" further down
 * the page, and taking the longest dropped a short programme at stage one.
 *
 * A duration only counts when a programme word sits within a few words of it,
 * which keeps out "we reply within two weeks", "six months of experience" and
 * "at least five years".
 */
export function programmeWeeks(text: string): number | null {
  const found: number[] = []
  for (const m of text.matchAll(DURATION)) {
    const start = m.index ?? 0
    const after = text.slice(start + m[0].length, start + m[0].length + 30)
    if (/^\s*(of|experience|old|or (more|longer|older))\b/i.test(after)) continue
    const before = text.slice(Math.max(0, start - 20), start)
    if (/\b(at least|minimum( of)?|min\.?|over|more than|up to|within|aged?|after|every)\s*$/i.test(before)) {
      continue
    }
    const context = text.slice(Math.max(0, start - 50), start + m[0].length + 40)
    if (!PROGRAMME_CONTEXT.test(context)) continue
    const raw = m[1].toLowerCase()
    const n = NUMBER_WORDS[raw] ?? Number.parseFloat(raw)
    if (!Number.isFinite(n) || n <= 0) continue
    found.push(Math.round(n * UNIT_WEEKS[m[2].toLowerCase()]))
  }
  if (!found.length) return null
  if (found.every((w) => w <= MAX_PROGRAMME_WEEKS)) return Math.max(...found)
  if (found.every((w) => w > MAX_PROGRAMME_WEEKS)) return Math.min(...found)
  return null
}

const UNPAID = /\bunpaid\b|\bno (stipend|salary|compensation|pay)\b|\b(is|are) not paid\b|\bvoluntary basis\b/i
const PAID =
  /\bstipends?\b|\bhonorari(um|a)\b|\b(paid|salaried)\s+(residency|fellowship|internship|traineeship|programme|program|position|placement)\b|\b(salary|compensation)\b|[$€£]\s?\d[\d,.]*\s*k?\b[^.\n]{0,30}\b(per|a|\/)\s*(month|week|hour|year|annum)\b|\b(USD|EUR|GBP)\s?\d/i

export function programmePaid(text: string): boolean | null {
  if (UNPAID.test(text)) return false
  if (PAID.test(text)) return true
  return null
}

const TRAVEL_NOT_COVERED =
  /\b(travel|flights?|accommodation|housing)\b[^.\n]{0,40}\bnot (covered|provided|included|reimbursed)\b|\bat (your|their|the participant'?s?|participants'?) own (cost|expense)\b/i
const TRAVEL_COVERED =
  /\b(cover(s|ed|ing)?|reimburs\w*|pays? for|paying for|provid(e|es|ed|ing)|fund(s|ed|ing)?|sponsor(s|ed)?)\b[^.\n]{0,50}\b(travel|flights?|airfare|accommodation|housing|lodging)\b|\b(travel|flights?|airfare|accommodation|housing|lodging)\b[^.\n]{0,40}\b(is |are |will be )?(covered|provided|reimbursed|included|paid for|funded)\b/i

export function programmeTravelCovered(text: string): boolean | null {
  if (TRAVEL_NOT_COVERED.test(text)) return false
  if (TRAVEL_COVERED.test(text)) return true
  return null
}

export function programmeTerms(text: string | null | undefined): ProgrammeTerms {
  const t = text ?? ''
  return { weeks: programmeWeeks(t), paid: programmePaid(t), travelCovered: programmeTravelCovered(t) }
}

/**
 * The rule itself. `eligible` is null when the facts to decide are not all
 * there yet — stage one passes those on, and `run.ts` treats a null that
 * survives the classifier as not eligible.
 */
export function shortProgrammeVerdict(terms: ProgrammeTerms): {
  eligible: boolean | null
  reason: string
} {
  if (terms.weeks !== null && terms.weeks > MAX_PROGRAMME_WEEKS) {
    return {
      eligible: false,
      reason: `programme abroad runs ${terms.weeks} weeks; past six months it means moving`,
    }
  }
  if (terms.paid === false) return { eligible: false, reason: 'programme abroad is unpaid' }
  if (terms.weeks !== null && terms.paid) {
    const travel =
      terms.travelCovered === true
        ? ' with travel covered'
        : terms.travelCovered === false
          ? ', travel not covered'
          : ''
    return {
      eligible: true,
      reason: `paid programme of ${terms.weeks} weeks${travel}; held abroad but no move needed`,
    }
  }
  const missing = [terms.weeks === null ? 'duration' : null, terms.paid === null ? 'pay' : null].filter(
    Boolean,
  )
  return { eligible: null, reason: `programme abroad; ad does not state ${missing.join(', ')}` }
}

/** Fills the gaps in what the text said with what the classifier read. The text wins where both speak. */
export function mergeTerms(fromText: ProgrammeTerms, fromModel: Partial<ProgrammeTerms>): ProgrammeTerms {
  return {
    weeks: fromText.weeks ?? fromModel.weeks ?? null,
    paid: fromText.paid ?? fromModel.paid ?? null,
    travelCovered: fromText.travelCovered ?? fromModel.travelCovered ?? null,
  }
}

/**
 * Title words that mark a programme on a source that does not label it.
 *
 * Narrow on purpose. "Fellowship" and "residency" are programmes; a bare
 * "Research Fellow" is very often a postdoc job and stays a job. Getting this
 * wrong in the generous direction only matters for roles held abroad, and
 * even then the duration and pay tests still have to pass.
 */
const PROGRAMME_TITLE =
  /\b(fellowship|residency|bootcamp|boot camp|summer school|accelerator|incubator|incubation program(me)?|cohort)\b/i

export function looksLikeProgramme(title: string): boolean {
  return PROGRAMME_TITLE.test(title)
}
