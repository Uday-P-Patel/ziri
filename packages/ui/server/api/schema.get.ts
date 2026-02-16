import { proxyJsonRequest } from '../utils/proxy-request'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const format = query.format as string | undefined
  const path = format ? `/api/schema?format=${encodeURIComponent(format)}` : '/api/schema'
  const data = await proxyJsonRequest(event, { path, authMode: 'bearer' }) as { data?: unknown }
  return { data: data.data }
})
