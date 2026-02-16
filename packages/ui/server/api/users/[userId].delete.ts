import { proxyJsonRequest } from '../../utils/proxy-request'

export default defineEventHandler((event) => {
  const userId = getRouterParam(event, 'userId')
  return proxyJsonRequest(event, {
    path: `/api/users/${userId}`,
    method: 'DELETE',
    authMode: 'passthrough',
    authHeaderSource: 'root-key-only',
    authRequiredMessage: 'Root key required'
  })
})
