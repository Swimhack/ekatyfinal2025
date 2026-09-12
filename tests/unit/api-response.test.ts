import {
  httpErrorMessage,
  looksLikeHtml,
  parseJsonResponse,
  readJson,
  summarizeResponseBody,
} from '../../lib/utils/api-response'

const NGINX_413 =
  '<html>\r\n<head><title>413 Request Entity Too Large</title></head>\r\n<body>\r\n<center><h1>413 Request Entity Too Large</h1></center>\r\n<hr><center>nginx</center>\r\n</body>\r\n</html>'

function makeResponse(
  body: string,
  init: { status?: number; ok?: boolean; contentType?: string } = {}
): Response {
  const status = init.status ?? 200
  return {
    ok: init.ok ?? (status >= 200 && status < 300),
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? init.contentType ?? null : null) },
    text: async () => body,
  } as unknown as Response
}

describe('looksLikeHtml', () => {
  it('detects markup bodies and html content types', () => {
    expect(looksLikeHtml(NGINX_413)).toBe(true)
    expect(looksLikeHtml('<!DOCTYPE html><html></html>')).toBe(true)
    expect(looksLikeHtml('{"error":"nope"}')).toBe(false)
    expect(looksLikeHtml('anything', 'text/html; charset=utf-8')).toBe(true)
  })
})

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
    expect(httpErrorMessage(404, null)).toMatch(/no endpoint/i)
    expect(httpErrorMessage(501, null)).toMatch(/not configured/i)
    expect(httpErrorMessage(502, null)).toMatch(/unavailable/i)
  })

  it('describes an HTML error page instead of quoting markup', () => {
    const message = httpErrorMessage(500, null, NGINX_413, 'Failed to upload hero image')

    expect(message).toMatch(/error page/i)
    expect(message).toMatch(/under 5MB/i)
    expect(message).not.toContain('<')
  })

  it('falls back to a sanitized body snippet for non-HTML bodies', () => {
    expect(httpErrorMessage(500, null, 'Boom: disk is full', 'Upload failed')).toBe(
      'Upload failed (HTTP 500): Boom: disk is full'
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

  it('flags a 200 response that is neither JSON nor HTML', async () => {
    const parsed = await parseJsonResponse(makeResponse('OK'))

    expect(parsed.ok).toBe(false)
    expect(parsed.error).toMatch(/non-JSON/i)
  })

  it('turns an nginx 413 HTML page into an upload-size message', async () => {
    const parsed = await parseJsonResponse(
      makeResponse(NGINX_413, { status: 413, contentType: 'text/html' }),
      'Failed to upload hero image'
    )

    expect(parsed.ok).toBe(false)
    expect(parsed.error).toMatch(/upload too large/i)
    expect(parsed.error).not.toContain('<')
  })

  it('does not report an HTML 200 body as data', async () => {
    const parsed = await parseJsonResponse(
      makeResponse('<!DOCTYPE html><html><body>sign in</body></html>', {
        status: 200,
        contentType: 'text/html; charset=utf-8',
      })
    )

    expect(parsed.ok).toBe(false)
    expect(parsed.data).toBeNull()
    expect(parsed.error).toMatch(/web page instead of data/i)
  })

  it('handles an empty body without throwing', async () => {
    const parsed = await parseJsonResponse(makeResponse('', { status: 413 }))

    expect(parsed.ok).toBe(false)
    expect(parsed.error).toMatch(/too large/i)
  })
})

describe('readJson', () => {
  it('returns the payload for JSON responses, including error payloads', async () => {
    await expect(readJson(makeResponse(JSON.stringify({ articles: [] })))).resolves.toEqual({
      articles: [],
    })

    // Error bodies are returned, not thrown, so callers keep their own ok checks
    await expect(
      readJson(makeResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))
    ).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('throws a human message instead of a SyntaxError on HTML', async () => {
    await expect(
      readJson(makeResponse(NGINX_413, { status: 413, contentType: 'text/html' }))
    ).rejects.toThrow(/upload too large/i)

    await expect(readJson(makeResponse('<html><body>502</body></html>', { status: 502 })))
      .rejects.toThrow(/unavailable/i)
  })
})
