import { proxyJsonRequest } from '../../utils/proxy-request'

export default defineEventHandler((event) => {
  const name = getRouterParam(event, 'name')
  return proxyJsonRequest(event, {
    path: `/api/providers/${name}`,
    method: 'DELETE',
    authMode: 'passthrough'
  })
})
