import type { ReactNode } from 'react'
import { Shell } from '@jobboard/components/Chrome'
import { ROUTES } from '@jobboard/content/i18n'

export default function VacaturesLayout({ children }: { children: ReactNode }) {
  return (
    <Shell locale="nl" switchHref={ROUTES.en.index}>
      {children}
    </Shell>
  )
}
