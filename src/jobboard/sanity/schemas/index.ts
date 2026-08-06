import type { SchemaTypeDefinition } from 'sanity'
import { employer } from './employer'
import { explainerPage } from './explainerPage'
import { jobListing } from './jobListing'

/**
 * Three document types (spec §6.4). Deliberately no raw-listing type: writing
 * thousands of ingested listings into Sanity would pollute the content lake,
 * burn document quota and API requests, and make Studio unusable for the humans
 * who use it for the rest of the website.
 */
export const schemaTypes: SchemaTypeDefinition[] = [jobListing, employer, explainerPage]

export { jobListing, employer, explainerPage }
