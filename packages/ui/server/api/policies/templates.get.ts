import { proxyJsonRequest } from '../../utils/proxy-request'

export default defineEventHandler((event) =>
  proxyJsonRequest(event, {
    path: '/api/policies/templates',
    authMode: 'bearer'
  })
)
