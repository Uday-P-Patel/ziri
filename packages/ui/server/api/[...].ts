/**
 * Catch-all proxy route: forwards any /api/* request that doesn't match
 * a specific Nuxt server route to the Express proxy server.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const proxyUrl = config.public.proxyUrl || 'http://localhost:3100'

  // Reconstruct the full path from the request URL
  const path = event.path || getRequestURL(event).pathname
  const targetUrl = `${proxyUrl}${path}`

  // Forward all relevant headers
  const incomingHeaders = getHeaders(event)
  const headers: Record<string, string> = {}

  // Forward auth and content headers
  const forwardHeaders = [
    'authorization',
    'x-root-key',
    'x-project-id',
    'x-op-id',
    'x-session-id',
    'content-type',
    'accept',
  ]

  for (const key of forwardHeaders) {
    if (incomingHeaders[key]) {
      headers[key] = incomingHeaders[key] as string
    }
  }

  const method = getMethod(event)
  const fetchOptions: RequestInit = {
    method,
    headers,
  }

  // Forward body for non-GET/HEAD requests
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      const body = await readRawBody(event)
      if (body) {
        fetchOptions.body = body
      }
    } catch {
      // No body to forward
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions)

    // Set response status
    setResponseStatus(event, response.status, response.statusText)

    // Forward response headers
    const contentType = response.headers.get('content-type')
    if (contentType) {
      setResponseHeader(event, 'content-type', contentType)
    }

    // Handle SSE/streaming responses
    if (contentType?.includes('text/event-stream')) {
      setResponseHeader(event, 'cache-control', 'no-cache')
      setResponseHeader(event, 'connection', 'keep-alive')
      return sendStream(event, response.body as any)
    }

    // Return JSON or text
    if (contentType?.includes('application/json')) {
      return await response.json()
    }

    return await response.text()
  } catch (error: any) {
    throw createError({
      statusCode: 503,
      statusMessage: `Proxy server unavailable: ${error.message}`
    })
  }
})
