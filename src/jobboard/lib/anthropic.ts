/**
 * Anthropic client and the model split.
 *
 * Spec §8.4 sets the cost strategy explicitly, and it is deliberate rather
 * than a default worth second-guessing:
 *
 *   • Stage-two triage runs over a few thousand listings a week, so it uses a
 *     small fast model.
 *   • Drafting `whyThisMattersNl` runs only on the much smaller set that
 *     passes the promotion threshold, so it uses the strongest model.
 *   • Explainer prose uses the strongest model regardless of the economics:
 *     that is roughly ten pages generated once, so the cost is a rounding
 *     error, and it is the content where weak Dutch does the most damage.
 *     "Do not let the cheap-model default for classification leak into prose
 *     generation."
 *
 * All three are env-overridable so the split can be re-tuned after the M3
 * calibration pass without touching code.
 */

import Anthropic from '@anthropic-ai/sdk'

export const TRIAGE_MODEL = process.env.TRIAGE_MODEL ?? 'claude-haiku-4-5'
export const DRAFTING_MODEL = process.env.DRAFTING_MODEL ?? 'claude-opus-5'
export const PROSE_MODEL = process.env.PROSE_MODEL ?? 'claude-opus-5'

let client: Anthropic | null = null

export function anthropic(): Anthropic {
  // A bare constructor resolves ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, or an
  // `ant auth login` profile, in that order.
  client ??= new Anthropic()
  return client
}

/**
 * Model-specific request shaping. The current models take adaptive thinking
 * and an effort level; Haiku 4.5 accepts neither and errors on `effort`, so
 * the triage path must not send them.
 */
export function modelTuning(model: string): {
  thinking?: { type: 'adaptive'; display?: 'summarized' | 'omitted' }
  output_config?: { effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max' }
} {
  if (/haiku/.test(model)) return {}
  return {
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' },
  }
}

/**
 * Calls the model with a JSON-schema-constrained response and returns the
 * parsed object. `output_config.format` guarantees the first text block is
 * valid JSON matching the schema, so no repair loop or prefill is needed.
 */
export async function structuredCall<T>(args: {
  model: string
  system: string
  user: string
  schema: Record<string, unknown>
  maxTokens?: number
  /** Cache the system prompt — it is identical across every listing in a run. */
  cacheSystem?: boolean
}): Promise<{ value: T; usage: { input: number; output: number; cacheRead: number } }> {
  const tuning = modelTuning(args.model)
  const res = await anthropic().messages.create({
    model: args.model,
    max_tokens: args.maxTokens ?? 4096,
    system: args.cacheSystem
      ? [{ type: 'text', text: args.system, cache_control: { type: 'ephemeral' } }]
      : args.system,
    messages: [{ role: 'user', content: args.user }],
    output_config: {
      ...tuning.output_config,
      format: { type: 'json_schema', schema: args.schema },
    },
    ...(tuning.thinking ? { thinking: tuning.thinking } : {}),
  })

  if (res.stop_reason === 'refusal') {
    throw new Error(
      `model declined the request (${res.stop_details?.category ?? 'unknown category'})`,
    )
  }
  if (res.stop_reason === 'max_tokens') {
    throw new Error('response hit max_tokens; raise maxTokens for this call')
  }

  const text = res.content.find((b) => b.type === 'text')
  if (!text || text.type !== 'text') throw new Error('no text block in response')

  return {
    value: JSON.parse(text.text) as T,
    usage: {
      input: res.usage.input_tokens,
      output: res.usage.output_tokens,
      cacheRead: res.usage.cache_read_input_tokens ?? 0,
    },
  }
}

/** Plain prose call, for the explainer generator and the anti-translationese pass. */
export async function proseCall(args: {
  model?: string
  system: string
  user: string
  maxTokens?: number
}): Promise<string> {
  const model = args.model ?? PROSE_MODEL
  const tuning = modelTuning(model)
  // Streaming keeps a long generation from hitting the request timeout.
  const stream = anthropic().messages.stream({
    model,
    max_tokens: args.maxTokens ?? 16_000,
    system: args.system,
    messages: [{ role: 'user', content: args.user }],
    ...tuning,
  })
  const res = await stream.finalMessage()
  if (res.stop_reason === 'refusal') {
    throw new Error(`model declined the request (${res.stop_details?.category ?? 'unknown'})`)
  }
  return res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('')
    .trim()
}
