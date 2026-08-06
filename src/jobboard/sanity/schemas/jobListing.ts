/**
 * `jobListing` — spec §6.4.
 *
 * Note what is NOT here: the full job description. We store a short factual
 * excerpt and link out. That is both the legal norm among aggregators (§10) and
 * the right product decision — we are not trying to keep people on the page.
 */

import { defineField, defineType } from 'sanity'
import {
  causeAreaOptions,
  leverageOptions,
  plainOptions,
  LANGUAGE_REQUIREMENTS,
  LOCATION_MODES,
  SENIORITIES,
  WORK_AUTHORISATIONS,
} from '../../taxonomy'

export const jobListing = defineType({
  name: 'jobListing',
  title: 'Vacature',
  type: 'document',
  groups: [
    { name: 'editorial', title: 'Redactie', default: true },
    { name: 'taxonomy', title: 'Indeling' },
    { name: 'practical', title: 'Voorwaarden' },
    { name: 'provenance', title: 'Herkomst' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Functietitel',
      type: 'string',
      group: 'editorial',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL',
      type: 'slug',
      group: 'editorial',
      options: {
        source: (doc: Record<string, unknown>) =>
          `${(doc.title as string) ?? ''}-${(doc.employerName as string) ?? ''}`,
        maxLength: 90,
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'employer',
      title: 'Werkgever',
      type: 'reference',
      to: [{ type: 'employer' }],
      group: 'editorial',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'applyUrl',
      title: 'Link naar de vacature',
      type: 'url',
      group: 'editorial',
      description: 'Waar de lezer naartoe gaat. We tellen deze klik server-side.',
      validation: (r) => r.required(),
    }),

    // ---- THE editorial field. Everything else is supporting cast. ----
    defineField({
      name: 'whyThisMattersNl',
      title: 'Waarom staat dit op het bord',
      type: 'text',
      rows: 3,
      group: 'editorial',
      description:
        'Eén of twee zinnen over de hefboom. Ga ervan uit dat de lezer nog nooit van deze werkgever heeft gehoord en niet weet waarom dit ertoe doet. Dit is de enige reden dat iemand hier kijkt in plaats van op LinkedIn. Vermijd "impactvol", "betekenisvol" en "het verschil maken".',
      // The minimum length is deliberate: it stops a rushed curator publishing
      // with an empty or one-word note, which would quietly turn the board into
      // a generic aggregator over a few months. Enforcing it in the schema is
      // the cheapest possible guard against the main failure mode.
      validation: (r) => r.required().min(80).max(600),
    }),
    defineField({
      name: 'whyThisMattersEn',
      title: 'English translation',
      type: 'text',
      rows: 3,
      group: 'editorial',
      readOnly: true,
      description:
        'Machine-translated from the Dutch on publish. Not human-reviewed by default — see §12. There is exactly one note for a curator to write, and it is the Dutch one.',
    }),
    defineField({
      name: 'excerpt',
      title: 'Korte samenvatting van de functie',
      type: 'text',
      rows: 4,
      group: 'editorial',
      description:
        'Neutraal en feitelijk. Het argument hoort in "Waarom staat dit op het bord". Neem hier niet de hele vacaturetekst over.',
      validation: (r) => r.max(1200),
    }),

    // ---- Taxonomy ----
    defineField({
      name: 'primaryCause',
      title: 'Primair probleemgebied',
      type: 'string',
      group: 'taxonomy',
      options: { list: causeAreaOptions() },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'secondaryCauses',
      title: 'Secundaire probleemgebieden',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'taxonomy',
      options: { list: causeAreaOptions() },
    }),
    defineField({
      name: 'leverage',
      title: 'Soort hefboom',
      type: 'string',
      group: 'taxonomy',
      options: { list: leverageOptions() },
      validation: (r) => r.required(),
    }),

    // ---- Practical eligibility (§5.4) ----
    defineField({
      name: 'locationCity',
      title: 'Plaats',
      type: 'string',
      group: 'practical',
    }),
    defineField({
      name: 'locationMode',
      title: 'Werkplek',
      type: 'string',
      group: 'practical',
      options: { list: plainOptions(LOCATION_MODES) },
    }),
    defineField({
      name: 'seniority',
      title: 'Niveau',
      type: 'string',
      group: 'practical',
      options: { list: plainOptions(SENIORITIES) },
    }),
    defineField({
      name: 'languageRequirement',
      title: 'Taaleis',
      type: 'string',
      group: 'practical',
      description:
        'Het filter dat geen ander bord biedt, en dat het internationale deel van het publiek de meeste verspilde klikken scheelt.',
      options: { list: plainOptions(LANGUAGE_REQUIREMENTS) },
    }),
    defineField({
      name: 'workAuthorisation',
      title: 'Werkvergunning',
      type: 'string',
      group: 'practical',
      options: { list: plainOptions(WORK_AUTHORISATIONS) },
    }),
    defineField({
      name: 'securityScreening',
      title: 'VOG of veiligheidsonderzoek vereist',
      type: 'boolean',
      group: 'practical',
      initialValue: false,
    }),
    defineField({
      name: 'securityNote',
      title: 'Toelichting op de screening',
      type: 'string',
      group: 'practical',
      hidden: ({ document }) => !document?.securityScreening,
    }),
    defineField({
      name: 'salaryText',
      title: 'Salaris zoals vermeld',
      type: 'string',
      group: 'practical',
      description: 'Letterlijk overnemen. Reken niets om en beloof niets.',
    }),
    defineField({
      name: 'mentions30PercentRuling',
      title: 'Vacature vermeldt de 30%-regeling',
      type: 'boolean',
      group: 'practical',
      initialValue: false,
      description:
        'Alleen een vlag. De regeling gaat vanaf 2027 naar 27% en de voorwaarden veranderen regelmatig — reken hier nooit iets voor de lezer uit.',
    }),

    // ---- Dates ----
    defineField({ name: 'postedAt', title: 'Geplaatst op', type: 'datetime', group: 'practical' }),
    defineField({ name: 'deadlineAt', title: 'Sluit op', type: 'datetime', group: 'practical' }),
    defineField({
      name: 'expiresAt',
      title: 'Automatisch offline op',
      type: 'datetime',
      group: 'practical',
      description:
        'Wordt na deze datum automatisch gedepubliceerd. Standaard de sluitingsdatum, of 60 dagen na plaatsing.',
    }),

    // ---- Provenance: read-only, written by the pipeline ----
    defineField({
      name: 'pipelineListingId',
      title: 'Pipeline listing id',
      type: 'number',
      group: 'provenance',
      readOnly: true,
    }),
    defineField({
      name: 'sourceId',
      title: 'Bron',
      type: 'string',
      group: 'provenance',
      readOnly: true,
    }),
    defineField({
      name: 'llmScore',
      title: 'Score van de classifier',
      type: 'number',
      group: 'provenance',
      readOnly: true,
    }),
    defineField({
      name: 'llmReasoning',
      title: 'Waarom de classifier dit doorliet',
      type: 'text',
      group: 'provenance',
      readOnly: true,
      description: 'Context voor de curator. Wordt nooit publiek getoond.',
    }),
  ],
  orderings: [
    {
      title: 'Score (hoog naar laag)',
      name: 'scoreDesc',
      by: [{ field: 'llmScore', direction: 'desc' }],
    },
    {
      title: 'Sluit binnenkort',
      name: 'expiresAsc',
      by: [{ field: 'expiresAt', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      employer: 'employer.name',
      score: 'llmScore',
      cause: 'primaryCause',
      note: 'whyThisMattersNl',
    },
    prepare({ title, employer, score, cause, note }) {
      return {
        title: `${title ?? '(zonder titel)'}`,
        subtitle: [employer, cause, score != null ? `score ${score}` : null]
          .filter(Boolean)
          .join(' · '),
        description: note,
      }
    },
  },
})
