/**
 * The track each Instagram carousel gets (James, 11 Nov 2026).
 *
 * Instagram's publishing API can't put music on a carousel, but the app lets
 * you add a track to a carousel after it's posted, and both tracks are in EA
 * Nederland's business-account library. So the code posts the carousel and
 * then mails James the link and the track to add by hand.
 */

import { isMailConfigured, sendMail } from '../lib/mail'

export type Track = { title: string; artist: string }

export const TRACKS = {
  jobs: { title: 'Feel Good Inc.', artist: 'Gorillaz' },
  forum: { title: 'The Times They Are A-Changin’', artist: 'Bob Dylan' },
} as const satisfies Record<string, Track>

/** The jobs post's track, or the explainer's: only explainers adapted from the Forum have one. */
export function trackFor(post: { kind: 'jobs' } | { kind: 'explainer'; sourceKind: 'forum' | 'instagram' }): Track | null {
  if (post.kind === 'jobs') return TRACKS.jobs
  return post.sourceKind === 'forum' ? TRACKS.forum : null
}

export const trackLabel = (t: Track) => `“${t.title}” by ${t.artist}`

export function musicReminderText(what: string, url: string | null, track: Track): string {
  return [
    `${what} is up on EA Netherlands' Instagram${url ? `: ${url}` : '.'}`,
    '',
    `Add ${trackLabel(track)} to it in the Instagram app: open the post, tap the three dots, Edit, then add music and search for “${track.title}”.`,
    '',
    'Instagram’s API can’t add music, so this one is by hand.',
  ].join('\n')
}

/** Mails the reminder; never throws, so a mail problem can't undo a successful post. */
export async function sendMusicReminder(to: string[], what: string, url: string | null, track: Track) {
  if (!to.length || !isMailConfigured()) return false
  try {
    await sendMail({ to, subject: `Add music to ${what.charAt(0).toLowerCase()}${what.slice(1)} on Instagram`, text: musicReminderText(what, url, track) })
    return true
  } catch (err) {
    console.error('[social:music]', err)
    return false
  }
}
