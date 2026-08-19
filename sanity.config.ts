/**
 * Sanity Studio configuration — the curation UI (spec §6.1).
 *
 * Sanity Studio *is* the review queue. It already has draft/publish workflow,
 * custom Structure Builder views, custom input components and role-based
 * access, so there is no bespoke admin panel to build.
 *
 * Mounted at /studio inside this app, so the board and its curation tool deploy
 * together and there is one thing to host.
 */

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { documentInternationalization } from '@sanity/document-internationalization'

import { apiVersion, dataset, projectId } from './src/jobboard/sanity/client'
import { schemaTypes } from './src/jobboard/sanity/schemas'
import { defaultDocumentNode, structure } from './src/jobboard/sanity/structure'

export default defineConfig({
  name: 'ea-nl-vacatures',
  title: 'EA Netherlands — Jobs',
  basePath: '/studio',
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [
    structureTool({ structure, defaultDocumentNode }),
    // Document-level i18n for the explainer layer (§6.4). Dutch is the base
    // language, so the English version is created as a translation of it
    // rather than the other way round.
    documentInternationalization({
      supportedLanguages: [
        { id: 'nl', title: 'Nederlands' },
        { id: 'en', title: 'English' },
      ],
      schemaTypes: ['explainerPage'],
    }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
})
