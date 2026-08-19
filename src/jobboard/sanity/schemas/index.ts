import type { SchemaTypeDefinition } from 'sanity'
import { employer } from './employer'
import { explainerPage } from './explainerPage'
import { jobListing } from './jobListing'
import { suggestion } from './suggestion'

/**
 * Four document types (spec §6.4, plus `suggestion` from August 2026).
 * Deliberately no raw-listing type: writing thousands of ingested listings into
 * Sanity would pollute the content lake, burn document quota and API requests,
 * and make Studio unusable for the humans who use it for the rest of the
 * website.
 *
 * `suggestion` is the exception that proves the rule — it is low-volume,
 * human-written and needs a human decision, which is exactly what Sanity is for.
 */
export const schemaTypes: SchemaTypeDefinition[] = [
  jobListing,
  employer,
  explainerPage,
  suggestion,
]

export { jobListing, employer, explainerPage, suggestion }
