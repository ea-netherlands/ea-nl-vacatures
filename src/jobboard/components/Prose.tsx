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
