/**
 * Portable Text rendering for the explainer pages, plus the shared uncertainty
 * block and callouts.
 */

import { PortableText, type PortableTextComponents } from '@portabletext/react'
import type { ReactNode } from 'react'
import { t, type Locale } from '../content/i18n'
import { Icon } from './Icon'
import u from './ui.module.css'

const components: PortableTextComponents = {
  marks: {
    link: ({ value, children }) => {
      const href = (value?.href as string) ?? '#'
      const external = /^https?:/.test(href) && !href.includes('effectiefaltruisme.nl')
      return (
        <a href={href} rel={external ? 'noopener' : undefined}>
          {children}
        </a>
      )
    },
  },
}

export function RichText({ value }: { value: unknown[] | null | undefined }) {
  if (!value?.length) return null
  return (
    <div className={u.richText}>
      <PortableText value={value as never} components={components} />
    </div>
  )
}

/**
 * "What we're not sure about". Not decoration: the credibility of a curated
 * board rests on the reader believing the curator is being straight with them,
 * and a page that only argues one side achieves the opposite of what it is for
 * (§9.5).
 */
export function Uncertainties({
  locale,
  text,
  heading,
}: {
  locale: Locale
  text: string | null | undefined
  heading?: string
}) {
  if (!text?.trim()) return null
  const copy = t(locale)
  return (
    <aside className={u.uncertainty}>
      <h2 className={u.uncertaintyHeading}>
        <Icon name="scale" />
        {heading ?? copy.causeUncertainHeading}
      </h2>
      <p className={u.uncertaintyBody}>{text.trim()}</p>
    </aside>
  )
}

export function Callout({
  tone = 'info',
  icon = 'info-circle',
  children,
}: {
  tone?: 'info' | 'warning'
  icon?: 'info-circle' | 'alert-triangle' | 'coin'
  children: ReactNode
}) {
  return (
    <div className={`${u.callout} ${tone === 'warning' ? u.calloutWarning : u.calloutInfo}`}>
      <span className={u.calloutIcon}>
        <Icon name={icon} />
      </span>
      <div>{children}</div>
    </div>
  )
}

/**
 * Where a page's substance came from.
 *
 * Placed above the body rather than in a footer, because it is doing two jobs
 * and only one of them is credit. The other is routing: 80,000 Hours, Probably
 * Good and Forethought have written far more on these problems than a
 * 500-word page ever will, and a reader who wants the real thing should be
 * able to leave for it in one click before reading ours. That is the same
 * argument the index makes about job boards, applied to prose.
 *
 * The wording is deliberately "based on" and never "in partnership with". None
 * of these organisations has reviewed this board, and a credit that implied
 * otherwise would be the one thing worse than no credit at all.
 */
export function SourceAttribution({
  sources,
  locale,
}: {
  sources: { org: string; title: string; url: string }[]
  locale: 'nl' | 'en'
}) {
  if (!sources.length) return null

  // Several sources often share an organisation; naming it twice in one
  // sentence reads as a mistake.
  const orgs = [...new Set(sources.map((s) => s.org))]
  const list =
    orgs.length === 1
      ? orgs[0]
      : `${orgs.slice(0, -1).join(', ')} ${locale === 'nl' ? 'en' : 'and'} ${orgs.at(-1)}`

  return (
    <aside className={u.sourceNote}>
      <p className={u.sourceNoteLead}>
        <Icon name="book" />
        <span>
          {locale === 'nl'
            ? `Deze pagina is een korte samenvatting van het werk van ${list}. Zij hebben er veel meer over geschreven dan hier past — lees vooral het origineel.`
            : `This page is a short summary of work by ${list}. They have written far more about it than fits here — read the original.`}
        </span>
      </p>
      <ul className={u.sourceNoteList}>
        {sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} rel="noopener nofollow">
              {s.org}: {s.title}
              <Icon name="external-link" />
            </a>
          </li>
        ))}
      </ul>
    </aside>
  )
}
