import { proxyJsonRequest } from '../utils/proxy-request'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return proxyJsonRequest(event, {
    path: '/api/keys',
    method: 'POST',
    body,
    authMode: 'passthrough'
  })
})
