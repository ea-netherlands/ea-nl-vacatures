/**
 * Tabler outline icons, inlined.
 *
 * The design system mandates Tabler outline icons drawn in `currentColor`, and
 * forbids emoji anywhere. That second rule is why this module exists rather
 * than the emoji the spec sketches for the Studio review queue (§6.5) — the
 * queue reads as part of the brand to the curator who lives in it daily, so it
 * gets real icons.
 *
 * Inlined rather than pulled from a package so the same components serve the
 * public pages and the Studio without a runtime dependency, and so no icon
 * font has to load before first paint.
 *
 * Paths are Tabler Icons (MIT), 24×24 grid, 2px stroke, rounded caps.
 */

import type { SVGProps } from 'react'

export type IconName =
  | 'hourglass'
  | 'circle-check'
  | 'clock-exclamation'
  | 'archive'
  | 'building'
  | 'external-link'
  | 'map-pin'
  | 'language'
  | 'shield-lock'
  | 'stairs'
  | 'coin'
  | 'calendar'
  | 'arrow-right'
  | 'chevron-down'
  | 'x'
  | 'info-circle'
  | 'filter'
  | 'scale'
  | 'book'
  | 'alert-triangle'

const PATHS: Record<IconName, string> = {
  hourglass:
    'M6.5 7h11M6.5 17h11M6 20v-2a6 6 0 1 1 12 0v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zM6 4v2a6 6 0 1 0 12 0V4a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z',
  'circle-check': 'M9 12l2 2 4-4M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  'clock-exclamation':
    'M12 21a9 9 0 1 1 8.94-8M12 7v5l2 2M19 16v3M19 22v.01',
  archive:
    'M3 4m0 2a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4',
  building:
    'M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16',
  'external-link':
    'M12 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6M11 13l9-9M15 4h5v5',
  'map-pin': 'M9 11a3 3 0 1 0 6 0 3 3 0 0 0-6 0zM17.657 16.657L13.414 20.9a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z',
  language:
    'M4 5h7M9 3v2c0 4.418-2.239 8-5 8M5 9c0 2.144 2.952 3.908 6.7 4M12 20l4-9 4 9M19.1 18h-6.2',
  'shield-lock':
    'M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21 12 12 0 0 1 3.5 6 12 12 0 0 0 12 3M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2M12 13v1.5',
  stairs: 'M4 20h4v-4h4v-4h4V8h4',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M14.8 9a2 2 0 0 0-1.8-1h-2a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4h-2a2 2 0 0 1-1.8-1M12 6v2M12 16v2',
  calendar:
    'M4 5m0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM16 3v4M8 3v4M4 11h16M11 15h1M12 15v3',
  'arrow-right': 'M5 12h14M13 18l6-6-6-6',
  'chevron-down': 'M6 9l6 6 6-6',
  x: 'M18 6L6 18M6 6l12 12',
  'info-circle': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 9h.01M11 12h1v4h1',
  filter: 'M4 4h16v2.172a2 2 0 0 1-.586 1.414L15 12v7l-6-2v-4.5L4.52 7.572A2 2 0 0 1 4 6.227z',
  scale: 'M7 20h10M12 3v17M6 6l6-1 6 1M3 10l3-4 3 4a3 3 0 0 1-6 0M15 10l3-4 3 4a3 3 0 0 1-6 0',
  book: 'M3 19a9 9 0 0 1 9 0 9 9 0 0 1 9 0M3 6a9 9 0 0 1 9 0 9 9 0 0 1 9 0M3 6v13M12 6v13M21 6v13',
  'alert-triangle':
    'M12 9v4M12 16v.01M10.24 3.957 1.98 18a2 2 0 0 0 1.7 3h16.64a2 2 0 0 0 1.7-3L13.76 3.957a2 2 0 0 0-3.52 0z',
}

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: IconName
  /** Rendered size in px. Defaults to 1em so it scales with the text. */
  size?: number | string
  label?: string
}

export function Icon({ name, size = '1em', label, ...rest }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

/** Factory for Sanity Studio, which wants a zero-argument component as `icon`. */
export function icon(name: IconName) {
  const Bound = () => <Icon name={name} />
  Bound.displayName = `Icon(${name})`
  return Bound
}
