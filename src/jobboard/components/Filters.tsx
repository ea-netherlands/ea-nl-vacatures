/**
 * Index filters and the intro band — spec §9.2, §9.5.
 *
 * Filters are plain form controls driving URL search params rather than client
 * state, so every filter combination is a real, shareable, indexable URL and
 * the page still works without JavaScript.
 */

'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  CAUSE_AREAS,
  LANGUAGE_REQUIREMENTS,
  LOCATION_MODES,
  SENIORITIES,
  SKILLS,
  SUB_AREA_CAUSE,
  SUB_AREAS,
  SUB_AREAS_BY_CAUSE,
  type CauseArea,
} from '../taxonomy'
import { routes, t, type Locale } from '../content/i18n'
import { Icon } from './Icon'
import u from './ui.module.css'

export type FilterState = {
  /**
   * Not a filter. `view=all` forces the index out of its browse state and into
   * the plain list, for the reader who wants to see everything rather than
   * choose a way in. Without it, "no filters" and "show me everything" would be
   * the same URL and the second would be unreachable.
   */
  view?: string
  cause?: string
  subarea?: string
  skill?: string
  location?: string
  language?: string
  seniority?: string
  sort?: string
}

const INTRO_COOKIE = 'jb_intro_seen'

/**
 * The filter bar, rebuilt August 2026 around two axes rather than three.
 *
 * `leverage` used to sit here as the second axis and no longer does. It asked
 * readers to sort themselves by a concept they do not hold — nobody arrives
 * thinking "I would like to do capital allocation" — so it was retired from the
 * public UI and replaced by `skill`, which is the question a cause-neutral
 * reader can actually answer. Leverage is still classified and still gates
 * promotion; see the leverage section of ../taxonomy.
 *
 * The bar is also no longer the front door. It appears only once a reader has
 * chosen something from the browse grid, so its job is narrowing a visible list
 * rather than introducing the vocabulary — which is what a row of selects is
 * genuinely good at.
 *
 * Order of prominence: topic, skill, where you work, language, level. Language
 * keeps its visual lift because it is the filter no other board offers.
 */
export function Filters({
  locale,
  state,
  resultCount,
}: {
  locale: Locale
  state: FilterState
  resultCount: number
}) {
  const copy = t(locale)
  const router = useRouter()
  const params = useSearchParams()

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params?.toString() ?? '')
    if (value) next.set(key, value)
    else next.delete(key)

    // A sub-area belongs to exactly one cause, so the two can contradict each
    // other and produce a guaranteed-empty list. Keep them consistent here
    // rather than letting the reader discover it as "no results".
    if (key === 'subarea' && value) {
      const parent = SUB_AREA_CAUSE[value as keyof typeof SUB_AREA_CAUSE]
      if (parent) next.set('cause', parent)
    }
    if (key === 'cause') {
      const sub = next.get('subarea')
      if (sub && (!value || SUB_AREA_CAUSE[sub as keyof typeof SUB_AREA_CAUSE] !== value)) {
        next.delete('subarea')
      }
    }

    const query = next.toString()
    router.push(query ? `?${query}` : '?', { scroll: false })
  }

  const hasFilters = Boolean(
    state.cause ||
      state.subarea ||
      state.skill ||
      state.location ||
      state.language ||
      state.seniority,
  )

  /*
    Within a cause, offering all eighteen sub-areas would list fifteen that
    cannot match. Narrow to the chosen cause's own sub-areas; outside a cause,
    offer the lot.
  */
  const subAreaValues =
    state.cause && (CAUSE_AREAS as readonly string[]).includes(state.cause)
      ? SUB_AREAS_BY_CAUSE[state.cause as CauseArea]
      : SUB_AREAS

  const fields: {
    key: keyof FilterState
    label: string
    values: readonly string[]
    labels: Record<string, string>
    prominent?: boolean
  }[] = [
    {
      key: 'cause',
      label: copy.filterCause,
      values: CAUSE_AREAS,
      labels: copy.causeAreas,
    },
    {
      key: 'subarea',
      label: copy.filterSubArea,
      values: subAreaValues,
      labels: copy.subAreas,
    },
    {
      key: 'skill',
      label: copy.filterSkill,
      values: SKILLS,
      labels: copy.skills,
    },
    {
      key: 'location',
      label: copy.filterLocation,
      values: LOCATION_MODES,
      labels: copy.locationModes,
    },
    {
      key: 'language',
      label: copy.filterLanguage,
      values: LANGUAGE_REQUIREMENTS,
      labels: copy.languageRequirements,
      prominent: true,
    },
    {
      key: 'seniority',
      label: copy.filterSeniority,
      values: SENIORITIES,
      labels: copy.seniorities,
    },
  ]

  return (
    <div>
      <div className={u.filterBar}>
        {fields.map((f) => (
          <div
            key={f.key}
            className={`${u.filterField} ${f.prominent ? u.filterFieldProminent : ''}`}
          >
            <label className={u.filterLabel} htmlFor={`filter-${f.key}`}>
              {f.label}
            </label>
            <select
              id={`filter-${f.key}`}
              className={u.select}
              value={state[f.key] ?? ''}
              onChange={(e) => update(f.key, e.target.value)}
            >
              <option value="">{copy.filterAny}</option>
              {f.values.map((v) => (
                <option key={v} value={v}>
                  {f.labels[v] ?? v}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className={u.filterActions}>
        <span>
          {copy.resultCount(resultCount)}
          {hasFilters ? (
            <>
              {' · '}
              <button
                type="button"
                className={u.introDismiss}
                onClick={() => router.push('?', { scroll: false })}
              >
                {copy.clearFilters}
              </button>
            </>
          ) : null}
        </span>

        <span className={u.sortGroup}>
          <label className={u.filterLabel} htmlFor="filter-sort">
            {copy.sortLabel}
          </label>
          <select
            id="filter-sort"
            className={u.select}
            value={state.sort ?? 'recent'}
            onChange={(e) => update('sort', e.target.value === 'recent' ? '' : e.target.value)}
          >
            <option value="recent">{copy.sortRecent}</option>
            <option value="leverage">{copy.sortLeverage}</option>
          </select>
        </span>
      </div>
    </div>
  )
}

/**
 * The intro band. Since most visitors are first-timers this is the default state
 * rather than an overlay — part of the page, dismissible for people who have
 * seen it, with dismissal persisted in a cookie. Designed as something a
 * returning EA can skip past, not something a newcomer has to dismiss to reach
 * the content (§9.5).
 */
export function IntroBand({ locale }: { locale: Locale }) {
  const copy = t(locale)
  const r = routes(locale)
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    setDismissed(document.cookie.includes(`${INTRO_COOKIE}=1`))
  }, [])

  // Render on the server and on first paint: a newcomer must never see the page
  // flash the band away, and a returning reader loses only one frame of it.
  if (dismissed) return null

  return (
    <div className={u.introBand}>
      <h2 className={u.onwardHeading}>{copy.indexIntroHeading}</h2>
      <div className={u.introBody}>
        {copy.indexIntroBody.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>
      <div className={u.introFooter}>
        <Link href={r.method}>
          {copy.indexIntroMethodLink} <Icon name="arrow-right" />
        </Link>
        <button
          type="button"
          className={u.introDismiss}
          onClick={() => {
            // One year, path-scoped to the board so it cannot affect the rest
            // of the site after the merge.
            document.cookie = `${INTRO_COOKIE}=1; path=/; max-age=${365 * 864e2}; samesite=lax`
            setDismissed(true)
          }}
        >
          {copy.indexIntroDismiss}
        </button>
      </div>
    </div>
  )
}

/**
 * Empty state. This matters more here than on most products, because a filter
 * combination returning nothing is common on a board of 25–60 listings. Suggest
 * adjacent filters rather than showing a blank (§9.2).
 */
export function EmptyState({
  locale,
  state,
  suggestions,
}: {
  locale: Locale
  state: FilterState
  suggestions: { label: string; href: string }[]
}) {
  const copy = t(locale)
  return (
    <div className={u.empty}>
      <h2 className={u.emptyHeading}>{copy.emptyHeading}</h2>
      <p className={u.emptyBody}>{copy.emptyBody}</p>
      {/*
        The best moment on the whole board to ask for a tip: the reader looked
        for something specific and we did not have it, so they already know
        exactly what is missing.
      */}
      <p className={u.emptyBody}>
        <Link href={routes(locale).suggest}>{copy.suggestNavLabel}</Link>
      </p>
      {suggestions.length ? (
        <>
          <p className={u.emptyBody}>{copy.emptySuggestion}</p>
          <div className={u.emptySuggestions}>
            {suggestions.map((sug) => (
              <Link key={sug.href} href={sug.href} className={`${u.badge} ${u.badgeCause}`}>
                {sug.label}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
