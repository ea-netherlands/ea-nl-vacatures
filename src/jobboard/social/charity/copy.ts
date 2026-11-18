/**
 * What every charity deep dive says the same way: what Doneer Effectief is,
 * and the three things a reader can do next. Shared by the slides and the
 * captions so they never drift apart.
 *
 * "Doneer Effectief" is a name and is never translated. The pledge always
 * links to EA Nederland's partner page, so pledges made through it are
 * credited to EA Nederland (James, 2 Nov 2026).
 */

export const DONEER_EFFECTIEF = 'Doneer Effectief'
export const DE_SITE = 'doneereffectief.nl'

/** "GiveWell’s", "Animal Charity Evaluators’". */
export const possessive = (name: string) => (/s$/i.test(name) ? `${name}’` : `${name}’s`)
export const DE_TOP_CHARITIES = 'https://doneereffectief.nl/toporganisaties/'

export const DE_ABOUT =
  'Doneer Effectief is the Dutch giving platform for charities that independent evaluators have found to do an unusual amount of good per euro. Each week we take one of its top charities and walk through the research behind it.'

export const PLEDGE_URL = 'https://www.givingwhatwecan.org/pledge/ea-netherlands'
/** As it is printed on a slide, where nobody can click. */
export const PLEDGE_SHOWN = 'givingwhatwecan.org/pledge/ea-netherlands'

export const PLEDGE_PITCH =
  'Want to make giving a habit? Giving What We Can’s 10% Pledge is a public commitment to give a tenth of your income to effective charities. You can also start smaller, with a trial pledge.'
