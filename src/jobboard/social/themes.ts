/**
 * Each week's post has a theme, on a four-week rotation (James, 9 Nov 2026).
 *
 * A mixed list of seven roles asks every reader to scan for the one that fits
 * them. "7 AI safety jobs you can do from the Netherlands" is a post a specific
 * person recognises and sends to a friend. The themes are the ones the board
 * can actually fill, counted against the live board on 9 November 2026
 * (eligible roles / organisations, one role per organisation per post):
 *
 *   AI safety and catastrophic risks  125 / 61   — could run weekly; held to one week in four
 *   Ways in                            40 / 32
 *   In the Netherlands                 35 / 20
 *   Global health and wellbeing        75 / 24   — alternates with animals
 *   Farmed animal welfare              36 / 28
 *
 * Left out on purpose: "remote" (nine in ten roles are remote, so it is the
 * mixed post by another name), and narrower combinations such as AI safety in
 * the Netherlands (7 organisations) or ways in within one cause, which the
 * four-week no-repeats rule would exhaust within a month.
 *
 * When a theme can't fill `MIN_THEMED` roles, the week falls back to the mixed
 * post and says so. James can switch a week's theme on /review/social.
 */

import type { Band } from '../lib/bands'
import type { CauseArea } from '../taxonomy'
import type { ListingView } from '../sanity/queries'

export const THEME_KEYS = ['mixed', 'ai-safety', 'ways-in', 'netherlands', 'global-health', 'animals'] as const
export type ThemeKey = (typeof THEME_KEYS)[number]

export const isThemeKey = (v: unknown): v is ThemeKey => THEME_KEYS.includes(v as ThemeKey)

/** Below this a theme falls back to the mixed post. */
export const MIN_THEMED = 5

export type Theme = {
  key: ThemeKey
  /** For the preview and the mail. */
  label: string
  /** Which roles belong. `local` is isLocal(listing), passed in to avoid a cycle. */
  matches: (listing: ListingView, band: Band, local: boolean) => boolean
  /** Cover headline: the plain part, then the part under the yellow marker. */
  cover: (count: number, funding: boolean) => { plain: string; marked: string }
  coverSub: string
  /** What the caption model is told about the week. */
  brief: string
  /** The board filtered to this theme, for the LinkedIn captions, and how that link is introduced. */
  boardQuery: string | null
  moreLine?: string
  /** Selection limits that make no sense inside the theme. */
  limits?: { maxPerCause?: number; maxRoutes?: number; minRoutes?: number }
}

/** "jobs", or "opportunities" when the post includes a funding call. */
const jobs = (n: number, funding: boolean) =>
  funding ? (n === 1 ? 'opportunity' : 'opportunities') : n === 1 ? 'job' : 'jobs'
const inCause = (l: ListingView, cause: CauseArea) => l.primaryCause === cause || l.secondaryCauses.includes(cause)
const ONE_CAUSE = { maxPerCause: 99 }

export const THEMES: Record<ThemeKey, Theme> = {
  mixed: {
    key: 'mixed',
    label: 'Mixed',
    matches: () => true,
    cover: (n, funding) => ({ plain: `${n} ${jobs(n, funding)} you can do`, marked: 'from the Netherlands' }),
    coverSub: 'On the world’s most pressing problems, for people based here: remote, hybrid or on site.',
    brief: 'A mix of roles across problem areas. Name the problem areas this week’s roles cover.',
    boardQuery: null,
  },
  'ai-safety': {
    key: 'ai-safety',
    label: 'AI safety and catastrophic risks',
    matches: (l) => inCause(l, 'global-catastrophic-risks'),
    cover: (n, funding) => ({ plain: `${n} ${jobs(n, funding)} in AI safety and catastrophic risks,`, marked: 'from the Netherlands' }),
    coverSub: 'Reducing the risks from advanced AI, pandemics and other threats to humanity’s future.',
    brief:
      'This week’s theme is AI safety and other global catastrophic risks (such as biosecurity). Open by naming the theme. Speak to people who already care about these risks or are curious about working on them.',
    boardQuery: 'cause=global-catastrophic-risks',
    moreLine: 'More roles in AI safety and catastrophic risks',
    limits: ONE_CAUSE,
  },
  'ways-in': {
    key: 'ways-in',
    label: 'Ways in',
    matches: (_l, band) => band === 'routes',
    cover: (n, funding) => ({ plain: `${n} ways into high-impact work,`, marked: 'from the Netherlands' }),
    coverSub: 'Internships, traineeships and paid programmes: a step into the teams doing the work.',
    brief:
      'This week’s theme is ways in: internships, traineeships and paid programmes (fellowships, residencies, bootcamps). Open by naming the theme. Speak to people early in their career or switching into this work; these roles are how people get into the teams doing it.',
    boardQuery: 'band=routes',
    moreLine: 'More ways in',
    limits: { maxRoutes: 99, minRoutes: 0 },
  },
  netherlands: {
    key: 'netherlands',
    label: 'In the Netherlands',
    matches: (_l, _band, local) => local,
    cover: (n, funding) => ({ plain: `${n} high-impact ${jobs(n, funding)}`, marked: 'in the Netherlands' }),
    coverSub: 'On site or hybrid, on the world’s most pressing problems.',
    brief:
      'This week’s theme is roles done in the Netherlands, on site or hybrid, rather than remote. Open by naming the theme. Speak to people who want to work here, alongside colleagues, on these problems.',
    // The board's location filter takes one value and these are two (on site, hybrid).
    boardQuery: null,
  },
  'global-health': {
    key: 'global-health',
    label: 'Global health and wellbeing',
    matches: (l) => inCause(l, 'global-health-wellbeing'),
    cover: (n, funding) => ({ plain: `${n} ${jobs(n, funding)} in global health,`, marked: 'from the Netherlands' }),
    coverSub: 'Saving and improving lives where a little goes a long way.',
    brief:
      'This week’s theme is global health and wellbeing: work that saves and improves lives, mostly in low-income countries. Open by naming the theme.',
    boardQuery: 'cause=global-health-wellbeing',
    moreLine: 'More roles in global health and wellbeing',
    limits: ONE_CAUSE,
  },
  animals: {
    key: 'animals',
    label: 'Farmed animal welfare',
    matches: (l) => inCause(l, 'farmed-animal-welfare'),
    cover: (n, funding) => ({ plain: `${n} ${jobs(n, funding)} for farmed animals,`, marked: 'from the Netherlands' }),
    coverSub: 'Reducing the suffering of the billions of animals in factory farms.',
    brief:
      'This week’s theme is farmed animal welfare: reducing the suffering of animals in factory farming, including alternative proteins and policy. Open by naming the theme.',
    boardQuery: 'cause=farmed-animal-welfare',
    moreLine: 'More roles for farmed animals',
    limits: ONE_CAUSE,
  },
}

/** The first themed Tuesday; the rotation counts weeks from here. */
const ANCHOR = Date.UTC(2026, 10, 17, 8) // Tuesday 17 November 2026, 09:00 Amsterdam

const ROTATION: ThemeKey[] = ['ai-safety', 'ways-in', 'netherlands', 'global-health']

/**
 * The theme for the post going out at `postAt`. Week four alternates global
 * health and animals, so each comes round every eight weeks. Posts before the
 * first themed Tuesday are mixed.
 */
export function themeForWeek(postAt: Date): ThemeKey {
  const weeks = Math.round((postAt.getTime() - ANCHOR) / (7 * 864e5))
  if (weeks < 0) return 'mixed'
  const slot = ROTATION[weeks % ROTATION.length]
  if (slot !== 'global-health') return slot
  return Math.floor(weeks / ROTATION.length) % 2 === 0 ? 'global-health' : 'animals'
}
