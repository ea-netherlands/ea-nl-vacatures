/**
 * The review queue — spec §6.5.
 *
 * Built as a Structure Builder view, not as a separate app. Sanity already has
 * draft/publish workflow, custom views, custom input components and role-based
 * access; building a bespoke admin panel for the review queue would be the
 * single largest chunk of unnecessary work in this project.
 *
 * The curator's experience is a first-class design concern, not an afterthought
 * (§4). If the queue is unpleasant it will not get cleared, and the board dies
 * quietly.
 */

import type { StructureResolver } from 'sanity/structure'
import { icon } from '../components/Icon'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Job board')
    .items([
      // Drafts, ordered by score descending — the highest-scoring listing a
      // curator has not yet looked at is the first thing they see.
      S.listItem()
        .title('Review')
        .icon(icon('hourglass'))
        .child(
          S.documentList()
            .title('Awaiting review')
            .apiVersion('2024-10-01')
            .filter('_type == "jobListing" && _id in path("drafts.**")')
            .defaultOrdering([{ field: 'llmScore', direction: 'desc' }])
            .menuItemGroups([{ id: 'sort', title: 'Sort' }]),
        ),

      S.listItem()
        .title('Live')
        .icon(icon('circle-check'))
        .child(
          S.documentList()
            .title('Live on the board')
            .apiVersion('2024-10-01')
            .filter(
              '_type == "jobListing" && !(_id in path("drafts.**")) && (!defined(expiresAt) || expiresAt > now())',
            )
            .defaultOrdering([{ field: 'postedAt', direction: 'desc' }]),
        ),

      // The view that keeps the board from rotting: a curator can extend
      // anything still live before it auto-unpublishes (§7.8).
      S.listItem()
        .title('Expiring this week')
        .icon(icon('clock-exclamation'))
        .child(
          S.documentList()
            .title('Expiring within seven days')
            .apiVersion('2024-10-01')
            .filter(
              '_type == "jobListing" && !(_id in path("drafts.**")) && defined(expiresAt) && expiresAt > now() && expiresAt < $weekOut',
            )
            .params({ weekOut: new Date(Date.now() + 7 * 864e5).toISOString() })
            .defaultOrdering([{ field: 'expiresAt', direction: 'asc' }]),
        ),

      S.listItem()
        .title('Archive')
        .icon(icon('archive'))
        .child(
          S.documentList()
            .title('Expired or closed')
            .apiVersion('2024-10-01')
            .filter(
              '_type == "jobListing" && !(_id in path("drafts.**")) && defined(expiresAt) && expiresAt <= now()',
            )
            .defaultOrdering([{ field: 'expiresAt', direction: 'desc' }]),
        ),

      S.divider(),

      S.listItem()
        .title('Organisations')
        .icon(icon('building'))
        .child(
          S.documentTypeList('employer')
            .title('Organisations')
            .defaultOrdering([{ field: 'name', direction: 'asc' }]),
        ),

      S.listItem()
        .title('Explainer pages')
        .icon(icon('book'))
        .child(
          S.list()
            .title('Explainer pages')
            .items([
              S.listItem()
                .title('Dutch (source)')
                .child(
                  S.documentList()
                    .title('Dutch explainer pages')
                    .apiVersion('2024-10-01')
                    .filter('_type == "explainerPage" && language == "nl"'),
                ),
              S.listItem()
                .title('English (translation)')
                .child(
                  S.documentList()
                    .title('English explainer pages')
                    .apiVersion('2024-10-01')
                    .filter('_type == "explainerPage" && language == "en"'),
                ),
            ]),
        ),
    ])

/**
 * Default document node: the review queue's custom preview does the triage, so
 * opening a document should land on the form with the editorial group first.
 */
export const defaultDocumentNode: import('sanity/structure').DefaultDocumentNodeResolver = (
  S,
  { schemaType },
) => {
  if (schemaType === 'jobListing') {
    return S.document().views([S.view.form().title('Job listing')])
  }
  return S.document().views([S.view.form()])
}
