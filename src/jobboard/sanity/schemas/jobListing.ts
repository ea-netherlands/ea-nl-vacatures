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
  skillOptions,
  subAreaOptions,
  MAX_SKILLS_PER_LISTING,
  LANGUAGE_REQUIREMENTS,
  LOCATION_MODES,
  SENIORITIES,
  WORK_AUTHORISATIONS,
} from '../../taxonomy'

export const jobListing = defineType({
  name: 'jobListing',
  title: 'Job listing',
  type: 'document',
  groups: [
    { name: 'editorial', title: 'Editorial', default: true },
    { name: 'taxonomy', title: 'Taxonomy' },
    { name: 'practical', title: 'Practical details' },
    { name: 'provenance', title: 'Provenance' },
  ],
  fields: [
    /*
      First field on the first tab, above the job title.

      This is the one thing a curator wants before anything else: the case for
      why this listing is in front of them at all. It used to sit at the bottom
      of a separate "Provenance" tab, so every review began by clicking away
      from the form to find the argument and then clicking back to act on it.
      Read-only, never shown publicly — it is the classifier talking to the
      curator, not to a reader.
    */
    defineField({
      name: 'llmReasoning',
      title: 'Why the classifier passed this through',
      type: 'text',
      rows: 5,
      group: 'editorial',
      readOnly: true,
      description:
        'The classifier’s own argument, for triage. Not shown to readers, and not a substitute for reading the ad — it is what to check, not what to trust.',
    }),
    defineField({
      name: 'title',
      title: 'Job title',
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
      title: 'Employer',
      type: 'reference',
      to: [{ type: 'employer' }],
      group: 'editorial',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'applyUrl',
      title: 'Link to the listing',
      type: 'url',
      group: 'editorial',
      description: 'Where the reader goes. We count this click server-side.',
      validation: (r) => r.required(),
    }),

    // ---- THE editorial field. Everything else is supporting cast. ----
    defineField({
      name: 'whyThisMattersNl',
      title: 'Why this is on the board',
      type: 'text',
      rows: 3,
      group: 'editorial',
      description:
        'Written in Dutch — this is what readers see. One or two sentences on the leverage. Assume the reader has never heard of this employer and doesn’t know why it matters. This is the only reason someone looks here instead of on LinkedIn. Avoid "impactvol", "betekenisvol" and "het verschil maken".',
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
        'Machine-translated by `npm run translate`. Not human-reviewed by default — see §12. There is exactly one note for a curator to write, and it is the Dutch one. Edit the Dutch and re-run with --force to refresh this.',
    }),
    defineField({
      name: 'excerpt',
      title: 'Short summary of the role',
      type: 'text',
      rows: 4,
      group: 'editorial',
      description:
        'Neutral and factual. The argument belongs in "Why this is on the board". Don’t copy the whole job ad text here.',
      validation: (r) => r.max(1200),
    }),
    defineField({
      name: 'excerptEn',
      title: 'English summary',
      type: 'text',
      rows: 4,
      group: 'editorial',
      readOnly: true,
      description:
        'Machine-translated by `npm run translate`. Most listings here are Dutch ads, so without this the English site showed a Dutch paragraph under "About the role" — the excerpt is the one editorial field that used to have no locale variant at all.',
    }),

    // ---- Taxonomy ----
    defineField({
      name: 'primaryCause',
      title: 'Primary cause area',
      type: 'string',
      group: 'taxonomy',
      options: { list: causeAreaOptions() },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'secondaryCauses',
      title: 'Secondary cause areas',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'taxonomy',
      options: { list: causeAreaOptions() },
    }),
    defineField({
      name: 'subArea',
      title: 'Sub-area',
      type: 'string',
      group: 'taxonomy',
      description:
        'The topic a reader would actually search for — "AI-veiligheid", not "mondiale catastrofale risico’s". This drives the chips on the index, so it is what most people click to reach this listing. Must belong to the primary cause area. Leave empty only for a genuinely cross-cutting role — a cause-prioritisation post that sits above every sub-area — rather than as a shortcut when none feels perfect.',
      options: { list: subAreaOptions() },
    }),
    defineField({
      name: 'skills',
      title: 'Skills',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'taxonomy',
      description:
        'One or two, for readers who are cause-neutral. Two is the cap: a role that seems to need five is a role we have not understood.',
      options: { list: skillOptions() },
      validation: (r) => r.required().min(1).max(MAX_SKILLS_PER_LISTING),
    }),
    defineField({
      name: 'leverage',
      title: 'Type of leverage',
      type: 'string',
      group: 'taxonomy',
      description:
        'Internal only — no longer shown to readers. It still sets the quality bar at promotion time and splits the two tiers on the index, so keep it accurate.',
      options: { list: leverageOptions() },
      validation: (r) => r.required(),
    }),

    // ---- Practical eligibility (§5.4) ----
    defineField({
      name: 'locationCity',
      title: 'City',
      type: 'string',
      group: 'practical',
    }),
    defineField({
      name: 'locationMode',
      title: 'Where you work',
      type: 'string',
      group: 'practical',
      description:
        'remote = doable from anywhere in NL · on-site-nl = must be at a Dutch workplace · nl-flexible = Dutch employer with a Dutch office where hybrid is normal.',
      options: { list: plainOptions(LOCATION_MODES) },
    }),
    defineField({
      name: 'seniority',
      title: 'Seniority',
      type: 'string',
      group: 'practical',
      options: { list: plainOptions(SENIORITIES) },
    }),
    defineField({
      name: 'languageRequirement',
      title: 'Language requirement',
      type: 'string',
      group: 'practical',
      description:
        'The filter no other board offers, and what saves the international part of the audience the most wasted clicks.',
      options: { list: plainOptions(LANGUAGE_REQUIREMENTS) },
    }),
    defineField({
      name: 'workAuthorisation',
      title: 'Work authorisation',
      type: 'string',
      group: 'practical',
      options: { list: plainOptions(WORK_AUTHORISATIONS) },
    }),
    defineField({
      name: 'securityScreening',
      title: 'VOG or security screening required',
      type: 'boolean',
      group: 'practical',
      initialValue: false,
    }),
    defineField({
      name: 'securityNote',
      title: 'Note on the screening',
      type: 'string',
      group: 'practical',
      hidden: ({ document }) => !document?.securityScreening,
    }),
    defineField({
      name: 'salaryText',
      title: 'Salary as stated',
      type: 'string',
      group: 'practical',
      description:
        'The figure only — no "per maand" or "per year". Copy the numbers verbatim; don’t convert or promise anything. The period goes in the field below so the site can label it in the reader’s language.',
    }),
    defineField({
      name: 'salaryPeriod',
      title: 'Pay period',
      type: 'string',
      group: 'practical',
      options: {
        list: [
          { value: 'month', title: 'Per month' },
          { value: 'year', title: 'Per year' },
        ],
        layout: 'radio',
      },
      description:
        'Kept separate from the figure because it is a label, not source data — spelling it into salaryText put a Dutch "per maand" on the English page.',
    }),
    defineField({
      name: 'mentions30PercentRuling',
      title: 'Listing mentions the 30% ruling',
      type: 'boolean',
      group: 'practical',
      initialValue: false,
      description:
        'Just a flag. The ruling drops to 27% from 2027 and the conditions change regularly — never calculate anything here for the reader.',
    }),

    // ---- Dates ----
    defineField({ name: 'postedAt', title: 'Posted on', type: 'datetime', group: 'practical' }),
    defineField({ name: 'deadlineAt', title: 'Closes on', type: 'datetime', group: 'practical' }),
    defineField({
      name: 'expiresAt',
      title: 'Automatically taken offline on',
      type: 'datetime',
      group: 'practical',
      description:
        'Automatically unpublished after this date. Defaults to the closing date, or 60 days after posting.',
      /*
        A warning rather than an error, because a date in the past is legitimate
        on an archived listing — but it is never what a curator wants at the
        moment they are about to publish.
    
        Without it, publishing a listing whose date has already passed succeeds,
        reports success, and produces a page no reader will ever see: every
        public query filters on `expiresAt > now()`. Two nuclear-security roles
        went out that way and the curator's only signal was that they could not
        find them afterwards. The promotion query now refuses to queue an
        already-closed vacancy; this catches the ones already sitting in review,
        and anything a curator edits by hand.
      */
      validation: (r) =>
        r.custom((value) => {
          if (!value || typeof value !== 'string') return true
          const when = new Date(value)
          if (Number.isNaN(when.getTime())) return true
          if (when.getTime() > Date.now()) return true
          return 'This date has already passed, so publishing will hide the listing immediately. Extend it, or leave the listing unpublished.'
        }).warning(),
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
      title: 'Source',
      type: 'string',
      group: 'provenance',
      readOnly: true,
    }),
    defineField({
      name: 'llmScore',
      title: 'Classifier score',
      type: 'number',
      group: 'provenance',
      readOnly: true,
    }),

  ],
  orderings: [
    {
      title: 'Score (high to low)',
      name: 'scoreDesc',
      by: [{ field: 'llmScore', direction: 'desc' }],
    },
    {
      title: 'Closing soon',
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
        title: `${title ?? '(untitled)'}`,
        subtitle: [employer, cause, score != null ? `score ${score}` : null]
          .filter(Boolean)
          .join(' · '),
        description: note,
      }
    },
  },
})
