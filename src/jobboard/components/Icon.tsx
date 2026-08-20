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
  | 'arrow-left'
  | 'chevron-down'
  | 'x'
  | 'info-circle'
  | 'filter'
  | 'scale'
  | 'book'
  | 'alert-triangle'
  | 'world'
  | 'leaf'
  | 'heartbeat'
  | 'pig'
  | 'alert-hexagon'
  | 'telescope'
  | 'users-group'
  | 'speakerphone'
  | 'chart-dots'
  | 'tool'
  | 'lock-square'
  | 'gavel'
  | 'sitemap'
  | 'settings'
  | 'building-bank'
  | 'microscope'
  | 'code'
  | 'search'
  | 'brand-linkedin'
  | 'brand-instagram'

const PATHS: Record<IconName, string> = {
  'brand-linkedin':
    'M8 11v5M8 8v.01M12 16v-5M16 16v-3a2 2 0 1 0 -4 0M3 7a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4l0 -10',
  'brand-instagram':
    'M4 8a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4l0 -8M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0M16.5 7.5v.01',
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
  'arrow-left': 'M5 12h14M5 12l6 6M5 12l6-6',
  'chevron-down': 'M6 9l6 6 6-6',
  x: 'M18 6L6 18M6 6l12 12',
  'info-circle': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 9h.01M11 12h1v4h1',
  filter: 'M4 4h16v2.172a2 2 0 0 1-.586 1.414L15 12v7l-6-2v-4.5L4.52 7.572A2 2 0 0 1 4 6.227z',
  scale: 'M7 20h10M12 3v17M6 6l6-1 6 1M3 10l3-4 3 4a3 3 0 0 1-6 0M15 10l3-4 3 4a3 3 0 0 1-6 0',
  book: 'M3 19a9 9 0 0 1 9 0 9 9 0 0 1 9 0M3 6a9 9 0 0 1 9 0 9 9 0 0 1 9 0M3 6v13M12 6v13M21 6v13',
  'alert-triangle':
    'M12 9v4M12 16v.01M10.24 3.957 1.98 18a2 2 0 0 0 1.7 3h16.64a2 2 0 0 0 1.7-3L13.76 3.957a2 2 0 0 0-3.52 0z',
  world:
    'M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18',
  leaf: 'M5 21c.5-4.5 2.5-8 7-10M9 18c6.218 0 10.5-3.288 11-12V4h-4.014c-9 0-11.986 4-12 9 0 1 0 3 2 5h3z',

  /* --- Browse-grid icons, added with the cause/skill grid (August 2026).
         Extracted verbatim from @tabler/icons 3.46.0 outline rather than
         redrawn, so they sit on the same 24x24 grid and 2px stroke as the
         rest and cannot drift from the set the main site uses. --- */
  heartbeat:
    'M19.5 13.572l-7.5 7.428l-2.896 -2.868m-6.117 -8.104a5 5 0 0 1 9.013 -3.022a5 5 0 1 1 7.5 6.572M3 13h2l2 3l2 -6l1 3h3',
  pig:
    'M15 11v.01M16 3l0 3.803a6.019 6.019 0 0 1 2.658 3.197h1.341a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-1.342a6.008 6.008 0 0 1 -1.658 2.473v2.027a1.5 1.5 0 0 1 -3 0v-.583a6.04 6.04 0 0 1 -1 .083h-4a6.04 6.04 0 0 1 -1 -.083v.583a1.5 1.5 0 0 1 -3 0v-2l0 -.027a6 6 0 0 1 4 -10.473h2.5l4.5 -3',
  'alert-hexagon':
    'M19.875 6.27c.7 .398 1.13 1.143 1.125 1.948v7.284c0 .809 -.443 1.555 -1.158 1.948l-6.75 4.27a2.269 2.269 0 0 1 -2.184 0l-6.75 -4.27a2.225 2.225 0 0 1 -1.158 -1.948v-7.285c0 -.809 .443 -1.554 1.158 -1.947l6.75 -3.98a2.33 2.33 0 0 1 2.25 0l6.75 3.98h-.033M12 8v4M12 16h.01',
  telescope:
    'M6 21l6 -5l6 5M12 13v8M3.294 13.678l.166 .281c.52 .88 1.624 1.265 2.605 .91l14.242 -5.165a1.023 1.023 0 0 0 .565 -1.456l-2.62 -4.705a1.087 1.087 0 0 0 -1.447 -.42l-.056 .032l-12.694 7.618c-1.02 .613 -1.357 1.897 -.76 2.905l-.001 0M14 5l3 5.5',
  'users-group':
    'M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0M17 10h2a2 2 0 0 1 2 2v1M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0M3 13v-1a2 2 0 0 1 2 -2h2',
  speakerphone:
    'M18 8a3 3 0 0 1 0 6M10 8v11a1 1 0 0 1 -1 1h-1a1 1 0 0 1 -1 -1v-5M12 8l4.524 -3.77a.9 .9 0 0 1 1.476 .692v12.156a.9 .9 0 0 1 -1.476 .692l-4.524 -3.77h-8a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h8',
  'chart-dots':
    'M3 3v18h18M7 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 7a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M12 15a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M10.16 10.62l2.34 2.88M15.088 13.328l2.837 -4.586',
  tool:
    'M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5',
  'lock-square':
    'M8 12a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1l0 -3M10 11v-2a2 2 0 1 1 4 0v2M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12',
  gavel:
    'M13 10l7.383 7.418c.823 .82 .823 2.148 0 2.967a2.11 2.11 0 0 1 -2.976 0l-7.407 -7.385M6 9l4 4M13 10l-4 -4M3 21h7M6.793 15.793l-3.586 -3.586a1 1 0 0 1 0 -1.414l2.293 -2.293l.5 .5l3 -3l-.5 -.5l2.293 -2.293a1 1 0 0 1 1.414 0l3.586 3.586a1 1 0 0 1 0 1.414l-2.293 2.293l-.5 -.5l-3 3l.5 .5l-2.293 2.293a1 1 0 0 1 -1.414 0',
  sitemap:
    'M3 17a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2l0 -2M15 17a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2l0 -2M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2l0 -2M6 15v-1a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v1M12 9l0 3',
  settings:
    'M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0',
  'building-bank':
    'M3 21l18 0M3 10l18 0M5 6l7 -3l7 3M4 10l0 11M20 10l0 11M8 14l0 3M12 14l0 3M16 14l0 3',
  microscope:
    'M5 21h14M6 18h2M7 18v3M9 11l3 3l6 -6l-3 -3l-6 6M10.5 12.5l-1.5 1.5M17 3l3 3M12 21a6 6 0 0 0 3.715 -10.712',
  code:
    'M7 8l-4 4l4 4M17 8l4 4l-4 4M14 4l-4 16',
  search:
    'M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0M21 21l-6 -6',
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
