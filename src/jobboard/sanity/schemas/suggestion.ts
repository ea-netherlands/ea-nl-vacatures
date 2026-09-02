/**
 * `suggestion` — a reader telling us something.

 * Widened in September 2026 from employer-or-vacancy tips to six kinds of
 * feedback, when the board went to the Dutch community in beta. The type name
 * is unchanged so existing documents, the review queue and the API path all
 * keep working; what changed is that `url` and `organisation` are no longer
 * required, because a correction or a note about the site has neither.
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
import { FEEDBACK_KINDS } from '../../content/i18n'

/**
 * The kinds a reader can pick, titled for the curator triaging them.
 *
 * Derived from `FEEDBACK_KINDS` rather than restated so the Studio cannot end
 * up offering a set the form does not, and ordered the same way: the two that
 * point at something specific first, the catch-all last.
 */
const KIND_TITLES: Record<(typeof FEEDBACK_KINDS)[number], string> = {
  listing: 'A specific vacancy',
  employer: 'An organisation to watch',
  correction: 'Something on the board is wrong',
  gap: 'The board is missing something',
  site: 'About the site itself',
  other: 'Something else',
}

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
      title: 'What this is about',
      type: 'string',
      options: {
        list: FEEDBACK_KINDS.map((value) => ({ value, title: KIND_TITLES[value] })),
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'url',
      title: 'Link',
      type: 'url',
      description:
        'The vacancy, or the organisation’s careers page. Required by the form for those two kinds, because there the link is the suggestion. Empty on a correction or a general note, where the message carries everything.',
    }),
    defineField({
      name: 'organisation',
      title: 'Organisation',
      type: 'string',
      validation: (r) => r.max(120),
    }),
    defineField({
      name: 'why',
      title: 'What they said',
      type: 'text',
      rows: 6,
      description:
        'The submitter’s own words, and on everything except a vacancy or organisation tip this is the whole submission. Worth reading before judging the link: someone who works in the field often knows the leverage in a role that reads as ordinary from outside.',
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
      why: 'why',
      kind: 'kind',
      status: 'status',
      submittedAt: 'submittedAt',
    },
    // Falls back to the message, because four of the six kinds carry no
    // organisation — a queue of rows all reading "Untitled suggestion" would
    // have to be opened one at a time to be triaged at all.
    prepare({ organisation, why, kind, status, submittedAt }) {
      const when = submittedAt ? new Date(submittedAt).toISOString().slice(0, 10) : ''
      const summary = typeof why === 'string' && why.trim() ? why.trim().slice(0, 60) : null
      return {
        title: organisation || summary || 'Untitled',
        subtitle: [kind, status, when].filter(Boolean).join(' · '),
      }
    },
  },
})
