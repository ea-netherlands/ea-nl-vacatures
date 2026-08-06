/**
 * SEO helpers — spec §9.1, §9.8.
 *
 * Search is the primary acquisition channel, not a secondary one, so this
 * carries more weight than its position suggests.
 *
 * Dutch is the default locale and the canonical URL for every page; English
 * lives under /en. hreflang pairs are emitted across every NL/EN pair.
 */

import type { Metadata } from 'next'
import { DEFAULT_LOCALE, type Locale } from '../content/i18n'
import type { ListingView } from '../sanity/queries'

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vacatures.effectiefaltruisme.nl'
).replace(/\/$/, '')

export function absolute(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Builds metadata with the hreflang pair. The Dutch URL is always the canonical
 * one, including on the English page — Dutch is the source language and the one
 * search engines should index primarily (§9.5).
 */
export function bilingualMetadata(args: {
  locale: Locale
  nlPath: string
  enPath: string
  title: string
  description?: string
  noIndex?: boolean
}): Metadata {
  const selfPath = args.locale === 'nl' ? args.nlPath : args.enPath
  return {
    title: args.title,
    description: args.description,
    alternates: {
      canonical: absolute(selfPath),
      languages: {
        'nl-NL': absolute(args.nlPath),
        'en-GB': absolute(args.enPath),
        // x-default points at the Dutch page: it is the base language.
        'x-default': absolute(args.nlPath),
      },
    },
    openGraph: {
      title: args.title,
      description: args.description,
      url: absolute(selfPath),
      locale: args.locale === 'nl' ? 'nl_NL' : 'en_GB',
      siteName: 'Effectief Altruïsme Nederland',
      type: 'website',
    },
    robots: args.noIndex ? { index: false, follow: true } : undefined,
  }
}

/**
 * schema.org/JobPosting JSON-LD (§9.8).
 *
 * Google's job posting guidelines can be strict about structured data on
 * aggregator pages that link out, and require `directApply` handling. We set
 * `directApply: false` because applying always happens on the employer's own
 * site — claiming otherwise on a link-out board is exactly the misrepresentation
 * the guideline exists to prevent.
 *
 * Check the current guidance before launch; this is the shape as of writing.
 */
export function jobPostingJsonLd(listing: ListingView, locale: Locale, url: string) {
  const note = locale === 'en' ? (listing.whyThisMattersEn ?? listing.whyThisMattersNl) : listing.whyThisMattersNl
  const description = [listing.excerpt, note].filter(Boolean).join('\n\n')

  const remote = listing.locationMode === 'remote-nl' || listing.locationMode === 'remote-eu'

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: listing.title,
    description,
    url,
    datePosted: listing.postedAt ?? undefined,
    validThrough: listing.deadlineAt ?? listing.expiresAt ?? undefined,
    // Applying happens on the employer's own site, never here.
    directApply: false,
    employmentType: listing.seniority === 'internship' ? 'INTERN' : 'FULL_TIME',
    hiringOrganization: listing.employer
      ? {
          '@type': 'Organization',
          name: listing.employer.name,
          sameAs: listing.employer.website ?? undefined,
        }
      : undefined,
    jobLocationType: remote ? 'TELECOMMUTE' : undefined,
    applicantLocationRequirements: remote
      ? {
          '@type': 'Country',
          name: listing.locationMode === 'remote-eu' ? 'Europe' : 'Netherlands',
        }
      : undefined,
    jobLocation: remote
      ? undefined
      : {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: listing.locationCity ?? listing.employer?.city ?? undefined,
            addressCountry: 'NL',
          },
        },
    inLanguage: listing.languageRequirement === 'dutch-required' ? 'nl' : undefined,
  }
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  }
}

/** Renders a JSON-LD script tag. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is inserted verbatim; escape the sequence that
      // could otherwise close the script element early.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}

export { DEFAULT_LOCALE }
