import type { ReactNode } from 'react'
import { Shell } from '@jobboard/components/Chrome'
import { ROUTES } from '@jobboard/content/i18n'

export default function JobsLayout({ children }: { children: ReactNode }) {
  return (
    <Shell locale="en" switchHref={ROUTES.nl.index}>
      {children}
    </Shell>
  )
}
