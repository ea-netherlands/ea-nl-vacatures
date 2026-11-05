/**
 * Where a listing will show up on the board, explained for the curator.
 *
 * The dashboard used to show the classifier's labels as a row of badges, which
 * says what the labels are but not what they do: that "career capital" moves a
 * role out of its organisation's band into "Ways in", or that a secondary
 * cause puts it on a second problem page. This turns the same fields into the
 * places a reader would actually find the role, each with the reason it lands
 * there and a link to that view of the live board.
 *
 * Pure and import-light on purpose: the dashboard's client component recomputes
 * it as the curator changes a field, so the explanation follows the edit.
 */

import { routes, t } from '../content/i18n'
import { automaticBand, bandOf, TRAINEESHIP, type Band } from '../lib/bands'
import type {
  CauseArea,
  LanguageRequirement,
  LeverageType,
  ListingKind,
  LocationMode,
  Seniority,
  Skill,
  SubArea,
} from '../taxonomy'

/** The fields that decide where a listing appears. */
export type ListingPlacement = {
  listingKind: ListingKind | null
  primaryCause: CauseArea | null
  secondaryCauses: CauseArea[]
  subArea: SubArea | null
  skills: Skill[]
  leverage: LeverageType | null
  /** The curator's override of the band; null lets the rules decide. */
  section: Band | null
  /** 80,000 Hours, Probably Good or EA Opportunities lists the role. */
  listedByEaBoard?: boolean | null
  locationMode: LocationMode | null
  languageRequirement: LanguageRequirement | null
  seniority: Seniority | null
}

export type PlacementRow = {
  /** Which part of the board: "Section", "Problem area", … */
  where: string
  /** What it will say there. */
  value: string
  /** Why, when it is not obvious from the value. */
  why?: string
  /** The live board filtered to this view, so the curator can see the company it keeps. */
  href?: string
}

const en = t('en')

function bandReason(title: string, p: ListingPlacement): string {
  if (p.section) {
    const auto = automaticBand({ title, ...p })
    return auto === p.section
      ? 'Set by hand, and the rules would put it here too.'
      : `Set by hand. The rules would put it in "${en.bandLabels[auto]}".`
  }
  if (p.listingKind === 'programme') return 'It is a programme (fellowship, residency or bootcamp), and every programme is a way in.'
  if (p.seniority === 'internship') return 'It is an internship, and internships are always a way in.'
  if (p.leverage === 'career-capital') return 'Its leverage is "career capital", which files it as a way in.'
  if (TRAINEESHIP.test(title)) return 'The title names a traineeship.'
  if (p.leverage === 'trusted-recommendation')
    return 'Its leverage is "recommended by an evaluator": the employer has been vetted by an evaluator or an EA funder.'
  if (p.listedByEaBoard)
    return '80,000 Hours, Probably Good or EA Opportunities lists it, so the organisation counts as vetted.'
  return 'Not a way in, no EA board lists it, and the employer is not marked as vetted, so it goes in the Dutch-leverage band.'
}

/**
 * @param origin where the public board lives, for the links. The dashboard
 *   runs on the board's own host, which does not serve the public pages.
 */
export function explainPlacement(
  title: string,
  p: ListingPlacement,
  employer: { name: string; slug: string | null } | null,
  origin: string,
): PlacementRow[] {
  const r = routes('en')
  const link = (query: string) => `${origin}${r.index}?${query}`
  const rows: PlacementRow[] = []

  if (p.leverage === 'earning-to-give') {
    rows.push({
      where: 'Section',
      value: en.e2gTitle,
      why: 'Its leverage is "earning to give", so it skips the main list and appears only on the earning-to-give page.',
      href: `${origin}${r.earningToGive}`,
    })
  } else {
    const band = bandOf({ title, ...p })
    rows.push({
      where: 'Section',
      value: en.bandLabels[band],
      why: bandReason(title, p),
      href: link(`band=${band}`),
    })
  }

  if (p.primaryCause) {
    const sub = p.subArea ? en.subAreas[p.subArea] : null
    rows.push({
      where: 'Problem area',
      value: sub ? `${en.causeAreas[p.primaryCause]} › ${sub}` : en.causeAreas[p.primaryCause],
      why: sub ? undefined : 'No sub-area, so it shows under the problem area but under none of its topics.',
      href: link(p.subArea ? `subarea=${p.subArea}` : `cause=${p.primaryCause}`),
    })
  } else {
    rows.push({
      where: 'Problem area',
      value: 'None',
      why: 'It will not appear under any problem area.',
    })
  }
  for (const c of p.secondaryCauses.filter((c) => c !== p.primaryCause)) {
    rows.push({
      where: 'Also under',
      value: en.causeAreas[c],
      why: 'A secondary problem area: it shows in that list too, but not under any of its topics.',
      href: link(`cause=${c}`),
    })
  }

  rows.push({
    where: 'Skills',
    value: p.skills.length ? p.skills.map((s) => en.skills[s]).join(', ') : 'None',
    why: p.skills.length ? undefined : 'It will not appear when someone browses by skill.',
    href: p.skills[0] ? link(`skill=${p.skills[0]}`) : undefined,
  })

  if (p.locationMode) {
    rows.push({ where: 'Location', value: en.locationModes[p.locationMode], href: link(`location=${p.locationMode}`) })
  }
  if (p.languageRequirement) {
    rows.push({
      where: 'Language',
      value: en.languageRequirements[p.languageRequirement],
      href: link(`language=${p.languageRequirement}`),
    })
  }
  if (p.seniority) {
    rows.push({ where: 'Seniority', value: en.seniorities[p.seniority], href: link(`seniority=${p.seniority}`) })
  }
  if (employer) {
    rows.push({
      where: 'Organisation page',
      value: employer.name,
      href: employer.slug ? `${origin}${r.employer(employer.slug)}` : undefined,
    })
  }
  return rows
}
