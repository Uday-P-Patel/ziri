import { proxyJsonRequest } from '../utils/proxy-request'

export default defineEventHandler(async (event) => {
  const data = await proxyJsonRequest(event, {
    path: '/api/providers',
    authMode: 'passthrough'
  }) as { providers?: unknown[] }
  return { data: data.providers || [] }
})
