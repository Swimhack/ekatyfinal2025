import type { ParsedQuery, PriceLevel } from './parse-query'

/**
 * Last-resort query interpretation for searches the rule-based parser can't place.
 *
 * This is deliberately NOT in the hot path. The deterministic parser in
 * parse-query.ts answers essentially every real query instantly and for free; the
 * model is only consulted when that parser produced no usable filter or the search
 * returned nothing, which is where a human phrasing like "somewhere nice for an
 * anniversary" actually needs interpreting. Everything here fails open: any error,
 * timeout, or missing key leaves the original results untouched.
 */

/**
 * Tags that exist in the restaurant rows. The model is given this list and its
 * answer is intersected with it, because an unconstrained model invents plausible
 * categories ("fine dining", "romantic") that match nothing in the data, and will
 * happily supply a ZIP nobody asked for.
 */
const ALLOWED_TAGS = [
  'American', 'Asian', 'BBQ', 'Bakery', 'Bar', 'Bar & Grill', 'Breakfast',
  'Burger', 'Cafe', 'Cajun', 'Chicken', 'Chinese', 'Coffee', 'Deli', 'Dessert',
  'Donut', 'Fast Food', 'Greek', 'Healthy', 'Ice Cream', 'Indian', 'Italian',
  'Japanese', 'Korean', 'Mediterranean', 'Mexican', 'Nightlife', 'Noodle',
  'Pho', 'Pizza', 'Sandwich', 'Seafood', 'Smoothie', 'Southern', 'Steakhouse',
  'Sushi', 'Taco', 'Taqueria', 'Tea', 'Tex-Mex', 'Thai', 'Vegan', 'Vegetarian',
  'Vietnamese', 'Wings',
]

const PRICE_LEVELS: PriceLevel[] = ['BUDGET', 'MODERATE', 'UPSCALE', 'PREMIUM']

const SYSTEM_PROMPT = `You map a diner's search phrase onto a restaurant directory for Katy, Texas.

Reply with JSON only, no prose:
{"cuisines":[],"priceLevel":null,"openNow":false}

Rules:
- "cuisines" may ONLY contain values from this list: ${ALLOWED_TAGS.join(', ')}
- Pick at most 4, ordered by how well they fit. Use [] if nothing fits.
- "priceLevel" is one of BUDGET, MODERATE, UPSCALE, PREMIUM, or null.
- "openNow" is true only if the phrase asks for somewhere open right now.
- Never invent a ZIP code, address, or restaurant name.`

interface LlmConfig {
  baseUrl: string
  model: string
  apiKey: string
}

function readConfig(): LlmConfig | null {
  const apiKey = process.env.SEARCH_LLM_API_KEY || process.env.GROQ_API_KEY
  if (!apiKey) return null
  return {
    apiKey,
    baseUrl: process.env.SEARCH_LLM_BASE_URL || 'https://api.groq.com/openai/v1',
    model: process.env.SEARCH_LLM_MODEL || 'llama-3.1-8b-instant',
  }
}

export function isLlmSearchEnabled(): boolean {
  return process.env.SEARCH_LLM_ENABLED !== 'false' && readConfig() !== null
}

/**
 * Interpretations are cached by phrase because the same handful of odd queries
 * tend to recur, and a zero-result search should never pay for the same call
 * twice. Bounded so a scripted crawl can't grow it without limit.
 */
const cache = new Map<string, Partial<ParsedQuery> | null>()
const CACHE_LIMIT = 500

export async function llmInterpret(raw: string): Promise<Partial<ParsedQuery> | null> {
  const key = raw.trim().toLowerCase()
  if (!key || key.length > 120) return null
  if (cache.has(key)) return cache.get(key)!

  const config = readConfig()
  if (!config) return null

  const controller = new AbortController()
  // A search box that waits on a model has already lost; give up and keep the
  // deterministic results rather than stalling the response.
  const timeout = setTimeout(() => controller.abort(), 1500)

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        max_tokens: 120,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: raw.slice(0, 120) },
        ],
      }),
    })

    if (!response.ok) return remember(key, null)

    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content
    if (!content) return remember(key, null)

    const parsed = JSON.parse(content)

    // Only tags that genuinely exist in the data survive.
    const allowed = new Set(ALLOWED_TAGS.map((t) => t.toLowerCase()))
    const cuisines: string[] = Array.isArray(parsed.cuisines)
      ? parsed.cuisines
          .filter((c: unknown) => typeof c === 'string' && allowed.has(c.toLowerCase()))
          .map((c: string) => ALLOWED_TAGS.find((t) => t.toLowerCase() === c.toLowerCase())!)
          .slice(0, 4)
      : []

    const priceLevel: PriceLevel | undefined = PRICE_LEVELS.includes(parsed.priceLevel)
      ? parsed.priceLevel
      : undefined

    if (!cuisines.length && !priceLevel) return remember(key, null)

    return remember(key, {
      cuisines,
      priceLevel,
      openNow: parsed.openNow === true,
    })
  } catch {
    // Aborted, unreachable, or unparseable — the caller keeps what it had.
    return remember(key, null)
  } finally {
    clearTimeout(timeout)
  }
}

function remember(key: string, value: Partial<ParsedQuery> | null) {
  if (cache.size >= CACHE_LIMIT) cache.clear()
  cache.set(key, value)
  return value
}
