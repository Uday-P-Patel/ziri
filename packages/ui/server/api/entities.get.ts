import { proxyJsonRequest } from '../utils/proxy-request'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const params = new URLSearchParams()
  if (query.uid) params.set('uid', query.uid as string)
  if (query.includeApiKeys) params.set('includeApiKeys', query.includeApiKeys as string)
  const qs = params.toString()
  const path = qs ? `/api/entities?${qs}` : '/api/entities'
  return proxyJsonRequest(event, { path, authMode: 'bearer' })
})
