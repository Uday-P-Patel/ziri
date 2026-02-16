import { proxyJsonRequest } from '../../../utils/proxy-request'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  const data = await proxyJsonRequest(event, {
    path: `/api/providers/${name}/test`,
    method: 'POST',
    authMode: 'passthrough'
  }) as { success?: boolean; message?: string; models?: unknown }
  return {
    data: {
      status: data.success ? 'success' : 'failed',
      message: data.message,
      models: data.models
    }
  }
})
