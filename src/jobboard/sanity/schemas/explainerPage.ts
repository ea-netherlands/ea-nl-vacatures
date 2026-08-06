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
  { value: 'method', title: 'Methodepagina — waarom deze banen' },
  { value: 'cause', title: 'Probleemgebied' },
  { value: 'earning-to-give', title: 'Earning to give' },
] as const

export const explainerPage = defineType({
  name: 'explainerPage',
  title: 'Uitlegpagina',
  type: 'document',
  fields: [
    defineField({
      name: 'language',
      title: 'Taal',
      type: 'string',
      readOnly: true,
      hidden: true,
      description: 'Beheerd door de document-internationalization-plugin. Nederlands is de basis.',
    }),
    defineField({
      name: 'kind',
      title: 'Soort pagina',
      type: 'string',
      options: { list: [...EXPLAINER_KINDS] },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'causeArea',
      title: 'Bij welk probleemgebied hoort deze pagina',
      type: 'string',
      options: { list: causeAreaOptions() },
      hidden: ({ document }) => document?.kind !== 'cause',
      description: 'Verbindt de pagina met elk cause-label op het bord.',
    }),
    defineField({
      name: 'title',
      title: 'Titel',
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
      title: 'Samenvatting',
      type: 'text',
      rows: 3,
      description:
        'Twee of drie zinnen. Wordt gebruikt als meta-description en boven de vacatures op de probleempagina.',
      validation: (r) => r.required().max(400),
    }),
    defineField({
      name: 'body',
      title: 'Tekst',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Alinea', value: 'normal' },
            { title: 'Kop 2', value: 'h2' },
            { title: 'Kop 3', value: 'h3' },
            { title: 'Citaat', value: 'blockquote' },
          ],
          lists: [
            { title: 'Opsomming', value: 'bullet' },
            { title: 'Nummers', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Nadruk', value: 'strong' },
              { title: 'Cursief', value: 'em' },
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
        'Ongeveer 400–600 woorden voor een probleempagina. Schrijf voor iemand die intelligent is, sceptisch, en hier nog nooit van heeft gehoord. Neem de tegenargumenten op.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'uncertainties',
      title: 'Wat we niet zeker weten',
      type: 'text',
      rows: 4,
      description:
        'Niet optioneel. De geloofwaardigheid van een samengesteld bord hangt erop dat de lezer denkt dat de curator eerlijk is; een pagina die één kant kiest bereikt het tegenovergestelde van wat hij moet doen.',
      validation: (r) => r.required().min(80),
    }),
    defineField({
      name: 'reviewedByHuman',
      title: 'Door een Nederlandstalige gelezen',
      type: 'boolean',
      initialValue: false,
      description:
        'Deze pagina’s worden zonder menselijke schrijver gegenereerd (§9.5). Heeft iemand die vloeiend Nederlands leest hem hardop voorgelezen? Zet dit dan aan. Een aanbod, geen voorwaarde.',
    }),
    defineField({
      name: 'critiquePasses',
      title: 'Aantal anti-vertaalslag-rondes',
      type: 'number',
      readOnly: true,
      description:
        'Hoeveel rondes de vijandige eindredacteur nodig had voordat er geen bevindingen meer waren.',
    }),
  ],
  preview: {
    select: { title: 'title', kind: 'kind', language: 'language', reviewed: 'reviewedByHuman' },
    prepare({ title, kind, language, reviewed }) {
      return {
        title,
        subtitle: [language?.toUpperCase(), kind, reviewed ? 'gelezen' : 'niet gelezen']
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
})
