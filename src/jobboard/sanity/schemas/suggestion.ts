/**
 * `suggestion` — a reader telling us about an employer or a vacancy.
 *
 * ## Why this exists
 *
 * The August 2026 sweep probed thirty-one Dutch organisations against the five
 * cause areas and found exactly one publishing a job feed the pipeline can
 * read. That is the shape of the problem: Dutch mission-driven employers post
 * vacancies as ordinary web pages, often for two weeks, often without so much
 * as JobPosting markup. No amount of adapter work fixes an employer we have
 * never heard of, and the watchlist is the asset.
 *
 * People who work in these fields already know which ministry is recruiting and
 * which foundation is hiring a programme officer. This is the cheapest possible
 * way to let them tell us, and the highest-leverage feature on the board for
 * the same reason the watchlist is: it grows coverage rather than polish.
 *
 * ## What it is not
 *
 * Not a publishing route. A suggestion is a lead for a curator, never a
 * listing — it lands in the Studio's review queue with `status: 'new'` and
 * someone decides. The board's whole value is that a person vouched for every
 * entry, and a form that could put text in front of readers unreviewed would
 * quietly end that, whether through spam or through an employer promoting
 * themselves.
 */

import { defineField, defineType } from 'sanity'

export const SUGGESTION_STATUSES = [
  { value: 'new', title: 'New — nobody has looked yet' },
  { value: 'accepted', title: 'Accepted — added to the watchlist or the board' },
  { value: 'rejected', title: 'Rejected — out of scope' },
  { value: 'duplicate', title: 'Duplicate — already known' },
  { value: 'spam', title: 'Spam' },
] as const

export const suggestion = defineType({
  name: 'suggestion',
  title: 'Suggestion',
  type: 'document',
  // Readers create these through the API, not in the Studio. A curator triages
  // rather than authors, so nothing here needs a create button.
  __experimental_omnisearch_visibility: false,
  fields: [
    defineField({
      name: 'kind',
      title: 'What is being suggested',
      type: 'string',
      options: {
        list: [
          { value: 'employer', title: 'An organisation to watch' },
          { value: 'listing', title: 'A specific vacancy' },
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'url',
      title: 'Link',
      type: 'url',
      description:
        'The vacancy, or the organisation’s careers page. This is the field that makes a suggestion actionable — everything else is context.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'organisation',
      title: 'Organisation',
      type: 'string',
      validation: (r) => r.required().max(120),
    }),
    defineField({
      name: 'why',
      title: 'Why it belongs',
      type: 'text',
      rows: 4,
      description:
        'The submitter’s own words. Worth reading before judging the link: someone who works in the field often knows the leverage in a role that reads as ordinary from outside.',
      validation: (r) => r.max(2000),
    }),
    defineField({
      name: 'submitterEmail',
      title: 'Email (optional)',
      type: 'string',
      description:
        'Given voluntarily so we can ask a follow-up question. Personal data: do not use it for anything else, and delete the document once the suggestion is resolved and the conversation is over.',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: { list: [...SUGGESTION_STATUSES] },
      initialValue: 'new',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'curatorNote',
      title: 'Note',
      type: 'text',
      rows: 2,
      description:
        'Why it was accepted or rejected. Rejections are worth a line — the same organisation gets suggested more than once.',
    }),
    defineField({
      name: 'submittedAt',
      title: 'Submitted',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  orderings: [
    {
      name: 'newestFirst',
      title: 'Newest first',
      by: [{ field: 'submittedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      organisation: 'organisation',
      kind: 'kind',
      status: 'status',
      submittedAt: 'submittedAt',
    },
    prepare({ organisation, kind, status, submittedAt }) {
      const when = submittedAt ? new Date(submittedAt).toISOString().slice(0, 10) : ''
      return {
        title: organisation || 'Untitled suggestion',
        subtitle: [kind, status, when].filter(Boolean).join(' · '),
      }
    },
  },
})
