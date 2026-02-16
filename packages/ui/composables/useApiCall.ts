type UseApiCallOptions = {
  setLoading: (value: boolean) => void
  getAuthHeader: () => string | null
  setError?: (value: string | null) => void
  clearErrorOnStart?: boolean
  authErrorMessage?: string
  onError?: (error: any) => void
}

export async function runWithAuth<T>(
  opts: UseApiCallOptions,
  run: (authHeader: string) => Promise<T>
): Promise<T> {
  opts.setLoading(true)
  if (opts.clearErrorOnStart && opts.setError) {
    opts.setError(null)
  }

  try {
    const authHeader = opts.getAuthHeader()
    if (!authHeader) {
      throw new Error(opts.authErrorMessage || 'Please login first')
    }
    return await run(authHeader)
  } catch (error: any) {
    if (opts.setError) {
      opts.setError(error?.message || null)
    }
    if (opts.onError) {
      opts.onError(error)
    }
    throw error
  } finally {
    opts.setLoading(false)
  }
}
