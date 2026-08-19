/**
 * The browse grid — the index's front door, rebuilt August 2026.
 *
 * ## Why this replaced a filter bar
 *
 * The index used to open with five select dropdowns. A dropdown is a fine
 * control for someone who already knows the vocabulary and is narrowing a list
 * they can see. It is a poor front door, because it asks the reader to know the
 * answer before it shows them the options — and this board's vocabulary is not
 * one anybody arrives holding.
 *
 * The sharpest case: "global catastrophic risks" is how we reason about the
 * problem space, and it is not what anyone types into a search box. People look
 * for AI safety. For pandemic preparedness. For nuclear security. So the cause
 * tile carries its sub-areas as chips, each a link straight to its own filtered
 * list — the cause area organises the page, but the sub-area is the thing you
 * click, and it is visible without opening anything.
 *
 * ## Why counts are on every tile
 *
 * This board is deliberately short — a few dozen listings, not a few thousand.
 * A grid of eighteen sub-areas over thirty-six listings will have empty corners,
 * and an empty destination that looked identical to a full one on the way in is
 * the fastest way to make a small board feel broken. So every tile and chip
 * states its count, and anything at zero is rendered as plain dimmed text
 * rather than a link. Nothing here promises a list it cannot produce.
 *
 * ## Icons, not photographs
 *
 * The EAN system is light mode, one accent hue, no gradients, Tabler outline
 * icons, no emoji. A tile grid in that system gets its energy from type,
 * counts and spacing rather than from imagery — so each tile carries a single
 * large Tabler glyph on a tinted panel. That is also the honest option: we have
 * no per-cause photography, and stock imagery of "global health" is exactly the
 * register the board's copy works hardest to avoid.
 */

import Link from 'next/link'
import { Icon, type IconName } from './Icon'
import { routes, t, type Locale } from '../content/i18n'
import {
  CAUSE_AREAS,
  SKILLS,
  SUB_AREAS_BY_CAUSE,
  type CauseArea,
  type Skill,
  type SubArea,
} from '../taxonomy'
import u from './ui.module.css'

/**
 * One glyph per cause area. Chosen to describe the problem rather than the
 * mood: a telescope for the long-run future, a warning hexagon for catastrophe,
 * a group for the movement itself.
 */
const CAUSE_ICONS: Record<CauseArea, IconName> = {
  'global-health-wellbeing': 'heartbeat',
  'farmed-animal-welfare': 'pig',
  'global-catastrophic-risks': 'alert-hexagon',
  'better-futures': 'telescope',
  'movement-building': 'users-group',
}

const SKILL_ICONS: Record<Skill, IconName> = {
  communications: 'speakerphone',
  data: 'chart-dots',
  engineering: 'tool',
  finance: 'coin',
  'information-security': 'lock-square',
  legal: 'gavel',
  management: 'sitemap',
  operations: 'settings',
  policy: 'building-bank',
  research: 'microscope',
  'software-engineering': 'code',
}

export type BrowseCounts = {
  cause: Map<CauseArea, number>
  subArea: Map<SubArea, number>
  skill: Map<Skill, number>
}

/**
 * Counts every browsable facet in one pass over the listings.
 *
 * Cause counts include secondary causes — a role that is mostly AI governance
 * and partly AI safety should be findable from both tiles — while sub-area
 * counts do not, because a listing has exactly one sub-area and inflating that
 * number would make the chips disagree with the list they lead to.
 */
export function countFacets(
  listings: {
    primaryCause: CauseArea | null
    secondaryCauses: CauseArea[]
    subArea: SubArea | null
    skills: Skill[]
  }[],
): BrowseCounts {
  const cause = new Map<CauseArea, number>()
  const subArea = new Map<SubArea, number>()
  const skill = new Map<Skill, number>()
  const bump = <K,>(m: Map<K, number>, k: K | null | undefined) => {
    if (k != null) m.set(k, (m.get(k) ?? 0) + 1)
  }

  for (const l of listings) {
    for (const c of new Set([l.primaryCause, ...l.secondaryCauses])) bump(cause, c)
    bump(subArea, l.subArea)
    for (const s of new Set(l.skills)) bump(skill, s)
  }
  return { cause, subArea, skill }
}

/**
 * The cause grid. Five tiles; each lists its own sub-areas as links.
 *
 * Areas with no live roles at all still render — a reader deciding whether this
 * board covers their field is served better by "we track this, nothing is open"
 * than by an area silently missing from the page.
 */
export function CauseGrid({
  locale,
  counts,
}: {
  locale: Locale
  counts: BrowseCounts
}) {
  const copy = t(locale)
  const r = routes(locale)

  return (
    <div className={u.causeGrid}>
      {CAUSE_AREAS.map((cause) => {
        const total = counts.cause.get(cause) ?? 0
        const subs = SUB_AREAS_BY_CAUSE[cause]
        return (
          <article key={cause} className={u.causeTile}>
            <Link href={`${r.index}?cause=${cause}`} className={u.causeTileMain}>
              <span className={u.causeTileIcon} aria-hidden="true">
                <Icon name={CAUSE_ICONS[cause]} />
              </span>
              <h3 className={u.causeTileTitle}>{copy.causeAreas[cause]}</h3>
              <p className={u.causeTileBlurb}>{copy.causeBlurbs[cause]}</p>
              <p className={u.causeTileCount}>
                {total > 0 ? copy.browseRoleCount(total) : copy.browseEmptyTile}
              </p>
            </Link>

            {/*
              The chips are siblings of the tile link, never children of it —
              a link inside a link is invalid HTML and, more to the point, makes
              "go to AI safety" a coin flip against "go to the whole area".
            */}
            <ul className={u.subAreaChips}>
              {subs.map((sub) => {
                const n = counts.subArea.get(sub) ?? 0
                return (
                  <li key={sub}>
                    {n > 0 ? (
                      <Link href={`${r.index}?subarea=${sub}`} className={u.subAreaChip}>
                        {copy.subAreas[sub]}
                        <span className={u.subAreaChipCount}>{n}</span>
                      </Link>
                    ) : (
                      <span className={`${u.subAreaChip} ${u.subAreaChipEmpty}`}>
                        {copy.subAreas[sub]}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </article>
        )
      })}
    </div>
  )
}

/**
 * The skill grid, for readers who are cause-neutral.
 *
 * Ordered by count, so the eleven categories do not lead with whichever ones
 * happen to sort first alphabetically while the board has nothing in them.
 * Empty skills stay on the page, dimmed, for the same reason empty causes do.
 */
export function SkillGrid({ locale, counts }: { locale: Locale; counts: BrowseCounts }) {
  const copy = t(locale)
  const r = routes(locale)

  const ordered = [...SKILLS].sort((a, b) => {
    const diff = (counts.skill.get(b) ?? 0) - (counts.skill.get(a) ?? 0)
    return diff !== 0 ? diff : copy.skills[a].localeCompare(copy.skills[b], locale)
  })

  return (
    <div className={u.skillGrid}>
      {ordered.map((skill) => {
        const n = counts.skill.get(skill) ?? 0
        const inner = (
          <>
            <span className={u.skillTileIcon} aria-hidden="true">
              <Icon name={SKILL_ICONS[skill]} />
            </span>
            <span className={u.skillTileName}>{copy.skills[skill]}</span>
            <span className={u.skillTileCount}>{n > 0 ? n : '—'}</span>
          </>
        )
        return n > 0 ? (
          <Link key={skill} href={`${r.index}?skill=${skill}`} className={u.skillTile}>
            {inner}
          </Link>
        ) : (
          <span key={skill} className={`${u.skillTile} ${u.skillTileEmpty}`}>
            {inner}
          </span>
        )
      })}
    </div>
  )
}
