// Real-time updates composable using Server-Sent Events (SSE)
// Provides debounced updates for logs, analytics, and dashboard pages

import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useAdminAuth } from './useAdminAuth'

export type EventType = 'audit_log_created' | 'cost_tracked' | 'batch_update'

export interface RealtimeEvent {
  type: EventType
  data: {
    auditLogId?: number
    requestId?: string
    costTrackingId?: number
    timestamp?: string
    decision?: 'permit' | 'forbid'
    provider?: string
    model?: string
    count?: number
    events?: Array<{ type: EventType; data: any }>
  }
  timestamp: string
}

export interface UseRealtimeUpdatesOptions {
  /**
   * Callback when audit log is created
   */
  onAuditLogCreated?: (event: RealtimeEvent) => void
  
  /**
   * Callback when cost is tracked
   */
  onCostTracked?: (event: RealtimeEvent) => void
  
  /**
   * Callback for batch updates
   */
  onBatchUpdate?: (event: RealtimeEvent) => void
  
  /**
   * Debounce delay in milliseconds (default: 500ms)
   */
  debounceMs?: number
  
  /**
   * Whether to pause connection when tab is hidden (default: true)
   */
  pauseWhenHidden?: boolean
}

/**
 * Composable for real-time updates via SSE
 * Automatically handles connection, reconnection, and cleanup
 */
export function useRealtimeUpdates(options: UseRealtimeUpdatesOptions = {}) {
  const { getAuthHeader } = useAdminAuth()
  
  const isConnected = ref(false)
  const isPaused = ref(false)
  const error = ref<string | null>(null)
  
  let eventSource: EventSource | null = null
  let reconnectTimeout: NodeJS.Timeout | null = null
  let debounceTimeout: NodeJS.Timeout | null = null
  let pendingEvents: RealtimeEvent[] = []
  
  const debounceMs = options.debounceMs || 500
  const pauseWhenHidden = options.pauseWhenHidden !== false // Default true
  
  /**
   * Process events with debouncing
   */
  const processEvent = (event: RealtimeEvent) => {
    pendingEvents.push(event)
    
    // Clear existing debounce timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }
    
    // Set new debounce timeout
    debounceTimeout = setTimeout(() => {
      const events = [...pendingEvents]
      pendingEvents = []
      
      // Process events
      for (const evt of events) {
        if (evt.type === 'audit_log_created' && options.onAuditLogCreated) {
          options.onAuditLogCreated(evt)
        } else if (evt.type === 'cost_tracked' && options.onCostTracked) {
          options.onCostTracked(evt)
        } else if (evt.type === 'batch_update' && options.onBatchUpdate) {
          options.onBatchUpdate(evt)
        } else if (evt.type === 'batch_update' && evt.data.events) {
          // Process individual events in batch
          for (const batchEvt of evt.data.events) {
            if (batchEvt.type === 'audit_log_created' && options.onAuditLogCreated) {
              options.onAuditLogCreated({ type: batchEvt.type, data: batchEvt.data, timestamp: evt.timestamp })
            } else if (batchEvt.type === 'cost_tracked' && options.onCostTracked) {
              options.onCostTracked({ type: batchEvt.type, data: batchEvt.data, timestamp: evt.timestamp })
            }
          }
        }
      }
    }, debounceMs)
  }
  
  /**
   * Connect to SSE stream
   */
  const connect = () => {
    if (eventSource) {
      return // Already connected
    }
    
    const authHeader = getAuthHeader()
    if (!authHeader) {
      error.value = 'Not authenticated'
      return
    }
    
    // Extract token from "Bearer <token>" or use as-is if no Bearer prefix
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.replace('Bearer ', '')
      : authHeader
    
    // Build SSE URL with token
    const url = `/api/events?token=${encodeURIComponent(token)}`
    
    try {
      console.log('[REALTIME] Connecting to SSE:', url)
      eventSource = new EventSource(url)
      
      eventSource.onopen = () => {
        isConnected.value = true
        error.value = null
        console.log('[REALTIME] SSE connection established')
      }
      
      eventSource.onmessage = (e) => {
        // Skip comment lines (heartbeat messages)
        if (!e.data || e.data.trim().startsWith(':')) {
          return
        }
        
        try {
          const event: RealtimeEvent = JSON.parse(e.data)
          console.log('[REALTIME] Received event:', event.type, event.data)
          processEvent(event)
        } catch (err: any) {
          console.error('[REALTIME] Error parsing event:', err, 'Data:', e.data)
        }
      }
      
      eventSource.onerror = (err) => {
        const readyState = eventSource?.readyState
        console.error('[REALTIME] SSE error:', err, 'ReadyState:', readyState)
        
        // ReadyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
        if (readyState === EventSource.CLOSED) {
          // Connection was closed - don't try to reconnect immediately
          // This might be intentional (server shutdown, auth failure, etc.)
          console.log('[REALTIME] Connection closed by server')
          isConnected.value = false
          
          if (eventSource) {
            eventSource.close()
            eventSource = null
          }
          
          // Reconnect after 3 seconds (only if not paused)
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout)
          }
          reconnectTimeout = setTimeout(() => {
            if (!isPaused.value) {
              console.log('[REALTIME] Attempting to reconnect after close...')
              connect()
            }
          }, 3000)
        } else if (readyState === EventSource.CONNECTING) {
          // Still connecting - this is normal, don't treat as error
          console.log('[REALTIME] Still connecting, waiting...')
        } else {
          // Connection error but not closed - might recover
          isConnected.value = false
          console.log('[REALTIME] Connection error, will attempt reconnect')
          
          // Don't close immediately - let it try to recover
          // Reconnect after 3 seconds if still not connected
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout)
          }
          reconnectTimeout = setTimeout(() => {
            if (!isPaused.value && (!eventSource || eventSource.readyState !== EventSource.OPEN)) {
              console.log('[REALTIME] Reconnecting after error...')
              if (eventSource) {
                eventSource.close()
                eventSource = null
              }
              connect()
            }
          }, 3000)
        }
      }
    } catch (err: any) {
      console.error('[REALTIME] Failed to create EventSource:', err)
      error.value = err.message || 'Failed to connect'
    }
  }
  
  /**
   * Disconnect from SSE stream
   */
  const disconnect = () => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
      debounceTimeout = null
    }
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    
    isConnected.value = false
    pendingEvents = []
  }
  
  /**
   * Pause connection (when tab is hidden)
   */
  const pause = () => {
    if (isPaused.value) return
    isPaused.value = true
    disconnect()
  }
  
  /**
   * Resume connection (when tab is visible)
   */
  const resume = () => {
    if (!isPaused.value) return
    isPaused.value = false
    connect()
  }
  
  // Handle page visibility (pause/resume)
  if (pauseWhenHidden && typeof document !== 'undefined') {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pause()
      } else {
        resume()
      }
    }
    
    onMounted(() => {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    })
    
    onUnmounted(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
  }
  
  // Connect on mount, disconnect on unmount
  onMounted(() => {
    // Small delay to ensure auth is loaded
    setTimeout(() => {
      if (!isPaused.value) {
        console.log('[REALTIME] Mounting, attempting connection...')
        connect()
      }
    }, 100)
  })
  
  onUnmounted(() => {
    console.log('[REALTIME] Unmounting, disconnecting...')
    disconnect()
  })
  
  return {
    isConnected,
    isPaused,
    error,
    connect,
    disconnect,
    pause,
    resume
  }
}
