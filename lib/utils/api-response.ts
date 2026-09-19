/**
 * Helpers for reading fetch responses that are *supposed* to be JSON.
 *
 * Proxies (nginx 413, 502) and framework error pages answer with HTML, so
 * calling `response.json()` directly turns a useful server message into an
 * unrelated "Unexpected token '<'" SyntaxError.
 */

export interface ParsedResponse<T> {
  ok: boolean
  status: number
  data: T | null
  /** Human-readable message, only set when the request failed. */
  error: string | null
  rawBody: string
}

const BODY_SNIPPET_LENGTH = 180

/** nginx 413/502 pages and Next error pages answer with HTML, not JSON. */
export function looksLikeHtml(body: string, contentType?: string | null): boolean {
  if (contentType && /^\s*text\/html/i.test(contentType)) return true
  return /^\s*(<!doctype|<html|<\?xml|<)/i.test(body)
}

export function summarizeResponseBody(body: string, maxLength = BODY_SNIPPET_LENGTH): string {
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trimEnd()}…`
}

export function httpErrorMessage(
  status: number,
  serverError: string | null,
  rawBody = '',
  fallback = 'Request failed',
  contentType?: string | null
): string {
  if (serverError) return serverError

  switch (status) {
    case 401:
    case 403:
      return 'Your session has expired — please sign in again and retry.'
    case 404:
      return `Not found (HTTP 404) — the server has no endpoint at this address. ${fallback}.`
    case 413:
      return 'Upload too large (server limit) — try an image under 5MB.'
    case 501:
      return 'Uploads are not configured on this server (cloud storage missing).'
    case 502:
    case 503:
    case 504:
      return `Server unavailable (HTTP ${status}). Please try again in a moment.`
  }

  // An HTML body means a proxy or error page answered, not the API. Raw markup
  // is useless to the person reading the message, so describe it instead.
  if (looksLikeHtml(rawBody, contentType)) {
    return `${fallback}: the server returned an error page (HTTP ${status}) instead of data. This is usually an upload size limit or a server error — try an image under 5MB.`
  }

  const snippet = summarizeResponseBody(rawBody)
  return snippet ? `${fallback} (HTTP ${status}): ${snippet}` : `${fallback} (HTTP ${status})`
}

/**
 * Drop-in replacement for `response.json()` that throws a human-readable Error
 * instead of a `SyntaxError` when the body is an HTML error page. Use it where
 * the caller already has a try/catch and only needs the message to make sense.
 */
export async function readJson<T = any>(
  response: Response,
  fallback = 'Request failed'
): Promise<T> {
  const parsed = await parseJsonResponse<T>(response, fallback)

  if (parsed.data === null) {
    throw new Error(parsed.error || fallback)
  }

  // Error payloads are returned rather than thrown, so callers can keep doing
  // their own `response.ok` checks and read `data.error` as before.
  return parsed.data
}

/**
 * Reads a response body once and parses it as JSON without ever throwing a
 * SyntaxError at the caller.
 */
export async function parseJsonResponse<T = any>(
  response: Response,
  fallback = 'Request failed'
): Promise<ParsedResponse<T>> {
  let rawBody = ''
  try {
    rawBody = await response.text()
  } catch (error) {
    console.error('Failed to read response body:', error)
  }

  const contentType = typeof response.headers?.get === 'function'
    ? response.headers.get('content-type')
    : null

  let data: T | null = null
  if (rawBody.trim() && !looksLikeHtml(rawBody, contentType)) {
    try {
      data = JSON.parse(rawBody) as T
    } catch {
      data = null
    }
  }

  const serverError =
    data && typeof data === 'object' && typeof (data as any).error === 'string'
      ? ((data as any).error as string)
      : null

  if (response.ok && data !== null) {
    return { ok: true, status: response.status, data, error: null, rawBody }
  }

  if (response.ok) {
    return {
      ok: false,
      status: response.status,
      data: null,
      error: looksLikeHtml(rawBody, contentType)
        ? `${fallback}: the server returned a web page instead of data (HTTP ${response.status}). You may need to sign in again.`
        : `Unexpected non-JSON response from server: ${
            summarizeResponseBody(rawBody) || 'empty body'
          }`,
      rawBody,
    }
  }

  return {
    ok: false,
    status: response.status,
    data,
    error: httpErrorMessage(response.status, serverError, rawBody, fallback, contentType),
    rawBody,
  }
}
