import type { ReactNode } from 'react'

/**
 * The Studio renders its own full-page shell and must not inherit the board's
 * chrome or theme.
 */
export const metadata = {
  title: 'Job board — editorial',
  robots: { index: false, follow: false },
}

export default function StudioLayout({ children }: { children: ReactNode }) {
  return children
}
