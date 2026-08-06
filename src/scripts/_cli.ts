/**
 * Shared CLI helpers. Keeps every script's argument handling identical.
 */

export type Args = { flags: Set<string>; values: Map<string, string>; positional: string[] }

export function parseArgs(argv = process.argv.slice(2)): Args {
  const flags = new Set<string>()
  const values = new Map<string, string>()
  const positional: string[] = []
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      if (value === undefined) flags.add(key)
      else values.set(key, value)
    } else {
      positional.push(arg)
    }
  }
  return { flags, values, positional }
}

export function num(args: Args, key: string, fallback: number): number {
  const raw = args.values.get(key)
  const parsed = raw === undefined ? NaN : Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const log = (line: string) => console.log(line)

/** Prints a report as aligned key/value lines rather than raw JSON. */
export function printReport(title: string, report: Record<string, unknown>): void {
  console.log(`\n${title}`)
  console.log('─'.repeat(title.length))
  for (const [key, value] of Object.entries(report)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      console.log(`${key}:`)
      for (const item of value.slice(0, 20)) {
        console.log(`  ${typeof item === 'object' ? JSON.stringify(item) : String(item)}`)
      }
      if (value.length > 20) console.log(`  … and ${value.length - 20} more`)
      continue
    }
    if (typeof value === 'object') {
      console.log(`${key}: ${JSON.stringify(value)}`)
      continue
    }
    console.log(`${key.padEnd(24)} ${String(value)}`)
  }
  console.log('')
}

export async function main(fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
    process.exit(0)
  } catch (err) {
    console.error(`\n${(err as Error).stack ?? String(err)}\n`)
    process.exit(1)
  }
}
