/**
 * Picking the week's roles again from James's feedback ("fewer research roles,
 * more for people starting out; keep the AIM one").
 *
 * The scored selection (./select.ts) can't take a sentence of feedback, so the
 * model reads it with the roles on screen and the rest of the eligible pool,
 * and returns the roles it would post, best first. It only chooses: every role
 * it can name already passed the selection's eligibility rules (deadline,
 * no repeats, the theme), and the code still applies the hard limits after it
 * (one per organisation, at most one funding call, at most `SELECTION.max`).
 * The soft house rules (a local role, one or two ways in, a spread of causes)
 * go to the model as defaults, so feedback like "all animal roles this week"
 * can override them.
 *
 * Feedback adds up across a week: each round sees what James said before, so
 * "and drop the PhD" doesn't undo "fewer research roles". A plain redraft or a
 * theme switch starts the week's feedback afresh.
 */

import { DRAFTING_MODEL, structuredCall } from '../lib/anthropic'
import type { ListingView } from '../sanity/queries'
import { isFundingCall, isLocal, organisationKey, SELECTION, type Pick, type Selection } from './select'
import { THEMES, type ThemeKey } from './themes'

/** How many of the pool the model sees, best scored first. */
export const POOL_SIZE = 80
/** Longest feedback the page accepts. */
export const FEEDBACK_MAX = 1000

/** Every eligible role in the week's theme, best scored first, with the current picks always in. */
export function feedbackPool(selection: Selection, current: readonly string[]): Pick[] {
  const all = [...selection.picks, ...selection.runnersUp]
  const ranked = all.sort((a, b) => b.score - a.score)
  const top = ranked.slice(0, POOL_SIZE)
  const missing = ranked.slice(POOL_SIZE).filter((p) => current.includes(p.listing.id))
  return [...top, ...missing]
}

/**
 * The model's ranking, made safe: ids it made up are dropped, then the hard
 * limits apply in its order.
 */
export function applyChoice(pool: Pick[], ranked: readonly string[]): Pick[] {
  const byId = new Map(pool.map((p) => [p.listing.id, p]))
  const picks: Pick[] = []
  const orgs = new Set<string>()
  let funding = 0
  for (const id of ranked) {
    const pick = byId.get(id)
    if (!pick || picks.includes(pick)) continue
    const org = organisationKey(pick.listing)
    const isFunding = isFundingCall(pick.listing.title)
    if (orgs.has(org) || (isFunding && funding >= SELECTION.maxFunding)) continue
    picks.push(pick)
    orgs.add(org)
    if (isFunding) funding++
    if (picks.length >= SELECTION.max) break
  }
  return picks
}

const BAND = { vetted: 'vetted organisation', routes: 'way in', dutch: 'Dutch institution' } as const

function describe(pick: Pick, current: boolean): Record<string, unknown> {
  const l: ListingView = pick.listing
  const summary = (l.excerptEn ?? l.excerpt ?? '').replace(/\s+/g, ' ').trim()
  return {
    id: l.id,
    title: l.title,
    organisation: l.employer?.name ?? null,
    cause: l.primaryCause,
    band: BAND[pick.band],
    seniority: l.seniority,
    location: [l.locationCity, l.locationMode].filter(Boolean).join(', ') || null,
    localToNetherlands: isLocal(l),
    fundingCall: isFundingCall(l.title),
    deadline: l.deadlineAt?.slice(0, 10) ?? null,
    posted: l.postedAt?.slice(0, 10) ?? null,
    summary: summary.length > 240 ? `${summary.slice(0, 237)}…` : summary || null,
    inCurrentDraft: current,
  }
}

const SYSTEM = `You choose the roles for EA Netherlands' weekly jobs carousel (Instagram and LinkedIn), from a pool of roles that have already passed the eligibility rules. James, who runs the account, has looked at this week's draft and given feedback. Your job is to pick the roles that best follow his feedback.

House rules, which apply unless James's feedback says otherwise:
- ${SELECTION.min} to ${SELECTION.max} roles; aim for ${SELECTION.max}.
- At least one role done in the Netherlands (localToNetherlands: true) when the pool has one.
- One or two "way in" roles (internships, traineeships, paid programmes) for people starting out.
- A spread of causes and organisations: one role per organisation.
- At most one funding call.
- Otherwise prefer roles from vetted organisations, posted recently or closing soon.

James's feedback wins over the house rules where they conflict. If he names a role to keep or drop, do that. Keep roles from the current draft that his feedback doesn't argue against, unless better ones fit what he asked for.

Return the ids of the roles to post, best first (the first is the lead slide), and up to ${SELECTION.max + 3} so a few spares cover any that turn out to clash. Use only ids from the pool. Also write a short note to James (one or two plain sentences, second person) saying what you changed and why, for example: "I swapped three research roles for two traineeships and a policy role, and kept the AIM role you asked for." If the pool can't give him what he asked for, say so in the note.`

const SCHEMA = {
  type: 'object',
  properties: {
    ids: { type: 'array', items: { type: 'string' } },
    note: { type: 'string' },
  },
  required: ['ids', 'note'],
  additionalProperties: false,
}

/** Asks the model for the week's roles given James's feedback; returns the picks (limits applied) and its note. */
export async function chooseWithFeedback(args: {
  pool: Pick[]
  current: readonly string[]
  /** Everything said this week, oldest first; the last is the new feedback. */
  feedback: readonly string[]
  theme: ThemeKey
}): Promise<{ picks: Pick[]; note: string }> {
  const theme = THEMES[args.theme]
  const currentSet = new Set(args.current)
  const draft = args.current
    .map((id) => args.pool.find((p) => p.listing.id === id))
    .filter((p): p is Pick => Boolean(p))
  const user = [
    `This week's theme: ${theme.label}.`,
    '',
    'The current draft, in slide order:',
    JSON.stringify(draft.map((p) => describe(p, true)), null, 1),
    '',
    args.feedback.length > 1
      ? `James's earlier feedback this week, still in force:\n${args.feedback
          .slice(0, -1)
          .map((f) => `- ${f}`)
          .join('\n')}\n`
      : '',
    `James's feedback now:\n${args.feedback[args.feedback.length - 1]}`,
    '',
    `The pool (${args.pool.length} eligible roles, best scored first):`,
    JSON.stringify(args.pool.map((p) => describe(p, currentSet.has(p.listing.id))), null, 1),
  ].join('\n')

  const { value } = await structuredCall<{ ids: string[]; note: string }>({
    model: DRAFTING_MODEL,
    system: SYSTEM,
    user,
    schema: SCHEMA,
    maxTokens: 8000,
  })
  return { picks: applyChoice(args.pool, value.ids), note: value.note.trim() }
}
