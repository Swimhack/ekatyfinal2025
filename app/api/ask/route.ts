import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchAskCandidates } from '@/lib/ask/inventory'
import { runAsk, type AskResult, type AskSource } from '@/lib/ask'

// POST /api/ask — "Where should we eat?" answered over the existing Katy
// directory. Returns exactly three picks when three listings clear the request,
// and an honest shortfall when they do not. Every pick is a row from our own
// `restaurants` table; nothing here can produce a restaurant, rating, menu,
// price or set of hours that is not already stored.

const MAX_QUERY_LENGTH = 500

const askRequestSchema = z.object({
  query: z.string().max(MAX_QUERY_LENGTH).optional().default(''),
  source: z.enum(['home', 'ask', 'spinner', 'api']).optional(),
  limit: z.number().int().min(1).max(10).optional(),
})

function logAskEvent(result: AskResult, durationMs: number) {
  // Single structured line so query shape, result counts and source can be
  // read off the server logs without a client-side dependency.
  console.log(
    '[ask]',
    JSON.stringify({
      source: result.meta.source,
      query: result.query,
      schema: result.schema,
      picks: result.picks.length,
      inventory_considered: result.meta.inventory_considered,
      candidates_matched: result.meta.candidates_matched,
      shortfall: result.shortfall ? result.shortfall.limiting_filters : null,
      duration_ms: durationMs,
    })
  )
}

async function handleAsk(query: string, source: AskSource, limit?: number) {
  const startedAt = Date.now()
  const { candidates, explicitChainFlags } = await fetchAskCandidates()

  const result = runAsk(query, candidates, { source, limit, explicitChainFlags })
  logAskEvent(result, Date.now() - startedAt)

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = askRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    return await handleAsk(parsed.data.query, parsed.data.source || 'ask', parsed.data.limit)
  } catch (error) {
    console.error('Error handling ask request:', error)
    return NextResponse.json({ error: 'Failed to answer ask request' }, { status: 500 })
  }
}

/** Convenience for links and shell testing: /api/ask?q=cheap+mexican+near+77493 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = (searchParams.get('q') || searchParams.get('query') || '').slice(0, MAX_QUERY_LENGTH)
    const sourceParam = searchParams.get('source')
    const source: AskSource =
      sourceParam === 'home' || sourceParam === 'spinner' || sourceParam === 'api' ? sourceParam : 'ask'

    const limitParam = Number.parseInt(searchParams.get('limit') || '', 10)
    const limit = Number.isNaN(limitParam) ? undefined : Math.min(10, Math.max(1, limitParam))

    return await handleAsk(query, source, limit)
  } catch (error) {
    console.error('Error handling ask request:', error)
    return NextResponse.json({ error: 'Failed to answer ask request' }, { status: 500 })
  }
}
