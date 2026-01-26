// Event emitter service for real-time updates via SSE
// Buffers and batches events to prevent overload

import { EventEmitter } from 'events'

export type EventType = 'audit_log_created' | 'cost_tracked' | 'batch_update'

export interface EventData {
  type: EventType
  data: {
    auditLogId?: number
    requestId?: string
    costTrackingId?: number
    timestamp?: string
    decision?: 'permit' | 'forbid'
    provider?: string
    model?: string
    // For batch updates
    count?: number
    events?: Array<{ type: EventType; data: any }>
  }
  timestamp: string
}

/**
 * Event emitter service that buffers events and sends batched updates
 * Prevents server overload when many requests come in quickly
 */
export class EventEmitterService extends EventEmitter {
  private eventBuffer: EventData[] = []
  private batchInterval: NodeJS.Timeout | null = null
  private readonly BATCH_INTERVAL_MS = 2000 // 2 seconds
  private readonly MAX_BUFFER_SIZE = 1000 // Prevent memory issues

  constructor() {
    super()
    this.startBatching()
  }

  /**
   * Start the batching interval
   */
  private startBatching(): void {
    if (this.batchInterval) {
      return
    }

    this.batchInterval = setInterval(() => {
      this.flushBuffer()
    }, this.BATCH_INTERVAL_MS)
  }

  /**
   * Stop the batching interval
   */
  private stopBatching(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval)
      this.batchInterval = null
    }
  }

  /**
   * Emit an event (buffered, will be sent in next batch)
   */
  emitEvent(type: EventType, data: EventData['data']): void {
    const event: EventData = {
      type,
      data: {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    }

    console.log(`[EVENT_EMITTER] Event emitted: ${type}`, JSON.stringify(event.data))
    
    // Add to buffer
    this.eventBuffer.push(event)

    // Prevent buffer overflow
    if (this.eventBuffer.length > this.MAX_BUFFER_SIZE) {
      console.warn(`[EVENT_EMITTER] Buffer overflow, dropping oldest events. Current size: ${this.eventBuffer.length}`)
      // Keep only the most recent events
      this.eventBuffer = this.eventBuffer.slice(-this.MAX_BUFFER_SIZE)
    }

    // If buffer is getting large, flush early
    if (this.eventBuffer.length >= 100) {
      this.flushBuffer()
    }
  }

  /**
   * Flush buffered events as a batch
   */
  private flushBuffer(): void {
    if (this.eventBuffer.length === 0) {
      return
    }

    const listenerCount = this.listenerCount('event')
    console.log(`[EVENT_EMITTER] Flushing ${this.eventBuffer.length} event(s) to ${listenerCount} listener(s)`)

    // If no listeners, keep events in buffer (they'll be sent when a client connects)
    if (listenerCount === 0) {
      console.log(`[EVENT_EMITTER] No listeners, keeping ${this.eventBuffer.length} event(s) in buffer`)
      return
    }

    const events = [...this.eventBuffer]
    this.eventBuffer = []

    if (events.length === 1) {
      // Single event - send as-is
      this.emit('event', events[0])
      console.log(`[EVENT_EMITTER] Sent single event: ${events[0].type}`)
    } else {
      // Multiple events - send as batch
      const batchEvent: EventData = {
        type: 'batch_update',
        data: {
          count: events.length,
          events: events.map(e => ({ type: e.type, data: e.data }))
        },
        timestamp: new Date().toISOString()
      }
      this.emit('event', batchEvent)
      console.log(`[EVENT_EMITTER] Sent batch event with ${events.length} events`)
    }
  }

  /**
   * Force flush buffer immediately (for testing or shutdown)
   * Also called when a new client connects to send buffered events
   */
  flush(): void {
    this.flushBuffer()
  }
  
  /**
   * Get current buffer size (for debugging)
   */
  getBufferSize(): number {
    return this.eventBuffer.length
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    this.flushBuffer() // Send any remaining events
    this.stopBatching()
    this.removeAllListeners()
  }
}

// Export singleton instance
export const eventEmitterService = new EventEmitterService()
