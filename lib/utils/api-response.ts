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
  fallback = 'Request failed'
): string {
  if (serverError) return serverError

  switch (status) {
    case 401:
    case 403:
      return 'Your session has expired — please sign in again and retry.'
    case 413:
      return 'File too large — the server rejected the upload. Try an image under 5MB.'
    case 501:
      return 'Uploads are not configured on this server (cloud storage missing).'
    case 502:
    case 503:
    case 504:
      return `Server unavailable (HTTP ${status}). Please try again in a moment.`
  }

  const snippet = summarizeResponseBody(rawBody)
  return snippet ? `${fallback} (HTTP ${status}): ${snippet}` : `${fallback} (HTTP ${status})`
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

  let data: T | null = null
  if (rawBody.trim()) {
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
      error: `Unexpected non-JSON response from server: ${
        summarizeResponseBody(rawBody) || 'empty body'
      }`,
      rawBody,
    }
  }

  return {
    ok: false,
    status: response.status,
    data,
    error: httpErrorMessage(response.status, serverError, rawBody, fallback),
    rawBody,
  }
}
