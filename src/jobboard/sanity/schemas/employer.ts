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
  title: 'Organisatie',
  type: 'document',
  groups: [
    { name: 'editorial', title: 'Redactie', default: true },
    { name: 'gates', title: 'Poorten' },
    { name: 'technical', title: 'Techniek' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Naam',
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
      description: 'Slug in de Postgres-watchlist. Verbindt beide kanten.',
    }),
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
      group: 'editorial',
    }),
    defineField({
      name: 'careersUrl',
      title: 'Vacaturepagina',
      type: 'url',
      group: 'editorial',
    }),
    defineField({
      name: 'city',
      title: 'Plaats',
      type: 'string',
      group: 'editorial',
    }),
    defineField({
      name: 'leverageNoteNl',
      title: 'Waarom deze organisatie ertoe doet',
      type: 'text',
      rows: 4,
      group: 'editorial',
      description:
        'Eén alinea. Deze tekst is duurzaam — anders dan de notities per functie — en is wat er in Google gevonden wordt. Schrijf voor iemand die deze organisatie net heeft opgezocht.',
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
      title: 'Probleemgebieden',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'editorial',
      options: { list: causeAreaOptions() },
    }),

    // ---- The gates. Mirrored so a curator can see why a label is available. ----
    defineField({
      name: 'givingGreenListed',
      title: 'Staat op een Giving Green-lijst',
      type: 'boolean',
      group: 'gates',
      initialValue: false,
      readOnly: true,
      description:
        'Poort voor het label "klimaat" (§5.1). Wordt beheerd in de pipeline, niet hier. Ververs bij een nieuwe Giving Green-cyclus — een allowlist die niemand bijhoudt wordt een verkeerde allowlist.',
    }),
    defineField({
      name: 'climateException',
      title: 'Handmatige klimaatuitzondering',
      type: 'boolean',
      group: 'gates',
      initialValue: false,
      description:
        'Vereist een expliciet menselijk besluit en hoort bijna leeg te blijven. Groeit deze lijst voorbij een paar organisaties, dan werkt de poort niet meer.',
    }),
    defineField({
      name: 'e2gAllowlisted',
      title: 'Toegelaten voor earning to give',
      type: 'boolean',
      group: 'gates',
      initialValue: false,
      readOnly: true,
      description: 'Poort voor de earning-to-give-sectie (§5.3), met een salarisdrempel.',
    }),
    defineField({
      name: 'notEndorsement',
      title: 'Vermelding is expliciet geen aanbeveling',
      type: 'boolean',
      group: 'gates',
      initialValue: false,
      description:
        'Zet dit aan voor earning-to-give-werkgevers. De pagina zegt dit dan met zoveel woorden.',
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
      title: 'Staat ook op 80.000 Hours of Probably Good',
      type: 'boolean',
      group: 'technical',
      initialValue: false,
      description:
        'Voor de kwaliteitsmeting: minstens 60% van de vacatures moet bij organisaties staan die op géén van beide boards staan (§3).',
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'city', note: 'leverageNoteNl' },
    prepare({ title, subtitle, note }) {
      return { title, subtitle, description: note }
    },
  },
})
