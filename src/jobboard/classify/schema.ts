/**
 * Structured-output schemas for the classifier.
 *
 * Every enum is derived from the taxonomy module, so a vocabulary change
 * propagates to the model contract automatically and cannot drift.
 */

import {
  CAUSE_AREAS,
  LANGUAGE_REQUIREMENTS,
  LEVERAGE_TYPES,
  LOCATION_MODES,
  SENIORITIES,
  WORK_AUTHORISATIONS,
} from '../taxonomy'

export const TRIAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'nlEligible',
    'primaryCause',
    'secondaryCauses',
    'leverage',
    'causeScore',
    'leverageScore',
    'languageRequirement',
    'workAuthorisation',
    'securityScreening',
    'securityNote',
    'seniority',
    'locationMode',
    'draftNoteNl',
    'reasoning',
  ],
  properties: {
    nlEligible: {
      type: 'boolean',
      description:
        'False if, having read the whole ad, a Netherlands-resident candidate could not hold this role.',
    },
    primaryCause: {
      // Anthropic's json_schema output format doesn't accept the JSON Schema
      // `type: [X, 'null']` array shorthand — it needs `anyOf` for a nullable
      // enum. Confirmed live: the array form threw a 400 on every listing.
      anyOf: [{ type: 'string', enum: [...CAUSE_AREAS] }, { type: 'null' }],
      description: 'One primary cause area, or null if none of them fit.',
    },
    secondaryCauses: {
      type: 'array',
      items: { type: 'string', enum: [...CAUSE_AREAS] },
      description: 'Zero or more secondary cause areas.',
    },
    leverage: {
      anyOf: [{ type: 'string', enum: [...LEVERAGE_TYPES] }, { type: 'null' }],
      description: 'Exactly one leverage archetype, or null if none fit.',
    },
    causeScore: {
      // Anthropic's json_schema format rejects minimum/maximum on integers too
      // — confirmed live. An explicit enum is the supported way to bound one.
      type: 'integer',
      enum: [0, 1, 2, 3],
      description:
        'How well the work bears on a problem treated as large, neglected and tractable.',
    },
    leverageScore: {
      type: 'integer',
      enum: [0, 1, 2, 3],
      description:
        'How much this specific role influences outcomes beyond the work of the person holding it.',
    },
    languageRequirement: { type: 'string', enum: [...LANGUAGE_REQUIREMENTS] },
    workAuthorisation: { type: 'string', enum: [...WORK_AUTHORISATIONS] },
    securityScreening: {
      type: 'boolean',
      description: 'True if a VOG or a vertrouwensfunctie screening is required.',
    },
    securityNote: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description: 'Short free-text detail on the screening requirement, or null.',
    },
    seniority: { type: 'string', enum: [...SENIORITIES] },
    locationMode: { type: 'string', enum: [...LOCATION_MODES] },
    draftNoteNl: {
      type: 'string',
      description:
        'One or two sentences in Dutch on the leverage, for a curator to edit. Written natively in Dutch, never translated.',
    },
    reasoning: {
      type: 'string',
      description:
        'Why it scored this way. Shown to the curator, never published. Note here if a label you wanted was not permitted.',
    },
  },
} as const

export type TriageResult = {
  nlEligible: boolean
  primaryCause: string | null
  secondaryCauses: string[]
  leverage: string | null
  causeScore: number
  leverageScore: number
  languageRequirement: string
  workAuthorisation: string
  securityScreening: boolean
  securityNote: string | null
  seniority: string
  locationMode: string
  draftNoteNl: string
  reasoning: string
}

export const NOTE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['noteNl'],
  properties: {
    noteNl: {
      type: 'string',
      description:
        'Eén of twee zinnen Nederlands over de hefboom, tussen 80 en 600 tekens.',
    },
  },
} as const

export const CRITIQUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      description: 'Empty when the text is clean.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['fragment', 'problem', 'suggestion'],
        properties: {
          fragment: { type: 'string', description: 'The exact text fragment at fault.' },
          problem: { type: 'string' },
          suggestion: { type: 'string' },
        },
      },
    },
  },
} as const

export type Critique = {
  findings: { fragment: string; problem: string; suggestion: string }[]
}
