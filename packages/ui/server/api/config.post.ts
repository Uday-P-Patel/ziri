import { proxyJsonRequest } from '../utils/proxy-request'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return proxyJsonRequest(event, {
    path: '/api/config',
    method: 'POST',
    body,
    authMode: 'bearer'
  })
})
