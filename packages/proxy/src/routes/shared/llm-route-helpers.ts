import type { Request } from 'express'
import { toIp } from '../../utils/cedar.js'

type SpendReservationLike = {
  releaseReservedSpend: (userKeyId: string, amount: number) => Promise<void>
}

type QueueManagerLike = {
  releaseSlot: (userKeyId: string, requestId: string) => void
}

export function buildAuthorizationContext(
  req: Request,
  params: {
    model: string
    provider: string
    isEmergency: boolean
  }
) {
  const now = new Date()
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getUTCDay()]
  const hour = now.getUTCHours()
  const ipAddress = req.ip || '127.0.0.1'
  const context = {
    day_of_week: dayOfWeek,
    hour,
    ip_address: toIp(ipAddress),
    is_emergency: params.isEmergency,
    model_name: params.model,
    model_provider: params.provider,
    request_time: now.toISOString()
  }
  return { now, ipAddress, context }
}

export async function releaseAfterProviderFailure(params: {
  costReserved: boolean
  userKeyId: string | null
  reservedAmount: number
  slotAcquired: boolean
  requestId: string | null
  spendReservationService: SpendReservationLike
  queueManagerService: QueueManagerLike
}): Promise<{ costReserved: boolean; slotAcquired: boolean }> {
  let costReserved = params.costReserved
  let slotAcquired = params.slotAcquired

  if (costReserved && params.userKeyId) {
    await params.spendReservationService.releaseReservedSpend(params.userKeyId, params.reservedAmount)
    costReserved = false
  }
  if (slotAcquired) {
    params.queueManagerService.releaseSlot(params.userKeyId as string, params.requestId as string)
    slotAcquired = false
  }

  return { costReserved, slotAcquired }
}

export async function safeCatchReleaseReserved(params: {
  requestId: string | null
  userKeyId: string | null
  costReserved: boolean
  reservedAmount: number
  spendReservationService: SpendReservationLike
}): Promise<void> {
  if (params.requestId && params.userKeyId && params.costReserved) {
    try {
      await params.spendReservationService.releaseReservedSpend(params.userKeyId, params.reservedAmount)
    } catch {
    }
  }
}

export function safeCatchReleaseQueue(params: {
  requestId: string | null
  userKeyId: string | null
  slotAcquired: boolean
  queueManagerService: QueueManagerLike
}): void {
  if (params.requestId && params.slotAcquired && params.userKeyId) {
    try {
      params.queueManagerService.releaseSlot(params.userKeyId, params.requestId)
    } catch {
    }
  }
}
