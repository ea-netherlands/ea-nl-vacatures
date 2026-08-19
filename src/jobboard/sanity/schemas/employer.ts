/**
 * `employer` — mirrored from Postgres for the ones that get published, so
 * editorial copy about an organisation lives in the CMS (spec §6.4).
 *
 * Employer pages are cheap to produce, because the employer-level leverage note
 * is durable in a way per-role notes are not — and they are what will actually
 * rank in search. Someone Googling "werken bij Adessium" is exactly the reader
 * we want (§9.4).
 */

import { defineField, defineType } from 'sanity'
import { causeAreaOptions } from '../../taxonomy'

export const employer = defineType({
  name: 'employer',
  title: 'Organisation',
  type: 'document',
  groups: [
    { name: 'editorial', title: 'Editorial', default: true },
    { name: 'gates', title: 'Gates' },
    { name: 'technical', title: 'Technical' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      group: 'editorial',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL',
      type: 'slug',
      group: 'editorial',
      options: { source: 'name', maxLength: 90 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'pipelineEmployerId',
      title: 'Pipeline employer id',
      type: 'string',
      group: 'technical',
      readOnly: true,
      description: 'Slug in the Postgres watchlist. Links both sides.',
    }),
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
      group: 'editorial',
    }),
    defineField({
      name: 'careersUrl',
      title: 'Careers page',
      type: 'url',
      group: 'editorial',
    }),
    defineField({
      name: 'city',
      title: 'City',
      type: 'string',
      group: 'editorial',
    }),
    defineField({
      name: 'leverageNoteNl',
      title: 'Why this organisation matters',
      type: 'text',
      rows: 4,
      group: 'editorial',
      description:
        'Written in Dutch. One paragraph. Unlike the per-role notes, this text is durable — it is what shows up in Google. Write for someone who just looked this organisation up.',
      validation: (r) => r.max(1200),
    }),
    defineField({
      name: 'leverageNoteEn',
      title: 'English translation',
      type: 'text',
      rows: 4,
      group: 'editorial',
      readOnly: true,
      description: 'Machine-translated from the Dutch on publish.',
    }),
    defineField({
      name: 'causeAreas',
      title: 'Cause areas',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'editorial',
      options: { list: causeAreaOptions() },
    }),

    // ---- The gate. Mirrored so a curator can see why a label is available. ----
    defineField({
      name: 'e2gAllowlisted',
      title: 'Approved for earning to give',
      type: 'boolean',
      group: 'gates',
      initialValue: false,
      readOnly: true,
      description: 'Gate for the earning-to-give section (§5.3), with a salary threshold.',
    }),
    defineField({
      name: 'notEndorsement',
      title: 'Listing is explicitly not an endorsement',
      type: 'boolean',
      group: 'gates',
      initialValue: false,
      description:
        'Turn this on for earning-to-give employers. The page will then say so explicitly.',
    }),

    defineField({
      name: 'ats',
      title: 'ATS',
      type: 'string',
      group: 'technical',
      readOnly: true,
    }),
    defineField({
      name: 'onEaBoards',
      title: 'Also listed on 80,000 Hours or Probably Good',
      type: 'boolean',
      group: 'technical',
      initialValue: false,
      description:
        'For the quality metric: at least 60% of listings must be at organisations that appear on neither board (§3).',
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'city', note: 'leverageNoteNl' },
    prepare({ title, subtitle, note }) {
      return { title, subtitle, description: note }
    },
  },
})
