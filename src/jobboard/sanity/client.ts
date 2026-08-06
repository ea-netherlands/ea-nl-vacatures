/**
 * Sanity clients — spec §6.2a.
 *
 * A separate Sanity project for the job board: free, owned by EA NL from the
 * first commit, and it keeps thousands of job documents out of the dataset the
 * team uses for the rest of the site — which §6.2 argues for on its own merits.
 *
 * There is a real chance this never needs merging. The board can keep its own
 * Sanity project indefinitely while the front end lives inside the main site;
 * two Sanity clients in one Next.js app is unremarkable.
 */

import { createClient, type SanityClient } from 'next-sanity'

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? ''
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2024-10-01'

export const isSanityConfigured = Boolean(projectId)

/** Read-only client for the public pages. CDN-cached, no token. */
export function readClient(): SanityClient {
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: true,
    perspective: 'published',
  })
}

/**
 * Write client for the promotion job and the expiry automation. Needs a token
 * with Editor rights — the pipeline creates drafts, never published documents,
 * because nothing is auto-published in v1 (§8.3).
 */
export function writeClient(): SanityClient {
  const token = process.env.SANITY_API_WRITE_TOKEN
  if (!token) {
    throw new Error(
      'SANITY_API_WRITE_TOKEN is not set. The promotion job needs a token with Editor rights.',
    )
  }
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token,
    perspective: 'raw',
  })
}
