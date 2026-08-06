/**
 * Sitemap covering listings, employer pages and explainer pages (§9.8).
 *
 * Priorities reflect what actually earns the traffic: the durable asset is the
 * explainer and employer pages, not the listings. Listings expire in weeks and
 * take their rankings with them; a cause explainer accrues authority for years.
 */

import type { MetadataRoute } from 'next'
import { CAUSE_AREAS } from '@jobboard/taxonomy'
import { ROUTES } from '@jobboard/content/i18n'
import { absolute } from '@jobboard/lib/seo'
import { getAllListingSlugs, getEmployersWithRoles } from '@jobboard/sanity/queries'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, employers] = await Promise.all([getAllListingSlugs(), getEmployersWithRoles()])
  const now = new Date()

  /** Emits the NL/EN pair with the Dutch URL as the canonical entry. */
  const pair = (
    nlPath: string,
    enPath: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  ): MetadataRoute.Sitemap => [
    {
      url: absolute(nlPath),
      lastModified: now,
      changeFrequency,
      priority,
      alternates: { languages: { nl: absolute(nlPath), en: absolute(enPath) } },
    },
  ]

  return [
    ...pair(ROUTES.nl.index, ROUTES.en.index, 0.7, 'daily'),

    // The explanatory layer: highest priority, because it is the board's best
    // long-term SEO asset and the reason the primary user stays.
    ...pair(ROUTES.nl.method, ROUTES.en.method, 1.0, 'monthly'),
    ...pair(ROUTES.nl.causes, ROUTES.en.causes, 0.9, 'weekly'),
    ...pair(ROUTES.nl.earningToGive, ROUTES.en.earningToGive, 0.9, 'weekly'),
    ...CAUSE_AREAS.flatMap((cause) =>
      pair(ROUTES.nl.cause(cause), ROUTES.en.cause(cause), 0.9, 'monthly'),
    ),

    // Employer pages have the same durable property in miniature.
    ...pair(ROUTES.nl.employers, ROUTES.en.employers, 0.8, 'weekly'),
    ...employers.flatMap((e) =>
      pair(ROUTES.nl.employer(e.slug), ROUTES.en.employer(e.slug), 0.8, 'weekly'),
    ),

    // Listings last: they turn over fastest and rank for the shortest time.
    ...slugs
      .filter((s) => !s.expiresAt || new Date(s.expiresAt) > now)
      .flatMap((s) => pair(ROUTES.nl.detail(s.slug), ROUTES.en.detail(s.slug), 0.6, 'weekly')),
  ]
}
