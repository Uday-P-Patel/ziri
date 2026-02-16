import { ERROR_MESSAGES } from '~/config/error-messages'

type AnyError = {
  message?: string
  statusMessage?: string
  error?: unknown
  data?: {
    error?: unknown
    message?: string
    statusMessage?: string
    code?: string
  }
  response?: {
    data?: {
      error?: unknown
      message?: string
      statusMessage?: string
      code?: string
    }
  }
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed === 'true' || trimmed === 'false') return null
  return trimmed
}

export function extractApiErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  const error = err as AnyError
  const body = (error?.data ?? error?.response?.data ?? {}) as Record<string, unknown>
  const code = typeof body.code === 'string' ? body.code : null

  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code]
  }

  const candidates: Array<unknown> = [
    body.error,
    body.message,
    body.statusMessage,
    error?.statusMessage,
    error?.message
  ]

  for (const candidate of candidates) {
    const msg = nonEmptyString(candidate)
    if (msg) return msg
  }

  return fallback
}

export function useApiError() {
  const getBody = (err: unknown) => {
    const error = err as AnyError
    return error?.data ?? error?.response?.data ?? {}
  }

  const getCode = (err: unknown): string | null => {
    const body = getBody(err)
    return typeof body.code === 'string' ? body.code : null
  }

  const getUserMessage = (err: unknown): string => {
    return extractApiErrorMessage(err)
  }

  return { getUserMessage, getCode }
}
