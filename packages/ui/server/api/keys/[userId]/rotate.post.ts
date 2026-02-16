import { proxyJsonRequest } from '../../../utils/proxy-request'

export default defineEventHandler((event) => {
  const userId = getRouterParam(event, 'userId')
  return proxyJsonRequest(event, {
    path: `/api/keys/${encodeURIComponent(userId!)}/rotate`,
    method: 'POST',
    authMode: 'passthrough'
  })
})
