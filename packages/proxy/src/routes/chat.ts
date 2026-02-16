import { Router, type Request, type Response } from 'express'
import { extractUserIdFromApiKey } from '../utils/api-key.js'
import * as keyService from '../services/key-service.js'
import { serviceFactory } from '../services/service-factory.js'
import * as llmService from '../services/llm-service.js'
import { auditLogService } from '../services/audit-log-service.js'
import { costTrackingService } from '../services/cost-tracking-service.js'
import { costEstimatorService } from '../services/cost-estimator-service.js'
import { spendResetService } from '../services/spend-reset-service.js'
import { spendReservationService } from '../services/spend-reservation-service.js'
import { queueManagerService } from '../services/queue-manager-service.js'
import { eventEmitterService } from '../services/event-emitter-service.js'
import { enforceUserRateLimit, runLlmPreflight } from './shared/llm-preflight.js'
import {
  buildAuthorizationContext,
  releaseAfterProviderFailure,
  safeCatchReleaseReserved
} from './shared/llm-route-helpers.js'
import { mapChatRouteError } from './shared/llm-error-mapping.js'

const router: Router = Router()

const OPENAI_COMPATIBLE_PROVIDERS = new Set([
  'openai', 'google', 'xai', 'mistral', 'moonshot', 'deepseek', 'dashscope', 'openrouter', 'vertex_ai'
])

function extractUsage(response: any, provider: string): {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cachedTokens: number
} {
  if (provider === 'anthropic') {
    return {
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      cachedTokens: response.usage?.cache_read_input_tokens || 0,
    }
  }
  if (provider === 'vertex_ai' || provider === 'google') {
    const usage = response.usageMetadata || response.usage
    const input = usage?.promptTokenCount ?? usage?.inputTokenCount ?? usage?.prompt_tokens ?? 0
    const output = usage?.candidatesTokenCount ?? usage?.outputTokenCount ?? usage?.completion_tokens ?? 0
    return {
      inputTokens: input,
      outputTokens: output,
      totalTokens: (usage?.totalTokenCount ?? 0) || usage?.total_tokens || input + output,
      cachedTokens: response.usage?.prompt_tokens_details?.cached_tokens ?? 0,
    }
  }
  if (OPENAI_COMPATIBLE_PROVIDERS.has(provider)) {
    return {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      cachedTokens: response.usage?.prompt_tokens_details?.cached_tokens || 0,
    }
  }
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedTokens: 0 }
}

router.post('/completions', async (req: Request, res: Response) => {
  const requestStartTime = Date.now()
  let requestId: string | null = null
  let auditLogId: number | null = null
  let userKeyId: string | null = null
  let slotAcquired = false
  let costReserved = false
  let reservedAmount = 0

  try {
    const preflight = await runLlmPreflight(req, res)
    if (!preflight) return
    requestId = preflight.requestId
    const { apiKey, userId, apiKeyId, allEntities, userKeyEntity } = preflight
    userKeyId = preflight.userKeyId

    const { provider, model, messages, ...otherParams } = req.body
    
    if (!provider || !model || !messages) {
      res.status(400).json({
        error: 'provider, model, and messages are required',
        code: 'MISSING_FIELDS',
        requestId
      })
      return
    }
    const userEntity = await enforceUserRateLimit(res, { userId, apiKeyId, allEntities, requestId })
    if (!userEntity) return
    
    let costEstimate
    try {
      costEstimate = await costEstimatorService.estimateCost(
        provider,
        model,
        messages,
        req.body.max_tokens
      )
    } catch (error: any) {
      costEstimate = {
        estimatedInputTokens: 0,
        estimatedOutputTokens: 0,
        estimatedCost: 0,
        confidence: 'low' as const
      }
    }
    
    try {
      await queueManagerService.acquireSlot(
        userKeyId,
        requestId,
        {
          requestId,
          userKeyId,
          authId: userId,
          apiKeyId,
          provider,
          model,
          requestBody: req.body,
          estimatedCost: costEstimate.estimatedCost,
        }
      )
    } catch (error: any) {
      if (error.message.includes('Queue full')) {
        return res.status(503).json({
          error: 'Server busy - queue full',
          code: 'QUEUE_FULL',
          requestId,
        })
      }
      throw error
    }
    
    slotAcquired = true
    
    const spendResetResult = await spendResetService.checkAndResetSpend(userKeyEntity as any)
    const activeEntity = spendResetResult.updatedEntity || userKeyEntity
    
    const reservation = await spendReservationService.reserveEstimatedSpend(
      activeEntity as any,
      userKeyId,
      costEstimate.estimatedCost
    )
    costReserved = true
    reservedAmount = costEstimate.estimatedCost
    
    const principal = `UserKey::"${userKeyId}"`
    const action = 'Action::"completion"'
    const resource = `Resource::"${model}"`
    
    const { now, ipAddress, context } = buildAuthorizationContext(req, {
      model,
      provider,
      isEmergency: otherParams.isEmergency || false
    })
    
    const authStartTime = Date.now()
    const authService = serviceFactory.getAuthorizationService()
    const authResult = await authService.authorize({
      principal,
      action,
      resource,
      context
    })
    const authEndTime = Date.now()
    const authDurationMs = authEndTime - authStartTime
    
    const decisionReason = authResult.diagnostics?.reason?.[0] || authResult.diagnostics?.errors?.[0] || undefined
    const policiesEvaluated = authResult.diagnostics?.reason || []
    const determiningPolicies = authResult.decision === 'Allow' ? policiesEvaluated : []
    
    auditLogId = await auditLogService.log({
      requestId,
      principal,
      principalType: 'UserKey',
      authId: userId,
      apiKeyId,
      action: 'completion',
      resource,
      provider,
      model,
      decision: authResult.decision === 'Allow' ? 'permit' : 'forbid',
      decisionReason,
      policiesEvaluated: policiesEvaluated as string[],
      determiningPolicies: determiningPolicies as string[],
      requestIp: ipAddress,
      userAgent: req.headers['user-agent'],
      requestMethod: req.method,
      requestPath: req.path,
      requestBodyHash: auditLogService.hashRequestBody(req.body),
      cedarContext: context,
      entitySnapshot: activeEntity.attrs,
      requestTimestamp: now.toISOString(),
      authStartTime: new Date(authStartTime).toISOString(),
      authEndTime: new Date(authEndTime).toISOString(),
      authDurationMs,
    })

    eventEmitterService.emitEvent('audit_log_created', {
      auditLogId,
      requestId,
      timestamp: new Date().toISOString(),
      decision: authResult.decision === 'Allow' ? 'permit' : 'forbid',
      provider,
      model
    })
    
    if (authResult.decision !== 'Allow') {
      if (slotAcquired) {
        queueManagerService.releaseSlot(userKeyId, requestId)
        slotAcquired = false
      }
      res.status(403).json({
        error: `Authorization denied: ${decisionReason || 'Authorization denied'}`,
        code: 'AUTHORIZATION_DENIED',
        reason: decisionReason,
        requestId
      })
      return
    }
    
    const llmRequestStartTime = Date.now()
    let llmResponse: any
    try {
      llmResponse = await llmService.chatCompletions({
        provider,
        model,
        messages,
        ...otherParams
      })
    } catch (llmError: any) {
      const cleanup = await releaseAfterProviderFailure({
        costReserved,
        userKeyId,
        reservedAmount,
        slotAcquired,
        requestId,
        spendReservationService,
        queueManagerService
      })
      costReserved = cleanup.costReserved
      slotAcquired = cleanup.slotAcquired
      throw llmError
    }
    const llmResponseTime = Date.now()
    
    const usage = extractUsage(llmResponse, provider)
    
    const costTrackingId = await costTrackingService.trackCost({
      requestId,
      executionKey: apiKeyId,
      auditLogId,
      provider,
      providerRequestId: llmResponse.id,
      modelRequested: model,
      modelUsed: llmResponse.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      cachedTokens: usage.cachedTokens,
      requestTimestamp: new Date(llmRequestStartTime).toISOString(),
      responseTimestamp: new Date(llmResponseTime).toISOString(),
      latencyMs: llmResponseTime - llmRequestStartTime,
      status: 'completed',
    })

    eventEmitterService.emitEvent('cost_tracked', {
      costTrackingId,
      requestId,
      timestamp: new Date().toISOString(),
      provider,
      model: llmResponse.model || model
    })
    
    await auditLogService.updateWithProviderResponse(requestId, llmResponse.id, costTrackingId)
    
    const { pricingService } = await import('../services/pricing-service.js')
    const costCalc = await pricingService.calculateCost(
      provider,
      llmResponse.model || model,
      usage.inputTokens,
      usage.outputTokens,
      usage.cachedTokens
    )
    
    if (slotAcquired) {
      queueManagerService.releaseSlot(userKeyId, requestId)
      slotAcquired = false
    }
    
    res.json({
      ...llmResponse,
      _meta: {
        requestId,
        cost: {
          estimated: costEstimate?.estimatedCost || 0,
          actual: costCalc.totalCost,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cachedTokens: usage.cachedTokens,
          totalCost: costCalc.totalCost,
          estimation: costEstimate ? {
            estimatedInputTokens: costEstimate.estimatedInputTokens,
            estimatedOutputTokens: costEstimate.estimatedOutputTokens,
            confidence: costEstimate.confidence,
          } : undefined,
        },
        timing: {
          totalMs: Date.now() - requestStartTime,
          authMs: authDurationMs,
          llmMs: llmResponseTime - llmRequestStartTime,
        },
      },
    })
  } catch (error: any) {
    await safeCatchReleaseReserved({
      requestId,
      userKeyId,
      costReserved,
      reservedAmount,
      spendReservationService
    })
    if (requestId && slotAcquired) {
      try {
        const uid = userKeyId || await keyService.getUserKeyIdForUser(extractUserIdFromApiKey(req.headers['x-api-key'] as string) || '')
        if (uid) {
          queueManagerService.releaseSlot(uid, requestId)
        }
      } catch {
      }
    }
    
    console.error('[CHAT] Completion error:', error)
    
    if (requestId && auditLogId) {
      try {
        await auditLogService.updateWithProviderResponse(requestId, '', 0)
      } catch (e) {
 
      }
    }
    
    const mappedError = mapChatRouteError(error.message)
    if (mappedError) {
      res.status(mappedError.status).json({
        error: error.message,
        code: mappedError.code,
        requestId: requestId || undefined
      })
      return
    }
    
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: requestId || undefined
    })
  }
})

export default router
