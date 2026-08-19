/**
 * `explainerPage` — the Dutch-first explanatory layer (spec §6.4, §9.5).
 *
 * Document-level internationalisation rather than field-level: a `language`
 * field plus a reference linking each Dutch document to its English
 * counterpart. There will only ever be a dozen or so of these, they are
 * long-form prose, and document-level keeps the Studio editing experience sane
 * for whoever writes them.
 *
 * Dutch is the base language, so the English version is created as a
 * translation of it rather than the other way round.
 */

import { defineField, defineType } from 'sanity'
import { causeAreaOptions } from '../../taxonomy'

export const EXPLAINER_KINDS = [
  { value: 'method', title: 'Method page — why these jobs' },
  { value: 'cause', title: 'Cause area' },
  { value: 'earning-to-give', title: 'Earning to give' },
] as const

export const explainerPage = defineType({
  name: 'explainerPage',
  title: 'Explainer page',
  type: 'document',
  fields: [
    defineField({
      name: 'language',
      title: 'Language',
      type: 'string',
      readOnly: true,
      hidden: true,
      description: 'Managed by the document-internationalization plugin. Dutch is the base language.',
    }),
    defineField({
      name: 'kind',
      title: 'Page type',
      type: 'string',
      options: { list: [...EXPLAINER_KINDS] },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'causeArea',
      title: 'Which cause area this page belongs to',
      type: 'string',
      options: { list: causeAreaOptions() },
      hidden: ({ document }) => document?.kind !== 'cause',
      description: 'Links the page to each cause label on the board.',
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL',
      type: 'slug',
      options: { source: 'title', maxLength: 90 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 3,
      description:
        'Two or three sentences. Used as the meta description and above the listings on the cause page.',
      validation: (r) => r.required().max(400),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Paragraph', value: 'normal' },
            { title: 'Heading 2', value: 'h2' },
            { title: 'Heading 3', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
          lists: [
            { title: 'Bullet list', value: 'bullet' },
            { title: 'Numbered list', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [{ name: 'href', type: 'url', title: 'URL' }],
              },
            ],
          },
        },
      ],
      description:
        'About 400–600 words for a cause page. Write for someone who is intelligent, skeptical, and has never heard of this before. Include the counterarguments.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'uncertainties',
      title: 'What we’re not sure about',
      type: 'text',
      rows: 4,
      description:
        'Not optional. A curated board’s credibility rests on the reader trusting the curator is being honest; a page that picks one side achieves the opposite of what it should.',
      validation: (r) => r.required().min(80),
    }),
    defineField({
      name: 'sources',
      title: 'What this page is based on',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'explainerSource',
          fields: [
            { name: 'org', type: 'string', title: 'Organisation' },
            { name: 'title', type: 'string', title: 'Title of the piece' },
            { name: 'url', type: 'url', title: 'Link' },
          ],
          preview: {
            select: { title: 'title', subtitle: 'org' },
          },
        },
      ],
      description:
        'The published work this page summarises, credited at the top of the page and linked out. These organisations reserve their rights and two of them prohibit republication in their terms — so this list is a citation, not a licence. Nothing here may be reproduced verbatim beyond a single short quotation.',
    }),
    defineField({
      name: 'reviewedByHuman',
      title: 'Read by a Dutch speaker',
      type: 'boolean',
      initialValue: false,
      description:
        'These pages are generated without a human writer (§9.5). Has someone who reads Dutch fluently read it aloud? Turn this on if so. An offer, not a requirement.',
    }),
    defineField({
      name: 'critiquePasses',
      title: 'Number of anti-translationese passes',
      type: 'number',
      readOnly: true,
      description:
        'How many rounds the adversarial editor needed before finding nothing left.',
    }),
  ],
  preview: {
    select: { title: 'title', kind: 'kind', language: 'language', reviewed: 'reviewedByHuman' },
    prepare({ title, kind, language, reviewed }) {
      return {
        title,
        subtitle: [language?.toUpperCase(), kind, reviewed ? 'reviewed' : 'not reviewed']
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
})
