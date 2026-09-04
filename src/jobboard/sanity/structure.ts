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

/*
  Drafts are matched on `_originalId`, never on `_id`.

  Studio 6 runs its document lists under the `drafts` perspective, which folds
  each draft over its published version and normalises the id — the `drafts.`
  prefix is gone by the time a filter sees it. So `_id in path("drafts.**")`
  matches nothing in the Studio while matching correctly in a raw API query,
  which is exactly how the review queue came to read "No documents of this
  type" over twelve waiting listings.

  `_originalId` keeps the prefix under that perspective, so it is the field
  that actually answers "is this a draft". The inverse matters just as much:
  negating the `_id` form is always true under this perspective, so every list
  below was silently including drafts — the Live list was showing unreviewed
  draft content under the heading "Live on the board".
*/
const IS_DRAFT = '_originalId in path("drafts.**")'
const IS_PUBLISHED = `!(${IS_DRAFT})`

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Job board')
    .items([
      /*
        Drafts, ordered by score descending — the highest-scoring listing a
        curator has not yet looked at is the first thing they see.

        Expired drafts are excluded. Reviewing one is wasted work twice over:
        the vacancy has closed, and publishing it produces a page no reader can
        reach, because every public query filters on the same date. That used to
        happen regularly — the fallback expiry ran from the employer's posting
        date rather than from when we first saw the listing, so ATS roles with
        months-old posting dates arrived pre-expired. Fixed in `promote.ts`, but
        the queue should not surface them even if it recurs.

        They are not deleted, just moved out of the way — see "Expired drafts"
        below, which is where to look if something has vanished from Review
        unexpectedly.
      */
      S.listItem()
        .title('Review')
        .icon(icon('hourglass'))
        .child(
          S.documentList()
            .title('Awaiting review')
            .apiVersion('2024-10-01')
            .filter(
              `_type == "jobListing" && ${IS_DRAFT} && (!defined(expiresAt) || expiresAt > now())`,
            )
            .defaultOrdering([{ field: 'llmScore', direction: 'desc' }])
            .menuItemGroups([{ id: 'sort', title: 'Sort' }]),
        ),

      // The ones Review now hides, so nothing disappears without a place to
      // find it. Extend the date here and the listing returns to the queue.
      S.listItem()
        .title('Expired drafts')
        .icon(icon('clock-exclamation'))
        .child(
          S.documentList()
            .title('Drafts whose closing date has passed')
            .apiVersion('2024-10-01')
            .filter(
              `_type == "jobListing" && ${IS_DRAFT} && defined(expiresAt) && expiresAt <= now()`,
            )
            .defaultOrdering([{ field: 'expiresAt', direction: 'desc' }]),
        ),

      S.listItem()
        .title('Live')
        .icon(icon('circle-check'))
        .child(
          S.documentList()
            .title('Live on the board')
            .apiVersion('2024-10-01')
            .filter(
              `_type == "jobListing" && ${IS_PUBLISHED} && (!defined(expiresAt) || expiresAt > now())`,
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
              `_type == "jobListing" && ${IS_PUBLISHED} && defined(expiresAt) && expiresAt > now() && expiresAt < $weekOut`,
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
              `_type == "jobListing" && ${IS_PUBLISHED} && defined(expiresAt) && expiresAt <= now()`,
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

      /*
        Suggestions sit near the top with the review queue rather than filed
        under settings: they are the same job — someone else's judgement
        arriving for yours — and a tip that sits unread for a month is a
        vacancy that closed.
      */
      S.listItem()
        .title('Suggestions')
        .icon(icon('info-circle'))
        .child(
          S.list()
            .title('Suggestions')
            .items([
              S.listItem()
                .title('New')
                .child(
                  S.documentList()
                    .title('Awaiting triage')
                    .apiVersion('2024-10-01')
                    .filter('_type == "suggestion" && status == "new"')
                    .defaultOrdering([{ field: 'submittedAt', direction: 'desc' }]),
                ),
              S.listItem()
                .title('All suggestions')
                .child(
                  S.documentList()
                    .title('All suggestions')
                    .apiVersion('2024-10-01')
                    .filter('_type == "suggestion"')
                    .defaultOrdering([{ field: 'submittedAt', direction: 'desc' }]),
                ),
            ]),
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
