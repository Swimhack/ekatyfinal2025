import {
  httpErrorMessage,
  parseJsonResponse,
  summarizeResponseBody,
} from '../../lib/utils/api-response'

function makeResponse(body: string, init: { status?: number; ok?: boolean } = {}): Response {
  const status = init.status ?? 200
  return {
    ok: init.ok ?? (status >= 200 && status < 300),
    status,
    text: async () => body,
  } as unknown as Response
}

describe('summarizeResponseBody', () => {
  it('strips HTML markup and collapses whitespace', () => {
    const html = '<html><head><style>body{}</style></head><body><h1>413 Request Entity Too Large</h1>\n<hr><center>nginx</center></body></html>'
    expect(summarizeResponseBody(html)).toBe('413 Request Entity Too Large nginx')
  })

  it('truncates long bodies', () => {
    expect(summarizeResponseBody('x'.repeat(500), 10)).toBe(`${'x'.repeat(10)}…`)
  })
})

describe('httpErrorMessage', () => {
  it('prefers the server-provided error string', () => {
    expect(httpErrorMessage(501, 'Cloud storage not configured')).toBe('Cloud storage not configured')
  })

  it('explains auth, size and configuration failures', () => {
    expect(httpErrorMessage(401, null)).toMatch(/sign in again/i)
    expect(httpErrorMessage(413, null)).toMatch(/too large/i)
    expect(httpErrorMessage(501, null)).toMatch(/not configured/i)
    expect(httpErrorMessage(502, null)).toMatch(/unavailable/i)
  })

  it('falls back to a sanitized body snippet', () => {
    expect(httpErrorMessage(500, null, '<html><body>Boom</body></html>', 'Upload failed')).toBe(
      'Upload failed (HTTP 500): Boom'
    )
  })
})

describe('parseJsonResponse', () => {
  it('returns parsed data for successful JSON responses', async () => {
    const parsed = await parseJsonResponse<{ url: string }>(
      makeResponse(JSON.stringify({ success: true, url: '/uploads/restaurants/hero-1.jpg' }))
    )

    expect(parsed.ok).toBe(true)
    expect(parsed.error).toBeNull()
    expect(parsed.data?.url).toBe('/uploads/restaurants/hero-1.jpg')
  })

  it('never throws a SyntaxError on an HTML error page', async () => {
    const parsed = await parseJsonResponse(
      makeResponse('<html><body><h1>502 Bad Gateway</h1></body></html>', { status: 502 }),
      'Failed to upload hero image'
    )

    expect(parsed.ok).toBe(false)
    expect(parsed.status).toBe(502)
    expect(parsed.error).toMatch(/unavailable/i)
  })

  it('surfaces the server error message from a JSON error body', async () => {
    const parsed = await parseJsonResponse(
      makeResponse(JSON.stringify({ error: 'File size must be less than 5MB' }), { status: 400 })
    )

    expect(parsed.error).toBe('File size must be less than 5MB')
  })

  it('flags a 200 response that is not JSON', async () => {
    const parsed = await parseJsonResponse(makeResponse('<!DOCTYPE html><p>login</p>'))

    expect(parsed.ok).toBe(false)
    expect(parsed.error).toMatch(/non-JSON/i)
  })

  it('handles an empty body without throwing', async () => {
    const parsed = await parseJsonResponse(makeResponse('', { status: 413 }))

    expect(parsed.ok).toBe(false)
    expect(parsed.error).toMatch(/too large/i)
  })
})
