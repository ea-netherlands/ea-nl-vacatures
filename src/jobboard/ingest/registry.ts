/**
 * Adapter registry. `source.adapter` in Postgres is matched against these ids.
 */

import { ATS_ADAPTERS } from './adapters/ats'
import { DUTCH_ADAPTERS } from './adapters/dutch'
import { EA_BOARD_ADAPTERS } from './adapters/ea-boards'
import { jsonldCareers } from './adapters/jsonld'
import type { SourceAdapter } from './types'

export const ADAPTERS: SourceAdapter[] = [
  ...ATS_ADAPTERS,
  ...DUTCH_ADAPTERS,
  ...EA_BOARD_ADAPTERS,
  jsonldCareers,
]

const BY_ID = new Map(ADAPTERS.map((a) => [a.id, a]))

export function getAdapter(id: string): SourceAdapter {
  const adapter = BY_ID.get(id)
  if (!adapter) {
    throw new Error(
      `unknown adapter "${id}". Known adapters: ${[...BY_ID.keys()].sort().join(', ')}`,
    )
  }
  return adapter
}

/**
 * Adds an adapter at runtime. For tests, which drive the real runner against a
 * scripted source, and for one-off probes — production adapters are listed
 * above so a deploy never depends on registration order.
 */
export function registerAdapter(adapter: SourceAdapter): void {
  BY_ID.set(adapter.id, adapter)
}

export function adapterIds(): string[] {
  return [...BY_ID.keys()].sort()
}
