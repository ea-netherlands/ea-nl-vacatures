/**
 * Where each explainer's substance comes from — August 2026.
 *
 * ## Why this module exists
 *
 * The explainer pages used to be written from our own internal cause
 * definitions and nothing else. That is a thin basis for a page claiming to
 * explain biosecurity to a stranger, and it quietly implied more original
 * research than the board has ever done. These pages now openly rest on the
 * organisations that did the work: 80,000 Hours, Probably Good and Forethought.
 *
 * ## What this is NOT
 *
 * It is not a licence to republish them. All three reserve their rights, and
 * two say so in terms:
 *
 * - Probably Good's terms of service: "You must not reproduce, distribute,
 *   modify, create derivative works of, publicly display, publicly perform,
 *   republish ... any of the material on our Website."
 * - 80,000 Hours' terms of use licence the site "only for your personal,
 *   non-commercial benefit, and not for providing third parties, directly or
 *   indirectly, with their own access."
 * - Forethought states no licence, which means all rights reserved.
 *
 * So the generator summarises in its own words, quotes at most one short
 * passage per page, and links out prominently. Attribution is not a substitute
 * for permission, and crediting a source we had copied wholesale would not make
 * it any less copied.
 *
 * That constraint happens to point the same way the board already does. It
 * tells every reader on the index to try 80,000 Hours and Probably Good first;
 * sending traffic to their profiles rather than absorbing their text is the
 * same argument applied to prose. Spec §10 reached the same conclusion about
 * job listings: hold a short excerpt, link out, don't try to keep people here.
 *
 * ## If permission is ever granted
 *
 * Then this module is the place it gets recorded — add the grant next to the
 * source and relax the generator's instruction. Until then, treat verbatim
 * reproduction of anything below as a bug.
 */

import type { CauseArea } from '../taxonomy'

export type Source = {
  /** The organisation to credit, as it writes its own name. */
  org: string
  /** The piece's own title, so a reader can recognise it if they land there. */
  title: string
  url: string
  /**
   * What this source is being leaned on FOR. Cause pages take several sources,
   * and without this the generator averages them into mush instead of using
   * each where it is strongest.
   */
  covers: string
}

/**
 * Sources per cause area, chosen by EA NL rather than by us guessing.
 *
 * `global-catastrophic-risks` takes three because it is three problems wearing
 * one label — AI, pandemics, nuclear — and a single overview page would leave
 * the AI section thinner than the area deserves.
 */
export const CAUSE_SOURCES: Record<CauseArea, readonly Source[]> = {
  'global-health-wellbeing': [
    {
      org: 'Probably Good',
      title: 'Global health and development',
      url: 'https://probablygood.org/cause-areas/global-health-and-development/',
      covers: 'the whole area — scale, evidence base, and what work in it looks like',
    },
  ],
  'farmed-animal-welfare': [
    {
      org: 'Probably Good',
      title: 'Animal welfare',
      url: 'https://probablygood.org/cause-areas/animal-welfare/',
      covers: 'the whole area, including why farmed animals rather than animals in general',
    },
  ],
  'global-catastrophic-risks': [
    {
      org: 'Probably Good',
      title: 'Global catastrophic risks',
      url: 'https://probablygood.org/cause-areas/global-catastrophic-risks/',
      covers: 'the framing of the area as a whole, and nuclear and great-power conflict',
    },
    {
      org: '80,000 Hours',
      title: 'Preventing an AI-related catastrophe',
      url: 'https://80000hours.org/problem-profiles/artificial-intelligence/',
      covers: 'the AI section — the argument for risk, and the state of the debate',
    },
    {
      org: 'Probably Good',
      title: 'Biosecurity',
      url: 'https://probablygood.org/cause-areas/biosecurity/',
      covers: 'the pandemics and dual-use research section',
    },
  ],
  'better-futures': [
    {
      org: 'Forethought',
      title: 'Introducing Better Futures',
      url: 'https://www.forethought.org/research/introducing-better-futures',
      covers: 'the core idea, and why surviving is not the same as flourishing',
    },
    {
      org: 'Forethought',
      title: 'How to make the future better',
      url: 'https://www.forethought.org/research/how-to-make-the-future-better',
      covers: 'what can actually be done about it',
    },
  ],
  'movement-building': [
    {
      org: '80,000 Hours',
      title: 'Promoting effective altruism',
      url: 'https://80000hours.org/problem-profiles/promoting-effective-altruism/',
      covers: 'the whole area, including the case against and the ways it can go wrong',
    },
  ],
}

/**
 * Sources for the pages that are not cause areas.
 *
 * Keyed by the generator's page key rather than by cause.
 *
 * The method page explains *this board*, which nobody else has written about —
 * but one section of it does not. The leverage section (September 2026) sets
 * out an idea 80,000 Hours worked out and we adopted wholesale, including the
 * taxonomy the classifier now scores against, so it is cited like any other
 * borrowed argument. Earning to give is the same situation: a general idea with
 * a long-standing canonical treatment, where writing our own from scratch would
 * be both worse and a quiet claim to originality we have no business making.
 *
 * The Dutch material on both pages — Amsterdam's proprietary trading firms, the
 * 30% ruling, which ministries and regulators and lenders actually matter here
 * — stays ours. That is the half no international resource covers, and it is
 * the reason the pages exist at all.
 */
export const PAGE_SOURCES: Record<string, readonly Source[]> = {
  method: [
    {
      org: '80,000 Hours',
      title: 'How much leverage does a career path offer?',
      url: 'https://80000hours.org/articles/leverage/',
      covers:
        'the leverage section — the definition, the mechanisms by which a role reaches past its own hours, and the split between leverage and the effectiveness of the solution it is pointed at',
    },
  ],
  'earning-to-give': [
    {
      org: '80,000 Hours',
      title: 'Earning to give',
      url: 'https://80000hours.org/articles/earning-to-give/',
      covers:
        'the general case, who it suits, how it has changed as funding grew — and, importantly for this page, the objections',
    },
  ],
}

/**
 * The instruction block appended to every brief that has sources.
 *
 * Written as hard rules rather than as tone guidance because the failure mode
 * is legal rather than stylistic, and a model asked nicely to "avoid copying"
 * will still produce a lightly reworded paraphrase that is plainly derivative.
 */
/**
 * Reuse permissions, and what is still not permitted.
 *
 * `sourceRules` below used to forbid reproduction outright, because all three
 * organisations reserve their rights and two prohibit republication in their
 * terms. It also said what to do about it: "the route is emailing the orgs for
 * a grant — record it in `sources.ts` — not a workaround." This is that record.
 *
 * ## What is granted
 *
 * EA Nederland reports having permission from 80,000 Hours to reuse their
 * material (September 2026). **The specifics below still need filling in**, and
 * they matter: a grant with no recorded scope is indistinguishable from no
 * grant to the next person who reads this file, and it cannot be shown to
 * anyone who asks.
 *
 *   grantedBy   — the person or team at 80,000 Hours who agreed
 *   grantedOn   — the date
 *   scope       — verbatim republication? excerpts with attribution?
 *                 translation into Dutch? derivative works?
 *   evidence    — where the email or message lives
 *
 * ## What is NOT granted
 *
 * Probably Good and Forethought are untouched by this and remain strictly
 * off-limits. Probably Good's terms are the most explicit of the three — "You
 * must not reproduce, distribute, modify, create derivative works of ...
 * republish" — and Forethought states no licence at all, which means all rights
 * reserved. Do not let a grant from one organisation quietly become a house
 * policy about all three; that is exactly the drift this file exists to stop.
 *
 * ## What it changes in practice
 *
 * Less than it might seem, and that is not a reason to ignore it. The board's
 * pages are Dutch and 80,000 Hours writes in English, so reuse means
 * translation, which reintroduces the register problem a beta reader has
 * already reported ("alsof ze uit het Engels vertaald zijn"). Their prose is
 * also written for a global audience, and the Dutch specifics are the whole
 * reason these pages exist. What the grant genuinely buys is the freedom to
 * quote them directly and at length where their sentence is better than a
 * summary, instead of writing around it.
 */
export const REUSE_GRANTS = [
  {
    org: '80,000 Hours',
    grantedBy: null as string | null,
    grantedOn: null as string | null,
    scope: null as string | null,
    evidence: null as string | null,
    note: 'Reported by EA NL, September 2026. Details outstanding — see the block comment above.',
  },
] as const

/** Organisations with no grant. Nothing here may be reproduced. */
export const NO_REUSE = ['Probably Good', 'Forethought'] as const

export const sourceRules = (words: readonly [number, number]) => `## Using the source material

You are given the text of the pieces this page is based on.

Material from **${NO_REUSE.join(' and ')}** is reference only, NOT copy to be
reused: they reserve their rights and prohibit republication in their terms of
service. Every rule below is binding for them.

Material from **${REUSE_GRANTS.map((g) => g.org).join(', ')}** is covered by a
reuse permission, so rules 1 and 2 are relaxed for that source specifically: you
may quote it directly, at more than one sentence, where their wording genuinely
beats a summary. Attribute every such passage in the sentence that carries it.
Rules 3 to 7 still apply to it in full — most importantly 4 and 7, because a
page that leans on quotation stops being the thing only we can write. Prefer
your own sentences by default; reach for theirs when they have said it better.

Treat all of the following as binding:

1. **Write every sentence yourself.** Do not reproduce sentences or distinctive
   phrasings from the sources, and do not produce a paraphrase that follows a
   source paragraph by paragraph. If a passage of yours could be laid over the
   original and matched clause for clause, rewrite it.
2. **At most ONE short quotation on the page**, under about twenty words, in
   quotation marks, naming the organisation in the same sentence. Use it where a
   source says something better than a summary could. Zero quotations is fine.
3. **Take the substance, not the structure.** Facts, figures and arguments are
   what you are here for; keep them accurate and attribute any statistic to
   whoever produced it. The order and shape of the page are yours.
4. **Be much shorter than the sources.** This page is ${words[0]}–${words[1]} words
   against originals many times that. If you find yourself covering everything,
   you are reproducing rather than summarising.
5. **Say where it comes from, in the body.** Early on, name the organisation
   whose work this rests on and tell the reader to go and read it — not as a
   footnote but as a recommendation you mean. This board already tells people to
   try 80,000 Hours and Probably Good before it; the explainers should sound like
   the same board.
6. **Never imply the source endorses this board**, has reviewed this page, or
   was involved in it. We are citing them. They have not vetted us.
7. **Add what they cannot.** The sources are international. The Dutch angle —
   which ministries, regulators, institutes, funders and universities here bear
   on this problem — is ours, is why this page exists at all, and must not be
   crowded out by summary.`
