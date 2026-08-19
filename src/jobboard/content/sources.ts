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
 * Keyed by the generator's page key rather than by cause. Only earning to give
 * has one: the method page explains *this board*, which nobody else has
 * written about, but earning to give is a general idea with a long-standing
 * canonical treatment, and writing our own from scratch would be both worse and
 * a quiet claim to originality we have no business making.
 *
 * The Dutch material on that page — Amsterdam's proprietary trading firms, the
 * 30% ruling — stays ours. That is the half no international resource covers,
 * and it is the reason the page exists at all.
 */
export const PAGE_SOURCES: Record<string, readonly Source[]> = {
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
export const sourceRules = (words: readonly [number, number]) => `## Using the source material

You are given the text of the pieces this page is based on. They are reference
material, NOT copy to be reused. All three organisations reserve their rights
and two prohibit republication in their terms of service, so treat every one of
these as binding:

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
