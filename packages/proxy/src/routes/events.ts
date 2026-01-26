// Server-Sent Events (SSE) route for real-time updates
// Supports analytics, logs, and dashboard pages

import { Router, type Request, type Response } from 'express'
import { verifyAccessToken } from '../utils/jwt.js'
import { eventEmitterService, type EventData } from '../services/event-emitter-service.js'

const router: Router = Router()

/**
 * Middleware to authenticate SSE connections
 * SSE doesn't support custom headers, so we accept token in query parameter
 * Also checks Authorization header for compatibility
 */
function authenticateSSE(
  req: Request,
  res: Response,
  next: () => void
): void {
  // Try Authorization header first (for compatibility)
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const payload = verifyAccessToken(token)
      if (payload.role === 'admin') {
        // Attach admin info to request
        (req as any).admin = {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          name: payload.name
        }
        next()
        return
      }
    } catch (error) {
      // Token invalid, try query parameter
    }
  }

  // Try token in query parameter (for SSE EventSource)
  const token = req.query.token as string
  if (token) {
    try {
      const payload = verifyAccessToken(token)
      if (payload.role === 'admin') {
        (req as any).admin = {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          name: payload.name
        }
        next()
        return
      }
    } catch (error) {
      // Token invalid
    }
  }

  // No valid authentication
  res.status(401).json({
    error: 'Admin authentication required',
    code: 'ADMIN_AUTH_REQUIRED'
  })
}

/**
 * GET /api/events
 * Server-Sent Events endpoint for real-time updates
 * 
 * Query parameters:
 * - token: JWT access token (required if no Authorization header)
 * 
 * Events sent:
 * - audit_log_created: New audit log entry
 * - cost_tracked: New cost tracked
 * - batch_update: Multiple events batched together
 */
router.get('/', authenticateSSE, (req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering

  // Send initial connection message
  res.write(`: SSE connection established\n\n`)

  // Event handler to send events to this client
  const sendEvent = (event: EventData) => {
    try {
      const data = JSON.stringify(event)
      res.write(`data: ${data}\n\n`)
      console.log(`[EVENTS] Sent event to client: ${event.type}`)
    } catch (error) {
      console.error('[EVENTS] Error sending event:', error)
    }
  }

  // Listen for events
  eventEmitterService.on('event', sendEvent)
  
  // Send any buffered events immediately when client connects
  // The event emitter will flush its buffer if there are listeners
  const listenerCount = eventEmitterService.listenerCount('event')
  console.log(`[EVENTS] Client connected, total listeners: ${listenerCount}`)
  
  // Trigger a flush to send any buffered events to this new client
  // This ensures any events that were buffered while no clients were connected
  // will be sent immediately to this newly connected client
  eventEmitterService.flush()

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`)
    } catch (error) {
      // Client disconnected
      clearInterval(heartbeatInterval)
      eventEmitterService.removeListener('event', sendEvent)
    }
  }, 30000)

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval)
    eventEmitterService.removeListener('event', sendEvent)
    console.log('[EVENTS] Client disconnected from SSE stream')
  })

  console.log('[EVENTS] Client connected to SSE stream')
})

export default router
